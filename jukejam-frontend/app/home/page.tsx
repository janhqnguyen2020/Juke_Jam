"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Sunrise, Sun, Sunset, Moon, RefreshCw, ThumbsUp, ThumbsDown, Music, Music2, Music3, Clock } from "lucide-react"
import type { Song } from "@/lib/types"
import { getHomeRecommendations, getContextRecommendations } from "@/lib/api"
import SongCard from "@/components/home/SongCard"
import FilterBar, { type FilterState } from "@/components/home/FilterBar"
import ContextModal from "@/components/home/ContextModal"

// ─── Time helpers ─────────────────────────────────────────────────────────────
const TIME_LABEL: Record<string, string> = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night",
}
const TIME_ICON: Record<string, React.ElementType> = {
  morning: Sunrise, afternoon: Sun, evening: Sunset, night: Moon,
}

// ─── Subgenre discovery pool ──────────────────────────────────────────────────
const DISCOVERY_GENRES = [
  "acoustic", "afrobeat", "alt-rock", "ambient", "anime", "bluegrass", "blues",
  "breakbeat", "chicago-house", "deep-house", "disco", "drum-and-bass", "dubstep",
  "edm", "emo", "folk", "funk", "grunge", "guitar", "hardcore", "house", "indie",
  "indie-pop", "j-pop", "k-pop", "punk", "r-n-b", "reggae", "reggaeton",
  "singer-songwriter", "ska", "soul", "synth-pop", "techno", "trance", "trip-hop",
  "world-music", "jazz", "blues", "rock-n-roll", "psych-rock", "metalcore",
]

function pickThree(): string[] {
  return [...DISCOVERY_GENRES].sort(() => Math.random() - 0.5).slice(0, 3)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex items-center gap-6 bg-white rounded-3xl px-8 py-7 border border-jukeDark/10 shadow-md animate-pulse">
      <div className="w-7 h-6 bg-jukeDark/8 rounded flex-shrink-0" />
      <div className="w-[96px] h-[96px] rounded-2xl bg-jukeDark/10 flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-3">
        <div className="w-56 h-6 bg-jukeDark/10 rounded" />
        <div className="w-32 h-5 bg-jukeDark/8 rounded" />
        <div className="flex gap-2 mt-1">
          <div className="w-20 h-7 bg-jukeDark/8 rounded-full" />
          <div className="w-16 h-7 bg-jukeDark/8 rounded-full" />
          <div className="w-16 h-7 bg-jukeDark/8 rounded-full" />
        </div>
      </div>
      <div className="w-14 h-9 bg-jukeDark/10 rounded flex-shrink-0" />
    </div>
  )
}

