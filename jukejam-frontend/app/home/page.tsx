"use client"

import { useCallback, useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { RefreshCw, Music, Music2, Music3, Star, ListMusic, SlidersHorizontal, Compass, X } from "lucide-react"
import type { ProfileSummary, Song } from "@/lib/types"
import { getHomeRecommendations, getContextRecommendations, getProfile } from "@/lib/api"
import { currentTimeSlot } from "@/lib/time"
import SongCard from "@/components/home/SongCard"
import FilterBar, { type FilterState } from "@/components/home/FilterBar"
import ContextModal from "@/components/home/ContextModal"
import ContextHero from "@/components/home/ContextHero"
import { Panel, Pill } from "@/components/ui/panel"

// ─── Constants ────────────────────────────────────────────────────────────────
const POOL_SIZE = 30   // songs fetched for the home feed (refresh pages through these)
const PAGE_SIZE = 10   // songs shown at once: #1 featured + 9 below
const FILTER_TOP_K = 10
const SLOW_NOTICE_MS = 6000

// ─── Subgenre discovery pool ──────────────────────────────────────────────────
const DISCOVERY_GENRES = [
  "acoustic", "afrobeat", "alt-rock", "ambient", "anime", "bluegrass", "blues",
  "breakbeat", "chicago-house", "deep-house", "disco", "drum-and-bass", "dubstep",
  "edm", "emo", "folk", "funk", "grunge", "guitar", "hardcore", "house", "indie",
  "indie-pop", "j-pop", "k-pop", "punk", "r-n-b", "reggae", "reggaeton",
  "singer-songwriter", "ska", "soul", "synth-pop", "techno", "trance", "trip-hop",
  "world-music", "jazz", "rock-n-roll", "psych-rock", "metalcore",
]

function pickThree(): string[] {
  return [...DISCOVERY_GENRES].sort(() => Math.random() - 0.5).slice(0, 3)
}

interface Ranked { song: Song; rank: number }

/** Drop malformed rows and duplicate track ids so rendering never crashes. */
function cleanSongs(recs: unknown): Song[] {
  if (!Array.isArray(recs)) return []
  const seen = new Set<string>()
  const out: Song[] = []
  for (const s of recs) {
    if (!s || typeof s !== "object") continue
    const id = (s as Song).track_id
    if (typeof id !== "string" || !id || seen.has(id)) continue
    seen.add(id)
    out.push(s as Song)
  }
  return out
}

function rankAll(songs: Song[]): Ranked[] {
  return songs.map((song, i) => ({ song, rank: i + 1 }))
}

// ─── Small UI states ──────────────────────────────────────────────────────────
function SkeletonCard({ big = false }: { big?: boolean }) {
  return (
    <div className="flex jj-pulse items-center gap-[16px] rounded-2xl border border-jj-border bg-jj-paper p-[20px]">
      <div className={`${big ? "h-[160px] w-[160px]" : "h-[80px] w-[80px]"} shrink-0 rounded-xl bg-jj-cream`} />
      <div className="flex flex-1 flex-col gap-[12px]">
        <div className="h-[20px] w-1/2 rounded bg-jj-cream" />
        <div className="h-[16px] w-1/3 rounded bg-jj-cream" />
        <div className="flex gap-[8px]">
          <div className="h-[24px] w-[64px] rounded-full bg-jj-cream" />
          <div className="h-[24px] w-[56px] rounded-full bg-jj-cream" />
        </div>
      </div>
    </div>
  )
}

function LoadingList({ count, slow }: { count: number; slow?: boolean }) {
  return (
    <div className="flex flex-col gap-[12px]">
      {slow && (
        <p className="text-[16px] text-jj-muted">
          Waking up the server. The first load can take up to a minute.
        </p>
      )}
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-jj-accent bg-jj-cream/60 px-[24px] py-[20px]">
      <p className="text-[18px] font-[700] text-jj-text">Couldn&apos;t load songs</p>
      <p className="mt-[4px] text-[16px] text-jj-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-[12px] inline-flex items-center gap-[8px] rounded-full border border-jj-border bg-jj-paper px-[16px] py-[6px] text-[16px] font-[600] text-jj-text hover:border-jj-primary"
        >
          <RefreshCw className="h-[16px] w-[16px]" /> Try again
        </button>
      )}
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-[8px] py-[40px] text-center">
      <span className="text-[36px] opacity-40">𝄞</span>
      <p className="text-[18px] font-[700] text-jj-text">{title}</p>
      {hint && <p className="max-w-[384px] text-[16px] text-jj-muted">{hint}</p>}
    </div>
  )
}

