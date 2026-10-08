"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, Check, Minus, Heart, ThumbsDown } from "lucide-react"
import type { ScoreDebug, Song } from "@/lib/types"
import { API_URL } from "@/lib/api"
import { getReasons, type ReasonContext } from "@/lib/reasons"
import { Pill } from "@/components/ui/panel"

// ─── Artwork ──────────────────────────────────────────────────────────────────
// Module-level cache so refresh / re-render doesn't refetch art we already have.
// `null` = we asked and there is none.
const artCache = new Map<string, string | null>()

// The backend's art endpoint opens a new HTTPS client per call, which briefly
// blocks the server. Firing ten at once delays every other request (filters,
// feed) by several seconds, so art loads at most two at a time, and only for
// cards near the viewport.
const ART_CONCURRENCY = 2
let artActive = 0
const artQueue: (() => void)[] = []

function runArtQueue() {
  while (artActive < ART_CONCURRENCY && artQueue.length > 0) {
    const job = artQueue.shift()!
    artActive++
    job()
  }
}

function fetchArt(trackId: string, signal: AbortSignal): Promise<string | null> {
  return new Promise((resolve) => {
    const job = () => {
      if (signal.aborted) { artActive--; runArtQueue(); resolve(null); return }
      fetch(`${API_URL}/spotify/art/${encodeURIComponent(trackId)}`, { signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const u = typeof data?.url === "string" ? data.url : null
          artCache.set(trackId, u)
          resolve(u)
        })
        .catch(() => resolve(null))
        .finally(() => { artActive--; runArtQueue() })
    }
    artQueue.push(job)
    runArtQueue()
  })
}

const FALLBACK_GRADIENTS: [string, string][] = [
  ["#7A3030", "#672626"],
  ["#C98787", "#7A3030"],
  ["#A67570", "#6F2929"],
  ["#9C4B4B", "#5A2020"],
]