// ─── Song list section ─────────────────────────────────────────────────────────
function SongSection({
  title,
  subtitle,
  songs,
  loading,
  error,
  expandedId,
  onToggle,
  onRefresh,
  emptyLabel,
  emptyHint,
  onEmptyAction,
  emptyActionLabel,
}: {
  title: string
  subtitle?: string
  songs: Song[]
  loading: boolean
  error: string | null
  expandedId: string | null
  onToggle: (id: string) => void
  onRefresh?: () => void
  emptyLabel?: string
  emptyHint?: string
  onEmptyAction?: () => void
  emptyActionLabel?: string
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between px-1">
        <div className="flex items-baseline gap-4">
          <h2 className="px-[10px] text-jukeDark font-bold text-[48px]">{title}</h2>
          {subtitle && <p className="text-jukeDark/50 text-[18px]">{subtitle}</p>}
          {!loading && songs.length > 0 && (
            <span className="text-jukeDark/35 text-[18px]">{songs.length} tracks · click any to expand</span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh"
            className="w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white border-jukeDark/25 text-jukeDark/60 hover:border-jukeDark hover:text-jukeDark transition-all"
          >
            <RefreshCw size={60} strokeWidth={1} />
          </button>
        )}
      </div>

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-6 py-5 mb-4">
          <p className="font-bold text-base mb-1">Something went wrong</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && !error && songs.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-6xl">🎵</span>
          <p className="text-jukeDark font-bold text-xl">{emptyLabel ?? "No tracks found"}</p>
          {emptyHint && <p className="text-jukeDark/45 text-base max-w-xs">{emptyHint}</p>}
          {onEmptyAction && emptyActionLabel && (
            <button
              onClick={onEmptyAction}
              className="mt-2 bg-jukeDark text-jukeCream rounded-full px-8 py-3 font-bold hover:bg-black transition-all text-base"
            >
              {emptyActionLabel}
            </button>
          )}
        </div>
      )}

      {!loading && !error && songs.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          {songs.map((song, i) => (
            <SongCard
              key={song.track_id}
              song={song}
              rank={i + 1}
              expanded={expandedId === song.track_id}
              onToggle={() => onToggle(song.track_id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Username gate ─────────────────────────────────────────────────────────────
function UsernameGate({ onSet }: { onSet: (id: string) => void }) {
  const [value, setValue] = useState("")
  const submit = () => {
    const t = value.trim()
    if (!t) return
    localStorage.setItem("user_id", t)
    onSet(t)
  }
  return (
    <div className="min-h-screen bg-jukeCream flex flex-col items-center justify-center gap-6 px-8">
      <Image src="/icons/logoTitle.svg" alt="JukeJam" width={300} height={80} className="h-[60px] w-auto" priority />
      <p className="text-jukeDark text-lg font-semibold">Enter your username to load your feed</p>
      <p className="text-jukeDark/50 text-sm -mt-3">Must match a profile in USER_PROFILE.csv</p>
      <div className="flex gap-3 w-full max-w-sm">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. joseph"
          className="flex-1 rounded-full px-5 py-3 bg-white border-2 border-jukeDark/20 text-jukeDark outline-none focus:border-jukeRed placeholder-jukeDark/30 text-base"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="bg-jukeDark text-jukeCream rounded-full px-6 py-3 font-bold hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
  const [userId,       setUserId]       = useState<string | null>(null)
  const [initLoading,  setInitLoading]  = useState(true)

  // ── Section A: time-context home feed ────────────────────────────────────────
  const [homeSongs,    setHomeSongs]    = useState<Song[]>([])
  const [homeLoading,  setHomeLoading]  = useState(false)
  const [homeError,    setHomeError]    = useState<string | null>(null)
  const [timeOfDay,    setTimeOfDay]    = useState<string | null>(null)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [ctxLoading,   setCtxLoading]   = useState(false)
  const [quizResults,  setQuizResults]  = useState<Song[] | null>(null)

  // ── Section B: filter / search ───────────────────────────────────────────────
  const [exploreSongs,   setExploreSongs]   = useState<Song[] | null>(null)  // null = inactive
  const [exploreLoading, setExploreLoading] = useState(false)
  const [exploreError,   setExploreError]   = useState<string | null>(null)
  const [searchQuery,    setSearchQuery]    = useState("")
  const [filters,        setFilters]        = useState<FilterState>({
    genre: null, energy: null,
  })

  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [featuredIdx,  setFeaturedIdx]  = useState(0)
  const [likedId,      setLikedId]      = useState<string | null>(null)
  const [liveTime,     setLiveTime]     = useState<Date | null>(null)

  useEffect(() => {
    setLiveTime(new Date())
    const interval = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { setSubgenreChips(pickThree()) }, [])

  // ── Section C: subgenre discovery ─────────────────────────────────────────
  const [subgenreChips,    setSubgenreChips]    = useState<string[]>([])
  const [activeSubgenre,   setActiveSubgenre]   = useState<string | null>(null)
  const [subgenreSongs,    setSubgenreSongs]    = useState<Song[] | null>(null)
  const [subgenreLoading,  setSubgenreLoading]  = useState(false)
  const [subgenreError,    setSubgenreError]    = useState<string | null>(null)
  const [subgenreLiked,    setSubgenreLiked]    = useState<Set<string>>(new Set())
  const [subgenreExpanded, setSubgenreExpanded] = useState<string | null>(null)

  // Pool of 30 home songs for shuffle-based refresh variety
  const homeSongPoolRef = useRef<Song[]>([])

  // Stable refs so callbacks don't go stale
  const userIdRef    = useRef(userId)
  const timeOfDayRef = useRef(timeOfDay)
  const filtersRef   = useRef(filters)
  const searchRef    = useRef(searchQuery)
  userIdRef.current    = userId
  timeOfDayRef.current = timeOfDay
  filtersRef.current   = filters
  searchRef.current    = searchQuery

  // ── Fetch: Section B (filtered) ───────────────────────────────────────────
  const fetchExplore = async (opts: FilterState & { search?: string }) => {
    const uid = userIdRef.current
    if (!uid) return
    setExploreLoading(true)
    setExploreError(null)
    try {
      const data = await getContextRecommendations({
        user_id:     uid,
        main_genres: opts.genre  ? [opts.genre] : undefined,
        energy:      opts.energy ?? undefined,
        artist:      opts.search || undefined,
        title:       opts.search || undefined,
        time_of_day: timeOfDayRef.current ?? undefined,
        top_k:       7,
      })
      setExploreSongs(data.recommendations)
    } catch {
      setExploreError("Could not load recommendations. Check that FastAPI is running on port 8000.")
    } finally {
      setExploreLoading(false)
    }
  }

  // ── On mount: read user_id from URL param (Spotify OAuth) or localStorage ─
  useEffect(() => {
    const fromUrl = searchParams.get("user_id")
    if (fromUrl) {
      localStorage.setItem("user_id", fromUrl)
      setUserId(fromUrl)
      // Clean the param from the URL without a page reload
      router.replace("/home")
      return
    }
    const stored = localStorage.getItem("user_id")
    if (stored) setUserId(stored)
    else        setInitLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch Section A + initial Explore when userId is set ─────────────────
  useEffect(() => {
    if (!userId) return
    setHomeLoading(true)
    setHomeError(null)
    getHomeRecommendations(userId, 30)
      .then((data) => {
        homeSongPoolRef.current = data.recommendations
        setHomeSongs(shuffle(data.recommendations).slice(0, 10))
        setTimeOfDay(data.time_of_day)
        setFeaturedIdx(0)
        setLikedId(null)
      })
      .catch(() => setHomeError("Could not reach the backend. Make sure FastAPI is running on port 8000."))
      .finally(() => {
        setHomeLoading(false)
        setInitLoading(false)
      })
    // Preset Explore to "all" (no filters)
    fetchExplore({ genre: null, energy: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Debounced search → Section B ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      fetchExplore({ ...filtersRef.current, search: searchQuery })
    }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // ── Filter chip change → Section B ───────────────────────────────────────
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    fetchExplore({ ...newFilters, search: searchRef.current })
  }

  // ── Context quiz submit → 5 songs shown inside the modal ────────────────
  const handleContextSubmit = async (activity: string, mood: string) => {
    if (!userId) return
    setCtxLoading(true)
    try {
      const data = await getContextRecommendations({
        user_id:     userId,
        activity,
        mood,
        time_of_day: timeOfDay ?? undefined,
        top_k:       5,
      })
      setQuizResults(data.recommendations)
    } catch {
      // keep modal open for retry
    } finally {
      setCtxLoading(false)
    }
  }

  const resetQuiz = () => setQuizResults(null)

  // ── Fetch subgenre discovery songs ───────────────────────────────────────
  const fetchSubgenreSongs = async (genre: string) => {
    const uid = userIdRef.current
    if (!uid) return
    setSubgenreLoading(true)
    setSubgenreError(null)
    try {
      const data = await getContextRecommendations({ user_id: uid, genres: [genre], top_k: 5 })
      setSubgenreSongs(data.recommendations)
      setSubgenreLiked(new Set())
      setSubgenreExpanded(null)
    } catch {
      setSubgenreError("Could not load songs.")
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

  // ── Username gate ─────────────────────────────────────────────────────────
  if (!userId && !initLoading) return <UsernameGate onSet={setUserId} />

  // ── Derived display values ────────────────────────────────────────────────
  const timeLabel    = timeOfDay ? (TIME_LABEL[timeOfDay] ?? timeOfDay) : null
  const TimeIcon     = timeOfDay ? (TIME_ICON[timeOfDay] ?? Music2)     : Music2
  const userInitial  = userId ? userId[0].toUpperCase() : "U"
  const featuredSong = homeSongs[featuredIdx] ?? null

  const contextLine  = timeLabel ?? "Personalized"
  const timeString   = liveTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "--:--"
  const dayString    = liveTime?.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) ?? ""


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-jukeCream flex flex-col">

      {/* ════ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-[#6A2C2C] backdrop-blur-md border-b-[4px] border-jukeRed overflow-hidden">

        <div className="relative flex items-center justify-between p-[24px] py-[24px]">

          {/* LEFT — Logo */}
          <div className="flex items-center">
            <Image
              src="/icons/logoTitle.svg"
              alt="JukeJam"
              width={200}
              height={100}
              className="h-[140px] w-auto"
              priority
            />
          </div>

          {/* CENTER — Navigation */}
          <nav className="flex items-center gap-[200px]">
            {[
              { id: "time",     label: "Time",     icon: Music  },
              { id: "explore",  label: "Explore",  icon: Music2 },
              { id: "discover", label: "Discover", icon: Music3 },
            ].map(({ id, label, icon: Icon }) => (
              <div
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
                className="flex flex-col items-center cursor-pointer group hover:-translate-y-0.5 transition-transform"
              >
                <Icon
                  size={60}
                  strokeWidth={2}
                  className="text-jukeCream group-hover:text-jukeCream group-hover:-rotate-27 transition-all duration-200"
                />
                <span className="text-[36px] font-bold text-jukeCream group-hover:text-jukeCream transition-colors">
                  {label}
                </span>
              </div>
            ))}
          </nav>

          {/* RIGHT — Username pill */}
          <div className="flex items-center text-[40px] gap-[12px] bg-jukeRed text-jukeCream rounded-full px-[36px] py-[12px] font-bold text-base shadow-lg border-2 border-white/30 flex-shrink-0">
            {userId}
          </div>

        </div>
      </div>

      {/* ════ CONTEXT BANNER ═══════════════════════════════════════════════════ */}
      <section id="time" className="bg-[#F4EBD0] border-b-2 border-jukeRed/20 px-[24px] py-14 flex items-stretch">

        {/* LEFT — time panel (3/5) */}
        <div className="w-2/5 flex flex-col justify-center gap-[12px]">
          <p className="text-jukeDark font-bold text-[50px] uppercase tracking-[0.18em]">Time Context</p>

          {/* Time-of-day label */}
          <div className="flex items-center gap-[6px]">
            <div className="w-14 h-14 rounded-2xl bg-jukeDark/10 flex items-center justify-center flex-shrink-0">
              <TimeIcon size={60} strokeWidth={1.5} className="text-jukeDark" />
            </div>
            <p className="text-jukeDark font-extrabold text-[36px] leading-tight">{contextLine}</p>
          </div>

          {/* Live clock */}
          <div className="flex items-center gap-[6px]">
            <div className="w-14 h-14 rounded-2xl bg-jukeDark/10 flex items-center justify-center flex-shrink-0">
              <Clock size={60} strokeWidth={1.5} className="text-jukeDark" />
            </div>
            <p className="text-jukeDark font-black text-[36px] tracking-tight tabular-nums">{timeString}</p>
          </div>

          {/* Day */}
          <p className="text-jukeDark/55 text-[32px] font-semibold">{dayString}</p>
          <p className="text-jukeDark/35 text-[20px]">Based on your taste profile and time of day</p>
        </div>

        {/* Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-jukeDark/20 to-transparent self-stretch flex-shrink-0" />

        {/* RIGHT — featured song (2/5) */}
        {homeLoading ? (
          <div className="w-3/5 h-[200px] rounded-2xl bg-jukeDark/8 animate-pulse self-center" />
        ) : featuredSong ? (
          <div className="w-3/5 flex flex-col justify-center items-center rounded-3xl py-8 relative overflow-hidden">

            {/* Treble clef watermark */}
            <div className="absolute inset-0 opacity-[0.05] text-[200px] flex items-center justify-center pointer-events-none select-none">
              𝄞
            </div>

            {/* Song title + artist */}
            <div className="text-center w-full relative">
              <p className="text-jukeDark font-black text-[40px] leading-tight tracking-tight">{featuredSong.title}</p>
              <p className="text-jukeDark/60 text-[36px] mt-1">{featuredSong.artist}</p>
            </div>

            {/* Tags */}
            <div className="flex gap-[24px] flex-wrap justify-center relative">
              <span className="text-[24px] font-bold px-[12px] py-1.5 rounded-full bg-jukeDark/5 text-jukeDark/70 border border-jukeDark/10 capitalize">
                {featuredSong.main_genre}
              </span>
              <span className="text-[24px] font-bold px-[12px] py-1.5 rounded-full bg-jukeRed/10 text-jukeRed border border-jukeRed/20 capitalize">
                {featuredSong.mood}
              </span>
              {featuredSong.energy_label && (
                <span className="text-[24px] font-bold px-[12px] py-1.5 rounded-full bg-jukeDark/5 text-jukeDark/50 border border-jukeDark/10 capitalize">
                  {featuredSong.energy_label}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-[30px] py-[16px] relative">
              <button
                onClick={() => setLikedId(likedId === featuredSong.track_id ? null : featuredSong.track_id)}
                title="Like"
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                              ${likedId === featuredSong.track_id
              ? "bg-jukeGreen border-jukeGreen text-white"
              : "bg-white border-jukeDark/25 text-jukeDark/60 hover:border-jukeGreen hover:text-jukeGreen"
            }`}
              >
                <ThumbsUp size={60} strokeWidth={1} />
              </button>
              <button
                onClick={() => { setLikedId(null); setFeaturedIdx((i) => (i + 1) % Math.max(homeSongs.length, 1)) }}
                title="Skip"
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 bg-white border-jukeDark/25 text-jukeDark/60 hover:border-jukeRed hover:text-jukeRed transition-all"
              >
                <ThumbsDown size={60} strokeWidth={1} />
              </button>
              <button
                onClick={() => {
                  const pool = homeSongPoolRef.current
                  if (!pool.length) return
                  setHomeSongs(shuffle(pool).slice(0, 10))
                  setFeaturedIdx(0)
                  setLikedId(null)
                }}
                title="Refresh"
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 bg-white border-jukeDark/25 text-jukeDark/60 hover:border-jukeDark hover:text-jukeDark transition-all"
              >
                <RefreshCw size={60} strokeWidth={1} />
              </button>
            </div>

            {/* Spotify embed */}
            <iframe
              src={`https://open.spotify.com/embed/track/${featuredSong.track_id}?utm_source=generator`}
              width="100%"
              height="400"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl border-0 block w-full max-w-[500px]"
            />

          </div>
        ) : null}

      </section>

      {/* ════ FILTER BAR ═══════════════════════════════════════════════════════ */}
      <div className="my-8">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenQuiz={() => setModalOpen(true)}
        />
      </div>

      {/* ════ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <main className="flex-1 py-8 px-8 gap-[16px]">
        <div className="w-[85%] max-w-[1600px] mx-auto flex flex-col">

          {/* ── Explore ───────────────────────────────────────────────────── */}
          <section id="explore">
            <SongSection
              title="Explore"
              subtitle={[
                filters.genre  && `genre: ${filters.genre}`,
                filters.energy && `energy: ${filters.energy}`,
                searchQuery.trim() && `"${searchQuery.trim()}"`,
              ].filter(Boolean).join("  ·  ") || undefined}
              songs={exploreSongs ?? []}
              loading={exploreLoading}
              error={exploreError}
              expandedId={expandedId}
              onToggle={(id) => setExpandedId((p) => p === id ? null : id)}
              onRefresh={() => fetchExplore({ ...filtersRef.current, search: searchRef.current })}
              emptyLabel="No tracks found"
              emptyHint="Try a different filter or search."
            />
          </section>

          {/* ── Discover ──────────────────────────────────────────────────── */}
          <section id="discover" className="flex flex-col gap-[5px]">

            {/* Header row */}
            <div className="flex items-baseline justify-between px-1">
              <div className="flex items-baseline gap-4">
                <h2 className="px-[20px] text-jukeDark font-bold text-[48px]">Discover</h2>
                {activeSubgenre
                  ? <p className="text-jukeDark/50 text-[18px]">{subgenreSongs?.length ?? 0} tracks · {activeSubgenre.replace(/-/g, " ")}</p>
                  : <p className="text-jukeDark/50 text-[18px]">Pick a subgenre to explore</p>
                }
              </div>
              <button
                onClick={refreshSubgenreChips}
                title="New suggestions"
                className="w-9 h-8 rounded-full flex items-center justify-center border-2 bg-white border-jukeDark/25 text-jukeDark/60 hover:border-jukeDark hover:text-jukeDark transition-all"
              >
                <RefreshCw size={60} strokeWidth={1} />
              </button>
            </div>

            {/* Subgenre chip suggestions */}
            <div className="flex flex-wrap gap-[4px] px-1">
              {subgenreChips.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleSubgenreChip(genre)}
                  className={`rounded-full px-[34px] py-[8px] text-[18x] font-bold border-2 transition-all duration-150 capitalize
                    ${activeSubgenre === genre
                      ? "bg-jukeRed text-white border-jukeRed shadow-[0_0_12px_rgba(156,75,75,0.35)]"
                      : "bg-white text-jukeDark border-jukeDark/20 hover:border-jukeRed hover:text-jukeRed"
                    }`}
                >
                  {genre.replace(/-/g, " ")}
                </button>
              ))}
            </div>

            {/* Song list */}
            {subgenreLoading && (
              <div className="flex flex-col gap-8">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {subgenreError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-6 py-5">
                <p className="font-bold text-base mb-1">Something went wrong</p>
                <p className="text-sm">{subgenreError}</p>
              </div>
            )}

            {!subgenreLoading && subgenreSongs && subgenreSongs.length > 0 && (
              <div className="flex flex-col gap-[8px]">
                {subgenreSongs.map((song, i) => (
                  <SongCard
                    key={song.track_id}
                    song={song}
                    rank={i + 1}
                    expanded={subgenreExpanded === song.track_id}
                    onToggle={() => setSubgenreExpanded(p => p === song.track_id ? null : song.track_id)}
                  />
                ))}
              </div>
            )}

            {!subgenreLoading && !subgenreSongs && !activeSubgenre && (
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <span className="text-6xl opacity-30">𝄞</span>
                <p className="text-jukeDark font-bold text-xl">Discover something new</p>
                <p className="text-jukeDark/45 text-base max-w-xs">
                  Select one of the subgenre chips above to hear 5 tracks.
                </p>
              </div>
            )}

          </section>

        </div>
      </main>

      {/* ════ CONTEXT MODAL ════════════════════════════════════════════════════ */}
      <ContextModal
        open={modalOpen}
        loading={ctxLoading}
        results={quizResults}
        onClose={() => { setModalOpen(false); setQuizResults(null) }}
        onReset={resetQuiz}
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
