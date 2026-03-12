"use client"

import { useState, useEffect } from "react"
import type { Song } from "@/lib/types"

const ART_GRADIENTS = [
  ["#9C4B4B", "#6A2C2C"],
  ["#3B5998", "#1E3A5F"],
  ["#2D6A4F", "#1B4332"],
  ["#7B5EA7", "#4A3270"],
  ["#C4862B", "#8A5A1A"],
  ["#2A7F8E", "#1A5260"],
  ["#A44C6D", "#6E2D47"],
  ["#5B7C4A", "#3A5230"],
]

function artistGradient(name: string): string[] {
  return ART_GRADIENTS[name.charCodeAt(0) % ART_GRADIENTS.length]
}

const MOOD_PILL: Record<string, string> = {
  happy: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hype: "bg-orange-100 text-orange-700 border-orange-200",
  chill: "bg-sky-100 text-sky-800 border-sky-200",
  sad: "bg-indigo-100 text-indigo-700 border-indigo-200",
  focus: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

const ENERGY_VAL: Record<string, number> = {
  calm: 0.25,
  medium: 0.6,
  energetic: 0.88,
}

const MOOD_FEATURES: Record<string, { valence: number; danceability: number; acousticness: number }> = {
  happy: { valence: 0.78, danceability: 0.72, acousticness: 0.28 },
  hype: { valence: 0.65, danceability: 0.85, acousticness: 0.1 },
  chill: { valence: 0.55, danceability: 0.45, acousticness: 0.62 },
  focus: { valence: 0.4, danceability: 0.38, acousticness: 0.55 },
  sad: { valence: 0.22, danceability: 0.3, acousticness: 0.6 },
}

function ScoreRow({ label, value, positive }: { label: string; value: number; positive: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-jukeDark/60">{label}</span>
      <span className={`font-semibold tabular-nums ${positive ? "text-jukeDark" : "text-red-400"}`}>
        {positive ? "+" : ""}{value.toFixed(4)}
      </span>
    </div>
  )
}

function FeatureBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)

  return (
    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-[14px]">
      <span className="text-jukeDark/55 text-[14px] font-medium">
        {label}
      </span>

      <div className="h-[8px] bg-jukeDark/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-jukeRed rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="text-jukeDark/60 text-[13px] tabular-nums text-right">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

interface Props {
  song: Song
  rank: number
  expanded: boolean
  onToggle: () => void
}

export default function SongCard({ song, rank, expanded, onToggle }: Props) {
  const [colors] = useState(() => artistGradient(song.artist))
  const [artUrl, setArtUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`http://localhost:8000/spotify/art/${song.track_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.url) setArtUrl(data.url) })
      .catch(() => {})
  }, [song.track_id])
  const moodPill = MOOD_PILL[song.mood] ?? "bg-gray-100 text-gray-700 border-gray-200"
  const energyVal = ENERGY_VAL[song.energy_label] ?? 0.5
  const moodFeat = MOOD_FEATURES[song.mood] ?? MOOD_FEATURES.focus
  const popularity = song.popularity / 100

  return (
    <div
      onClick={onToggle}
      className={`
        bg-white
        rounded-[24px]
        transition-all duration-300
        overflow-hidden
        border border-jukeDark/10
        cursor-pointer
        ${expanded
          ? "shadow-xl ring-1 ring-jukeRed/20"
          : "shadow-md hover:shadow-xl hover:-translate-y-[2px]"}
      `}
    >
      {/* Main Row */}
      <div className="flex items-center gap-[24px] px-[28px] py-[22px]">

        <span className="text-jukeDark/15 font-bold text-[20px] w-[28px] text-right select-none">
          {rank}
        </span>

        {artUrl ? (
          <img
            src={artUrl}
            alt={song.title}
            className="w-[84px] h-[84px] rounded-[18px] object-cover shadow-sm flex-shrink-0"
          />
        ) : (
          <div
            className="w-[84px] h-[84px] rounded-[18px] flex items-center justify-center text-white text-[30px] font-black shadow-sm flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
          >
            {song.artist[0]?.toUpperCase() ?? "?"}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-bold text-jukeDark text-[20px] truncate">
            {song.title}
          </p>
          <p className="text-jukeDark/50 text-[15px] mt-[2px] truncate">
            {song.artist}
          </p>

          <div className="flex gap-[8px] mt-[10px] flex-wrap">
            <span className="text-[12px] bg-jukeCream border border-jukeDark/15 text-jukeDark px-[10px] py-[4px] rounded-full font-semibold capitalize">
              {song.main_genre}
            </span>
            <span className={`text-[12px] border px-[10px] py-[4px] rounded-full font-semibold capitalize ${moodPill}`}>
              {song.mood}
            </span>
            <span className="text-[12px] bg-jukeCream/60 border border-jukeDark/10 text-jukeDark/60 px-[10px] py-[4px] rounded-full font-semibold capitalize">
              {song.energy_label}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-[4px]">
          <span className="text-jukeDark font-bold text-[26px] tabular-nums">
            {(song.score * 100).toFixed(0)}
            <span className="text-jukeDark/30 text-[14px] font-normal">%</span>
          </span>
          <span className="text-jukeDark/30 text-[12px]">
            {expanded ? "▲ less" : "▼ details"}
          </span>
        </div>

      </div>

      {/* Expanded Section */}
      {expanded && (
        <div
          className="px-[28px] pb-[24px] pt-[6px] border-t border-jukeDark/8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-[40px]">

            <div>
              <p className="text-jukeDark/70 font-bold text-[12px] mb-[14px] tracking-[1px] uppercase">
                Audio Features
              </p>

              <div className="flex flex-col gap-[12px]">
                <FeatureBar label="Energy" value={energyVal} />
                <FeatureBar label="Danceability" value={moodFeat.danceability} />
                <FeatureBar label="Positiveness" value={moodFeat.valence} />
                <FeatureBar label="Acousticness" value={moodFeat.acousticness} />
                <FeatureBar label="Popularity" value={popularity} />
              </div>
            </div>

            <div>
              <p className="text-jukeDark/70 font-bold text-[12px] mb-[14px] tracking-[1px] uppercase">
                Score Breakdown
              </p>

              {song.score_debug ? (
                <div className="flex flex-col gap-[8px] text-[13px]">
                  {/* Positive contributors */}
                  <ScoreRow label="TF-IDF match"  value={song.score_debug.tfidf}      positive />
                  {song.score_debug.activity != null && (
                    <ScoreRow label="Activity fit" value={song.score_debug.activity}   positive />
                  )}
                  <ScoreRow label="Popularity"    value={song.score_debug.popularity}  positive />

                  {/* Divider before penalties */}
                  {(song.score_debug.skip_penalty < 0 ||
                    song.score_debug.novelty_penalty < 0 ||
                    song.score_debug.artist_penalty < 0 ||
                    song.score_debug.genre_penalty < 0) && (
                    <div className="border-t border-jukeDark/10 my-[2px]" />
                  )}

                  {song.score_debug.skip_penalty < 0 && (
                    <ScoreRow label="Skip penalty"   value={song.score_debug.skip_penalty}   positive={false} />
                  )}
                  {song.score_debug.novelty_penalty < 0 && (
                    <ScoreRow label="Novelty penalty" value={song.score_debug.novelty_penalty} positive={false} />
                  )}
                  {song.score_debug.artist_penalty < 0 && (
                    <ScoreRow label="Artist repeat"  value={song.score_debug.artist_penalty} positive={false} />
                  )}
                  {song.score_debug.genre_penalty < 0 && (
                    <ScoreRow label="Genre repeat"   value={song.score_debug.genre_penalty}  positive={false} />
                  )}

                  <div className="border-t border-jukeDark/10 mt-[2px] pt-[6px] flex justify-between font-bold">
                    <span className="text-jukeDark/70">Final score</span>
                    <span>{song.score.toFixed(4)}</span>
                  </div>
                </div>
              ) : (
                /* Fallback for cold-start results that have no debug info */
                <div className="flex flex-col gap-[10px] text-[14px]">
                  <div className="flex justify-between">
                    <span className="text-jukeDark/60">Score</span>
                    <span className="font-semibold">{song.score.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-jukeDark/60">Popularity</span>
                    <span className="font-semibold">{song.popularity}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Spotify embed — auto on expand */}
          <div className="mt-[20px] pt-[16px] border-t border-jukeDark/8" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://open.spotify.com/embed/track/${song.track_id}?utm_source=generator`}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-[12px] border-0"
            />
          </div>

        </div>
      )}
    </div>
  )
}