"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Dumbbell, BookOpen, Bus, Sofa, PartyPopper, Moon,
  Smile, Flame, Frown, Target, Coffee, RotateCcw,
} from "lucide-react"
import type { Song } from "@/lib/types"

const ACTIVITIES = [
  { label: "Workout", value: "workout", icon: Dumbbell },
  { label: "Study",   value: "study",   icon: BookOpen },
  { label: "Commute", value: "commute", icon: Bus },
  { label: "Relax",   value: "relax",   icon: Sofa },
  { label: "Party",   value: "party",   icon: PartyPopper },
  { label: "Sleep",   value: "sleep",   icon: Moon },
]

const MOODS = [
  { label: "Happy", value: "happy", icon: Smile },
  { label: "Chill", value: "chill", icon: Coffee },
  { label: "Hype",  value: "hype",  icon: Flame },
  { label: "Sad",   value: "sad",   icon: Frown },
  { label: "Focus", value: "focus", icon: Target },
]

const MOOD_PILL: Record<string, string> = {
  happy: "bg-yellow-100 text-yellow-800",
  hype:  "bg-orange-100 text-orange-700",
  chill: "bg-sky-100 text-sky-800",
  sad:   "bg-indigo-100 text-indigo-700",
  focus: "bg-emerald-100 text-emerald-800",
}

interface Props {
  open:     boolean
  loading:  boolean
  results:  Song[] | null
  onClose:  () => void
  onReset:  () => void
  onSubmit: (activity: string, mood: string) => void
}

export default function ContextModal({ open, loading, results, onClose, onReset, onSubmit }: Props) {
  const [activity, setActivity] = useState<string | null>(null)
  const [mood,     setMood]     = useState<string | null>(null)

  const canSubmit = activity !== null && mood !== null

  const handleSubmit = () => {
    if (!canSubmit || loading) return
    onSubmit(activity, mood)
  }

  const handleReset = () => {
    setActivity(null)
    setMood(null)
    onReset()
  }

  const handleClose = () => {
    setActivity(null)
    setMood(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent
        className="
          !bg-jukeCream
          border-none
          !rounded-[28px]
          max-w-[680px]
          w-full
          max-h-[85vh]
          overflow-y-auto
          px-[40px]
          py-[32px]
          gap-[28px]
          shadow-[0_25px_60px_rgba(0,0,0,0.15)]
        "
      >

        {/* ── RESULTS PHASE ─────────────────────────────────────────────── */}
        {results ? (
          <>
            <DialogHeader className="flex flex-col gap-[8px] text-center">
              <DialogTitle className="text-jukeDark text-[26px] font-extrabold tracking-[-0.5px]">
                Your picks
              </DialogTitle>
              <p className="text-jukeDark/60 text-[16px]">
                Based on <strong className="text-jukeDark capitalize">{activity}</strong> · <strong className="text-jukeDark capitalize">{mood}</strong>
              </p>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {results.map((song, i) => {
                const moodCls = MOOD_PILL[song.mood] ?? "bg-gray-100 text-gray-700"
                return (
                  <div key={song.track_id} className="bg-white rounded-2xl border border-jukeDark/10 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-jukeDark/25 font-bold text-sm w-5 flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-jukeDark font-bold text-sm truncate">{song.title}</p>
                        <p className="text-jukeDark/55 text-xs truncate">{song.artist}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-jukeDark/8 text-jukeDark/60 capitalize">{song.main_genre}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${moodCls}`}>{song.mood}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3 border-t border-jukeDark/8 pt-3">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${song.track_id}?utm_source=generator`}
                        width="100%"
                        height="80"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-xl border-0"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-[14px] rounded-[999px] text-[17px] font-bold
                bg-white border-2 border-jukeDark/20 text-jukeDark
                hover:border-jukeDark transition-all duration-200
                flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} strokeWidth={2} />
              Try Again
            </button>
          </>
        ) : (
        /* ── QUIZ PHASE ─────────────────────────────────────────────────── */
        <>
          <DialogHeader className="flex flex-col gap-[12px] text-center">
            <DialogTitle className="text-jukeDark text-[26px] font-extrabold tracking-[-0.5px]">
              What&apos;s the vibe right now?
            </DialogTitle>
            <p className="text-jukeDark text-[18px] text-center">
              Pick your activity and mood — get 5 song picks
            </p>
          </DialogHeader>

          {/* Activity grid */}
          <div className="flex flex-col gap-[16px]">
            <h3 className="text-jukeDark font-bold text-[18px]">What are you doing?</h3>
            <div className="grid grid-cols-3 gap-[14px]">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setActivity(a.value)}
                  className={`flex flex-col items-center gap-2 py-[18px] rounded-2xl border-2 text-sm font-semibold transition-all duration-150
                    ${activity === a.value
                      ? "bg-jukeDark border-jukeDark text-jukeCream shadow-md"
                      : "bg-white border-jukeDark/20 text-jukeDark hover:border-jukeDark"
                    }`}
                >
                  <a.icon size={28} strokeWidth={2} />
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mood row */}
          <div className="flex flex-col gap-3">
            <h3 className="text-jukeDark font-semibold text-base">How are you feeling?</h3>
            <div className="grid grid-cols-5 gap-[16px]">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center justify-center
                      gap-[8px] h-[96px] rounded-[18px]
                      border-[2px] text-[14px] font-semibold
                      transition-all duration-200
                    ${mood === m.value
                      ? "bg-jukeRed border-jukeRed text-white shadow-[0_8px_20px_rgba(156,75,75,0.35)]"
                      : "bg-white border-jukeDark/20 text-jukeDark hover:border-jukeRed"
                    }`}
                >
                  <m.icon size={22} strokeWidth={2} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={`w-full py-[14px] rounded-[999px] text-[17px] font-bold
              transition-all duration-200 shadow-[0_8px_20px_rgba(0,0,0,0.15)]
              ${canSubmit && !loading
                ? "bg-jukeDark text-jukeCream hover:bg-black"
                : "bg-jukeDark/15 text-jukeDark/30 cursor-not-allowed"
              }`}
          >
            {loading ? "Finding songs…" : "Get My Recommendations"}
          </button>
        </>
        )}

      </DialogContent>
    </Dialog>
  )
}