function Artwork({ trackId, artist, size }: { trackId: string; artist: string; size: "lg" | "md" }) {
  const [url, setUrl] = useState<string | null>(() => artCache.get(trackId) ?? null)
  const [broken, setBroken] = useState(false)
  const [near, setNear] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  // Only start loading once the card is close to the viewport
  useEffect(() => {
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() }
    }, { rootMargin: "300px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    setBroken(false)
    if (artCache.has(trackId)) {
      setUrl(artCache.get(trackId) ?? null)
      return
    }
    setUrl(null)
    if (!near) return
    const controller = new AbortController()
    fetchArt(trackId, controller.signal).then((u) => { if (!controller.signal.aborted) setUrl(u) })
    return () => controller.abort()
  }, [trackId, near])

  const box = size === "lg"
    ? "h-[112px] w-[112px] desk:h-[168px] desk:w-[168px] rounded-[16px] text-[40px]"
    : "h-[64px] w-[64px] tablet:h-[72px] tablet:w-[72px] rounded-[12px] text-[24px]"

  if (url && !broken) {
    return (
      <div ref={boxRef} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" onError={() => setBroken(true)} className={`${box} block object-cover`} />
      </div>
    )
  }
  const initial = (artist || "?").trim().charAt(0).toUpperCase() || "?"
  const [a, b] = FALLBACK_GRADIENTS[initial.charCodeAt(0) % FALLBACK_GRADIENTS.length]
  return (
    <div
      ref={boxRef}
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center font-[800] text-jj-paper`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {initial}
    </div>
  )
}

// ─── Score breakdown ──────────────────────────────────────────────────────────
const pct = (v: number) => `${Math.round(v * 100)}%`
const pen = (v: number) => `−${Math.abs(v).toFixed(2)}`

function ScoreBreakdown({ debug, score }: { debug?: ScoreDebug; score: number }) {
  if (!debug) {
    return (
      <p className="text-[14px] text-jj-muted">
        No detailed breakdown for this song. It was ranked by popularity because there wasn&apos;t enough taste data yet.
      </p>
    )
  }
  const rows: { label: string; value: string; negative?: boolean }[] = [
    { label: "Text match", value: pct(debug.tfidf) },
  ]
  if (typeof debug.activity === "number") rows.push({ label: "Activity fit", value: pct(debug.activity) })
  rows.push({ label: "Popularity", value: pct(debug.popularity) })
  if (debug.skip_penalty < 0)    rows.push({ label: "Skipped before",   value: pen(debug.skip_penalty),    negative: true })
  if (debug.novelty_penalty < 0) rows.push({ label: "Played a lot lately", value: pen(debug.novelty_penalty), negative: true })
  if (debug.artist_penalty < 0)  rows.push({ label: "Artist variety",   value: pen(debug.artist_penalty),  negative: true })
  if (debug.genre_penalty < 0)   rows.push({ label: "Genre variety",    value: pen(debug.genre_penalty),   negative: true })

  return (
    <div className="flex max-w-[360px] flex-col gap-[6px] text-[14px]">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-[16px]">
          <span className="text-jj-muted">{r.label}</span>
          <span className={`tabular-nums font-[600] ${r.negative ? "text-jj-accent" : "text-jj-text"}`}>{r.value}</span>
        </div>
      ))}
      <div className="mt-[2px] flex justify-between gap-[16px] border-t border-jj-border pt-[6px]">
        <span className="font-[700] text-jj-text">Final score</span>
        <span className="tabular-nums font-[700] text-jj-text">{Number.isFinite(score) ? score.toFixed(3) : "–"}</span>
      </div>
      <p className="text-[12px] text-jj-muted">
        Text match compares the song&apos;s genre, mood and energy tags with your request, taste profile and time of day.
      </p>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
const known = (v: unknown): v is string => typeof v === "string" && v.trim() !== "" && v.toLowerCase() !== "unknown"
const pretty = (v: string) => v.replace(/-/g, " ")

interface Props {
  song: Song
  rank: number
  variant?: "featured" | "row"
  context: ReasonContext
  liked?: boolean
  leaving?: boolean
  onLike?: () => void
  onSkip?: () => void
}

function FeedbackButtons({ liked, onLike, onSkip, disabled }: { liked: boolean; onLike?: () => void; onSkip?: () => void; disabled: boolean }) {
  if (!onLike && !onSkip) return null
  const base = "inline-flex items-center gap-[6px] rounded-full border px-[12px] py-[4px] text-[14px] font-[600] transition-colors disabled:cursor-default"
  return (
    <div className="flex items-center gap-[8px]">
      {onLike && (
        <button
          type="button"
          onClick={onLike}
          disabled={disabled}
          aria-pressed={liked}
          aria-label={liked ? "Liked" : "Like"}
          className={`${base} ${liked
            ? "border-jj-primary bg-jj-primary text-jj-paper"
            : "border-jj-border bg-jj-paper text-jj-text hover:border-jj-primary"}`}
        >
          <Heart className="h-[14px] w-[14px]" fill={liked ? "currentColor" : "none"} strokeWidth={2.5} />
          {liked ? "Liked" : "Like"}
        </button>
      )}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          aria-label="Skip"
          className={`${base} border-jj-border bg-jj-paper text-jj-muted hover:border-jj-accent hover:text-jj-text`}
        >
          <ThumbsDown className="h-[14px] w-[14px]" strokeWidth={2.5} />
          Skip
        </button>
      )}
    </div>
  )
}

export default function SongCard({ song, rank, variant = "row", context, liked = false, leaving = false, onLike, onSkip }: Props) {
  const [whyOpen, setWhyOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const featured = variant === "featured"

  const title  = known(song.title)  ? song.title  : "Untitled track"
  const artist = known(song.artist) ? song.artist : "Unknown artist"
  const reasons = whyOpen ? getReasons(song, context) : []
  const popularity = typeof song.popularity === "number" ? song.popularity : null
  // Granular genre pill only when it adds something (e.g. genre "chill" next to mood "chill" would repeat)
  const showGenre = known(song.genre)
    && song.genre.toLowerCase() !== String(song.main_genre ?? "").toLowerCase()
    && song.genre.toLowerCase() !== String(song.mood ?? "").toLowerCase()

  return (
    <article
      data-song-card
      data-title={title}
      aria-hidden={leaving || undefined}
      className={`${featured
        ? "min-w-[0px]"
        : "min-w-[0px] rounded-[16px] border border-jj-border bg-jj-paper p-[16px] transition-colors hover:border-jj-accent tablet:p-[20px]"} ${leaving ? "jj-slide-out pointer-events-none" : ""}`}
    >
      <div className={`flex gap-[16px] ${featured ? "flex-col tablet:flex-row tablet:gap-[24px]" : ""}`}>
        <Artwork trackId={song.track_id} artist={artist} size={featured ? "lg" : "md"} />

        <div className="min-w-[0px] flex-1">
          <div className="flex items-start justify-between gap-[12px]">
            <div className="min-w-[0px]">
              <h3 className={`truncate font-[800] text-jj-text ${featured ? "text-[28px] desk:text-[32px]" : "text-[20px]"}`}>{title}</h3>
              <p className={`truncate text-jj-muted ${featured ? "text-[20px]" : "text-[16px]"}`}>{artist}</p>
            </div>
            <span className="shrink-0 rounded-[6px] bg-jj-cream px-[8px] py-[2px] text-[14px] font-[700] text-jj-primary">#{rank}</span>
          </div>

          <div className="mt-[12px] flex flex-wrap gap-[8px]">
            {known(song.main_genre) && <Pill>{pretty(song.main_genre)}</Pill>}
            {showGenre && <Pill>{pretty(song.genre)}</Pill>}
            {known(song.mood) && <Pill>{song.mood}</Pill>}
            {known(song.energy_label) && <Pill>{song.energy_label} energy</Pill>}
          </div>

          <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[12px]">
          <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[4px] text-[14px] text-jj-muted">
            {popularity !== null && <span>Popularity {popularity}/100</span>}
            <a
              href={`https://open.spotify.com/track/${encodeURIComponent(song.track_id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[4px] font-[600] text-jj-primary underline-offset-[3px] hover:underline"
            >
              Open in Spotify <ExternalLink className="h-[14px] w-[14px]" />
            </a>
          </div>
          <FeedbackButtons liked={liked} onLike={onLike} onSkip={onSkip} disabled={leaving} />
          </div>

          <button
            type="button"
            onClick={() => setWhyOpen((o) => !o)}
            aria-expanded={whyOpen}
            className="mt-[12px] inline-flex items-center gap-[4px] text-[16px] font-[700] text-jj-primary hover:underline"
          >
            Why this song?
            <ChevronDown className={`h-[16px] w-[16px] transition-transform ${whyOpen ? "rotate-180" : ""}`} />
          </button>

          {whyOpen && (
            <div className="mt-[8px] rounded-[12px] border border-jj-border bg-jj-cream/50 p-[12px] tablet:p-[16px]">
              <ul data-reasons className="flex flex-col gap-[6px] text-[15px]">
                {reasons.map((r) => (
                  <li key={r.text} className={`flex items-start gap-[8px] ${r.positive ? "text-jj-text" : "text-jj-muted"}`}>
                    {r.positive
                      ? <Check className="mt-[3px] h-[16px] w-[16px] shrink-0 text-jj-primary" strokeWidth={3} />
                      : <Minus className="mt-[3px] h-[16px] w-[16px] shrink-0 text-jj-accent" strokeWidth={3} />}
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setScoreOpen((o) => !o)}
                aria-expanded={scoreOpen}
                className="mt-[12px] inline-flex items-center gap-[4px] text-[14px] font-[600] text-jj-muted hover:text-jj-primary"
              >
                <ChevronRight className={`h-[14px] w-[14px] transition-transform ${scoreOpen ? "rotate-90" : ""}`} />
                Score breakdown
              </button>
              {scoreOpen && (
                <div className="mt-[8px]">
                  <ScoreBreakdown debug={song.score_debug} score={song.score} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {featured && (
        <iframe
          src={`https://open.spotify.com/embed/track/${encodeURIComponent(song.track_id)}?utm_source=generator`}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="mt-[20px] block w-full rounded-[12px] border-0"
          title={`Spotify player for ${title}`}
        />
      )}
    </article>
  )
}