function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex shrink-0 items-center gap-[8px] rounded-full border border-jj-border bg-jj-paper px-[16px] py-[6px] text-[16px] font-[600] text-jj-text transition-colors hover:border-jj-primary"
    >
      {children}
    </button>
  )
}

// ─── Username gate ─────────────────────────────────────────────────────────────
function UsernameGate({ onSet }: { onSet: (id: string) => void }) {
  const [value, setValue] = useState("")
  const submit = () => {
    const t = value.trim()
    if (!t) return
    try { localStorage.setItem("user_id", t) } catch {}
    onSet(t)
  }
  return (
    <div className="jj-scope flex min-h-screen flex-col items-center justify-center gap-[24px] bg-jj-cream px-[16px]">
      <div className="rounded-2xl bg-jj-dark px-[32px] py-[16px]">
        <Image src="/icons/logoTitle.svg" alt="JukeJam" width={300} height={80} className="h-[60px] w-auto" priority />
      </div>
      <p className="text-center text-[20px] font-[600] text-jj-text">Enter your username to load your feed</p>
      <div className="flex w-full max-w-[384px] gap-[12px]">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. joseph"
          className="min-w-[0px] flex-1 rounded-full border border-jj-border bg-jj-paper px-[20px] py-[12px] text-[16px] text-jj-text outline-none placeholder:text-jj-muted focus:border-jj-primary"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="rounded-full bg-jj-primary px-[24px] py-[12px] font-[700] text-jj-paper transition-colors hover:bg-jj-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Go
        </button>
      </div>
    </div>
  )
}

