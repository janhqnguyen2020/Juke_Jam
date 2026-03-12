"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import GenreStep    from "@/components/onboarding/steps/GenreStep"
import EnergyStep   from "@/components/onboarding/steps/EnergyStep"
import MoodStep     from "@/components/onboarding/steps/MoodStep"
import AcousticStep from "@/components/onboarding/steps/AcousticStep"
import ActivityStep from "@/components/onboarding/steps/ActivityStep"
import { manualOnboard } from "@/lib/api"

// Step 0 = username, Steps 1-5 = existing preference steps
const TOTAL_STEPS = 6

// Map float slider values to backend string enums
function energyLabel(v: number): "low" | "medium" | "high" {
  return v < 0.33 ? "low" : v < 0.66 ? "medium" : "high"
}
function acousticLabel(v: number): "acoustic" | "mixed" | "electronic" {
  return v > 0.55 ? "acoustic" : v < 0.30 ? "electronic" : "mixed"
}
function vibeFromMood(mood: string): "dark" | "neutral" | "upbeat" {
  if (mood === "happy" || mood === "hype") return "upbeat"
  if (mood === "sad") return "dark"
  return "neutral"
}

export default function ManualOnboardingPage() {
  const router = useRouter()

  const [step,      setStep]      = useState(0)
  const [animKey,   setAnimKey]   = useState(0)
  const [slideDir,  setSlideDir]  = useState<"left" | "right">("left")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const [username, setUsername] = useState("")

  const [formData, setFormData] = useState({
    genres:       [] as string[],
    energy:       0.5,
    mood:         "",
    acousticness: 0.5,
    activities:   [] as string[],
  })

  // Per-step validation
  const canAdvance = () => {
    switch (step) {
      case 0: return username.trim().length > 0
      case 1: return formData.genres.length > 0
      case 3: return formData.mood !== ""
      case 5: return formData.activities.length > 0
      default: return true
    }
  }

  const next = async () => {
    if (!canAdvance()) return

    if (step === TOTAL_STEPS - 1) {
      // Final step — submit to backend
      setSubmitting(true)
      setSubmitError("")
      try {
        const uid = username.trim()
        await manualOnboard({
          user_id:              uid,
          genres:               formData.genres,
          energy:               energyLabel(formData.energy),
          mood:                 formData.mood.toLowerCase(),
          vibe:                 vibeFromMood(formData.mood.toLowerCase()),
          acoustic_preference:  acousticLabel(formData.acousticness),
          tempo:                "medium",
          activities:           formData.activities,
        })
        localStorage.setItem("user_id", uid)
        router.push("/home")
      } catch {
        setSubmitError("Could not save profile. Make sure FastAPI is running on port 8000.")
        setSubmitting(false)
      }
      return
    }

    setSlideDir("left")
    setAnimKey((k) => k + 1)
    setStep(step + 1)
  }

  const back = () => {
    if (step > 0) {
      setSlideDir("right")
      setAnimKey((k) => k + 1)
      setStep(step - 1)
    }
  }

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col gap-6 px-[20px]">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[48px] font-bold text-jukeDark">Create a Username:</h2>
            </div>
            <hr className="border-jukeRed w-full" />
            <div className="flex flex-col gap-[1px]">
              
              <input
                type="text"
                placeholder="e.g. CatsMeow"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAdvance() && next()}
                className="rounded-full px-[24px] py-5 text-[32px] text-jukeDark bg-jukeCream border-2 border-jukeDark/20 outline-none focus:border-jukeRed placeholder-jukeDark/40 transition-all"
              />
              <p className="text-jukeDark/70 text-[18px]">
                This will be your profile ID for recommendations.
              </p>
            </div>
          </div>
        )
      case 1: return <GenreStep    formData={formData} setFormData={setFormData} />
      case 2: return <EnergyStep   formData={formData} setFormData={setFormData} />
      case 3: return <MoodStep     formData={formData} setFormData={setFormData} />
      case 4: return <AcousticStep formData={formData} setFormData={setFormData} />
      case 5: return <ActivityStep formData={formData} setFormData={setFormData} />
    }
  }

  const nextEnabled = canAdvance()
  const backEnabled = step > 0
  const isFinalStep = step === TOTAL_STEPS - 1

  return (
    <div className="min-h-screen bg-jukeCream flex flex-col items-center">

      {/* Header banner */}
      <Image
        src="/icons/manualOnboard.svg"
        alt="Manual Onboarding"
        width={3000}
        height={50}
        className="h-[420px] w-auto"
        priority
      />

      {/* Relative wrapper — arrows float outside card */}
      <div className="relative w-[90vw]">

        {/* Back arrow */}
        <button
          onClick={back}
          disabled={!backEnabled}
          className={`absolute left-[-80px] bottom-[50px] w-[60px] h-[60px] rounded-full border-2 text-[30px] flex items-center justify-center transition-all duration-200
            ${backEnabled
              ? "border-jukeRed text-jukeRed shadow-[0_0_14px_rgba(157,75,75,0.4)] hover:bg-jukeRed hover:text-white"
              : "border-jukeDark/20 text-jukeDark/20 cursor-not-allowed"
            }`}
        >
          ‹
        </button>

        {/* White card */}
        <div className="w-full bg-white rounded-[40px] shadow-2xl px-14 flex flex-col gap-8 overflow-hidden">

          {/* Animated step content */}
          <div
            key={animKey}
            className={`min-h-[360px] ${slideDir === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            {stepContent()}
          </div>

          {/* Submit error */}
          {submitError && (
            <p className="text-jukeRed text-center text-[18px]">{submitError}</p>
          )}

          {/* Progress bar */}
          <div className="flex flex-col gap-2">
            <div className="w-[80%] mx-auto bg-jukeDark/15 h-[12px] rounded-full overflow-hidden">
              <div
                className="h-full bg-jukeRed rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <p className="text-center text-jukeDark text-[26px]">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
          </div>

        </div>

        {/* Next / Submit arrow */}
        <button
          onClick={next}
          disabled={!nextEnabled || submitting}
          className={`absolute right-[-80px] bottom-[50px] w-[60px] h-[60px] rounded-full text-[30px] flex items-center justify-center transition-all duration-200
            ${nextEnabled && !submitting
              ? "bg-jukeRed text-white shadow-[0_0_14px_rgba(157,75,75,0.4)] hover:bg-jukeDark"
              : "bg-jukeDark/20 text-white cursor-not-allowed"
            }`}
        >
          {submitting ? "…" : isFinalStep ? "✓" : "›"}
        </button>

      </div>
    </div>
  )
}