// ─── Home page ──────────────────────────────────────────────────────────────────
function HomePageInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [userId,      setUserId]      = useState<string | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const [profile,     setProfile]     = useState<ProfileSummary | null>(null)
  const [now,         setNow]         = useState<Date | null>(null)

  // Mood + activity chosen in the context popup; applied to the whole feed.
  const [context,   setContext]   = useState<{ mood: string | null; activity: string | null }>({ mood: null, activity: null })
  const [modalOpen, setModalOpen] = useState(false)

  // ── Feed: ranked pool from the backend, shown PAGE_SIZE at a time ──────────
  const [pool,        setPool]        = useState<Ranked[]>([])
  const [offset,      setOffset]      = useState(0)
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedSlow,    setFeedSlow]    = useState(false)
  const [feedError,   setFeedError]   = useState<string | null>(null)

  // ── Filtered results (only used while a filter or search is active) ────────
  const [filters,        setFilters]        = useState<FilterState>({ genre: null, energy: null })
  const [searchQuery,    setSearchQuery]    = useState("")
  const [exploreSongs,   setExploreSongs]   = useState<Song[]>([])
  const [exploreLoading, setExploreLoading] = useState(false)
  const [exploreError,   setExploreError]   = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Discover (subgenre) ─────────────────────────────────────────────────────
  const [subgenreChips,    setSubgenreChips]    = useState<string[]>([])
  const [activeSubgenre,   setActiveSubgenre]   = useState<string | null>(null)
  const [subgenreSongs,    setSubgenreSongs]    = useState<Song[] | null>(null)
  const [subgenreLoading,  setSubgenreLoading]  = useState(false)
  const [subgenreError,    setSubgenreError]    = useState<string | null>(null)

  // Refs so debounced callbacks always read the latest values
  const filtersRef = useRef(filters)
  const searchRef  = useRef(searchQuery)
  const contextRef = useRef(context)
  filtersRef.current = filters
  searchRef.current  = searchQuery
  contextRef.current = context

  const feedAbortRef      = useRef<AbortController | null>(null)
  const exploreAbortRef   = useRef<AbortController | null>(null)
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filterActive = Boolean(filters.genre || filters.energy || searchQuery.trim())

  // ── Clock (browser time) + discover chips ──────────────────────────────────
  useEffect(() => {
    setNow(new Date())
    setSubgenreChips(pickThree())
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])

  // ── On mount: user_id from URL (Spotify OAuth) or localStorage ─────────────
  useEffect(() => {
    const fromUrl = searchParams.get("user_id")
    if (fromUrl) {
      try { localStorage.setItem("user_id", fromUrl) } catch {}
      setUserId(fromUrl)
      router.replace("/home")
      return
    }
    let stored: string | null = null
    try { stored = localStorage.getItem("user_id") } catch {}
    if (stored) setUserId(stored)
    else        setInitLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Profile summary (optional; UI hides it on failure) ─────────────────────
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getProfile(userId).then((p) => { if (!cancelled) setProfile(p) })
    return () => { cancelled = true }
  }, [userId])

  // ── Feed fetch ──────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    if (!userId) return
    feedAbortRef.current?.abort()
    const controller = new AbortController()
    feedAbortRef.current = controller
    setFeedLoading(true)
    setFeedSlow(false)
    setFeedError(null)
    const slowTimer = setTimeout(() => setFeedSlow(true), SLOW_NOTICE_MS)
    const { mood, activity } = contextRef.current
    try {
      const data = mood || activity
        ? await getContextRecommendations({
            user_id:     userId,
            mood:        mood ?? undefined,
            activity:    activity ?? undefined,
            time_of_day: currentTimeSlot(),
            top_k:       POOL_SIZE,
          }, controller.signal)
        : await getHomeRecommendations(userId, POOL_SIZE)
      if (controller.signal.aborted) return
      setPool(rankAll(cleanSongs(data?.recommendations)))
      setOffset(0)
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return
      setFeedError("The server didn't respond. It may be waking up, so try again in a moment.")
    } finally {
      clearTimeout(slowTimer)
      if (!controller.signal.aborted) {
        setFeedLoading(false)
        setFeedSlow(false)
        setInitLoading(false)
      }
    }
  }, [userId])

  useEffect(() => {
    loadFeed()
  }, [loadFeed, context.mood, context.activity])

  // ── Filtered fetch ──────────────────────────────────────────────────────────
  const fetchExplore = useCallback(async (opts: FilterState & { search: string }) => {
    if (!userId) return
    exploreAbortRef.current?.abort()
    if (!opts.genre && !opts.energy && !opts.search.trim()) {
      setExploreSongs([])
      setExploreLoading(false)
      setExploreError(null)
      return
    }
    const controller = new AbortController()
    exploreAbortRef.current = controller
    setExploreLoading(true)
    setExploreError(null)
    const { mood, activity } = contextRef.current
    const search = opts.search.trim()
    try {
      const data = await getContextRecommendations({
        user_id:     userId,
        main_genres: opts.genre ? [opts.genre] : undefined,
        energy:      opts.energy ?? undefined,
        artist:      search || undefined,
        title:       search || undefined,
        mood:        mood ?? undefined,
        activity:    activity ?? undefined,
        time_of_day: currentTimeSlot(),
        top_k:       FILTER_TOP_K,
      }, controller.signal)
      if (controller.signal.aborted) return
      setExploreSongs(cleanSongs(data?.recommendations))
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return
      setExploreError("Could not load filtered songs. Try again in a moment.")
    } finally {
      if (!controller.signal.aborted) setExploreLoading(false)
    }
  }, [userId])

  // Debounced search
  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      fetchExplore({ ...filtersRef.current, search: searchQuery })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, userId, fetchExplore])

  // Re-run an active filter when mood/activity changes
  useEffect(() => {
    fetchExplore({ ...filtersRef.current, search: searchRef.current })
  }, [context.mood, context.activity, fetchExplore])

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {
      fetchExplore({ ...newFilters, search: searchRef.current })
    }, 300)
  }

  const clearFilters = () => {
    setSearchQuery("")
    handleFilterChange({ genre: null, energy: null })
  }

  // ── Context popup submit → applies to the feed ─────────────────────────────
  const handleContextSubmit = (activity: string, mood: string) => {
    setContext({ activity, mood })
    setModalOpen(false)
  }

  // ── Refresh: next PAGE_SIZE songs from the pool, or refetch when exhausted ─
  const handleRefresh = () => {
    if (pool.length > PAGE_SIZE) {
      setOffset((o) => (o + PAGE_SIZE < pool.length ? o + PAGE_SIZE : 0))
      setExpandedId(null)
    } else {
      loadFeed()
    }
  }

  // ── Discover ────────────────────────────────────────────────────────────────
  const fetchSubgenreSongs = async (genre: string) => {
    if (!userId) return
    setSubgenreLoading(true)
    setSubgenreError(null)
    try {
      const data = await getContextRecommendations({ user_id: userId, genres: [genre], top_k: 5 })
      setSubgenreSongs(cleanSongs(data?.recommendations))
    } catch {
      setSubgenreError("Could not load songs for this subgenre.")
    } finally {
      setSubgenreLoading(false)
    }
  }

  const handleSubgenreChip = (genre: string) => {
    if (activeSubgenre === genre) {
      setActiveSubgenre(null)
      setSubgenreSongs(null)
    } else {
      setActiveSubgenre(genre)
      fetchSubgenreSongs(genre)
    }
  }

  const refreshSubgenreChips = () => {
    setSubgenreChips(pickThree())
    setActiveSubgenre(null)
    setSubgenreSongs(null)
    setSubgenreError(null)
  }

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!userId && !initLoading) return <UsernameGate onSet={setUserId} />

  // ── Derived ───────────────────────────────────────────────────────────────
  const visible  = pool.slice(offset, offset + PAGE_SIZE)
  const featured = visible[0] ?? null
  const rest     = visible.slice(1)
  const firstRank = visible[0]?.rank ?? 1
  const lastRank  = visible[visible.length - 1]?.rank ?? 0
  const heading = visible.length === 0
    ? "Your picks for right now"
    : offset === 0
      ? `Your top ${visible.length} for right now`
      : `Picks ${firstRank}–${lastRank} for right now`

  const filterLabel = [
    filters.genre,
    filters.energy && `${filters.energy} energy`,
    searchQuery.trim() && `“${searchQuery.trim()}”`,
  ].filter(Boolean).join(" · ")

  const toggle = (id: string) => setExpandedId((p) => (p === id ? null : id))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="jj-scope flex min-h-screen flex-col overflow-x-hidden bg-jj-cream">

      {/* ════ NAVBAR ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-[0px] z-50 border-b-[4px] border-jukeRed bg-[#6A2C2C]">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-x-[24px] gap-y-[12px] px-[16px] py-[16px] tablet:px-[24px] desk:px-[40px]">
          <Image
            src="/icons/logoTitle.svg"
            alt="JukeJam"
            width={200}
            height={100}
            className="h-[64px] w-auto desk:h-[110px]"
            priority
          />

          <nav className="order-3 flex w-full items-center justify-around gap-[16px] tablet:order-none tablet:w-auto tablet:gap-[48px] desk:gap-[96px]">
            {[
              { id: "time",     label: "Time",     icon: Music  },
              { id: "explore",  label: "Explore",  icon: Music2 },
              { id: "discover", label: "Discover", icon: Music3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
                className="group flex flex-col items-center transition-transform hover:-translate-y-[2px]"
              >
                <Icon strokeWidth={2} className="h-[32px] w-[32px] text-jukeCream transition-transform duration-200 group-hover:-rotate-12 desk:h-[48px] desk:w-[48px]" />
                <span className="text-[18px] font-[700] text-jukeCream desk:text-[30px]">{label}</span>
              </button>
            ))}
          </nav>

          <div className="max-w-[40vw] truncate rounded-full border-2 border-white/30 bg-jukeRed px-[20px] py-[8px] text-[18px] font-[700] text-jukeCream desk:px-[32px] desk:text-[24px]">
            {userId}
          </div>
        </div>
      </header>

      {/* ════ MAIN ═════════════════════════════════════════════════════════════ */}
      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-[24px] px-[16px] py-[32px] tablet:px-[24px] desk:px-[40px]">

        <div>
          <h1 className="text-[36px] font-[900] tracking-[-0.025em] text-jj-text desk:text-[48px]">{heading}</h1>
          <p className="mt-[4px] text-[18px] text-jj-muted">Ranked for you. Open any song to see why it&apos;s here.</p>
        </div>

        {/* Top row: context hero + featured #1 */}
        <div className="grid grid-cols-1 gap-[24px] desk:grid-cols-[380px_1fr]">
          <ContextHero
            now={now}
            profile={profile}
            selections={{ genre: filters.genre, energy: filters.energy, mood: context.mood, activity: context.activity }}
            onOpenContext={() => setModalOpen(true)}
            onClearContext={() => setContext({ mood: null, activity: null })}
          />

          <Panel
            title={featured ? `Your #${featured.rank} pick` : "Your #1 pick"}
            icon={<Star className="h-[24px] w-[24px] shrink-0" strokeWidth={2} />}
            action={pool.length > 0 ? (
              <IconButton onClick={handleRefresh} title="Show the next 10 picks">
                <RefreshCw className="h-[16px] w-[16px]" /> Refresh
              </IconButton>
            ) : null}
          >
            {feedLoading ? (
              <LoadingList count={1} slow={feedSlow} />
            ) : feedError ? (
              <ErrorState message={feedError} onRetry={loadFeed} />
            ) : featured ? (
              <div className="flex flex-col gap-[16px]">
                <SongCard
                  song={featured.song}
                  rank={featured.rank}
                  expanded={expandedId === featured.song.track_id}
                  onToggle={() => toggle(featured.song.track_id)}
                />
                <iframe
                  src={`https://open.spotify.com/embed/track/${featured.song.track_id}?utm_source=generator`}
                  width="100%"
                  height="152"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="block w-full rounded-xl border-0"
                  title={`Spotify player for ${featured.song.title ?? "this track"}`}
                />
              </div>
            ) : (
              <EmptyState title="No picks yet" hint="Try setting a mood and activity, or take the taste quiz." />
            )}
          </Panel>
        </div>

        {/* Filters */}
        <Panel
          id="explore"
          title="Filters"
          icon={<SlidersHorizontal className="h-[24px] w-[24px] shrink-0" strokeWidth={2} />}
          action={filterActive ? (
            <IconButton onClick={clearFilters} title="Clear filters">
              <X className="h-[16px] w-[16px]" /> Clear
            </IconButton>
          ) : null}
        >
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </Panel>

        {/* Ranked list */}
        {filterActive ? (
          <Panel
            title="Filtered picks"
            icon={<ListMusic className="h-[24px] w-[24px] shrink-0" strokeWidth={2} />}
            action={filterLabel ? <Pill strong>{filterLabel}</Pill> : null}
          >
            {exploreLoading ? (
              <LoadingList count={4} />
            ) : exploreError ? (
              <ErrorState message={exploreError} onRetry={() => fetchExplore({ ...filters, search: searchQuery })} />
            ) : exploreSongs.length === 0 ? (
              <EmptyState title="No songs match these filters" hint="Try a different genre, energy level or search." />
            ) : (
              <div className="flex flex-col gap-[12px]">
                {exploreSongs.map((song, i) => (
                  <SongCard
                    key={song.track_id}
                    song={song}
                    rank={i + 1}
                    expanded={expandedId === song.track_id}
                    onToggle={() => toggle(song.track_id)}
                  />
                ))}
              </div>
            )}
          </Panel>
        ) : (
          <Panel
            title="More picks"
            icon={<ListMusic className="h-[24px] w-[24px] shrink-0" strokeWidth={2} />}
            action={pool.length > 0 ? (
              <IconButton onClick={handleRefresh} title="Show the next 10 picks">
                <RefreshCw className="h-[16px] w-[16px]" /> Refresh
              </IconButton>
            ) : null}
          >
            {feedLoading ? (
              <LoadingList count={4} slow={false} />
            ) : feedError ? (
              <ErrorState message={feedError} onRetry={loadFeed} />
            ) : rest.length === 0 ? (
              <EmptyState title="No more picks right now" hint="Refresh, or set a mood and activity." />
            ) : (
              <div className="flex flex-col gap-[12px]">
                {rest.map(({ song, rank }) => (
                  <SongCard
                    key={song.track_id}
                    song={song}
                    rank={rank}
                    expanded={expandedId === song.track_id}
                    onToggle={() => toggle(song.track_id)}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Discover */}
        <Panel
          id="discover"
          title="Discover"
          icon={<Compass className="h-[24px] w-[24px] shrink-0" strokeWidth={2} />}
          action={
            <IconButton onClick={refreshSubgenreChips} title="New suggestions">
              <RefreshCw className="h-[16px] w-[16px]" /> New subgenres
            </IconButton>
          }
        >
          <p className="mb-[12px] text-[16px] text-jj-muted">
            {activeSubgenre
              ? `5 tracks from ${activeSubgenre.replace(/-/g, " ")}`
              : "Pick a subgenre you might not have tried."}
          </p>
          <div className="mb-[16px] flex flex-wrap gap-[8px]">
            {subgenreChips.map((genre) => {
              const active = activeSubgenre === genre
              return (
                <button
                  key={genre}
                  onClick={() => handleSubgenreChip(genre)}
                  aria-pressed={active}
                  className={`rounded-full border px-[20px] py-[6px] text-[16px] font-[600] capitalize transition-colors
                    ${active
                      ? "border-jj-primary bg-jj-primary text-jj-paper"
                      : "border-jj-border bg-jj-paper text-jj-text hover:border-jj-accent hover:bg-jj-cream"
                    }`}
                >
                  {genre.replace(/-/g, " ")}
                </button>
              )
            })}
          </div>

          {subgenreLoading ? (
            <LoadingList count={3} />
          ) : subgenreError ? (
            <ErrorState message={subgenreError} onRetry={activeSubgenre ? () => fetchSubgenreSongs(activeSubgenre) : undefined} />
          ) : subgenreSongs && subgenreSongs.length > 0 ? (
            <div className="flex flex-col gap-[12px]">
              {subgenreSongs.map((song, i) => (
                <SongCard
                  key={song.track_id}
                  song={song}
                  rank={i + 1}
                  expanded={expandedId === song.track_id}
                  onToggle={() => toggle(song.track_id)}
                />
              ))}
            </div>
          ) : subgenreSongs ? (
            <EmptyState title="Nothing found for this subgenre" />
          ) : null}
        </Panel>
      </main>

      {/* ════ CONTEXT POPUP ════════════════════════════════════════════════════ */}
      <ContextModal
        open={modalOpen}
        loading={false}
        results={null}
        onClose={() => setModalOpen(false)}
        onReset={() => {}}
        onSubmit={handleContextSubmit}
      />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  )
}
