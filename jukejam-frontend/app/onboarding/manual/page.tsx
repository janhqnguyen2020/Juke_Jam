"use client"

import { useState } from "react"
import Image from "next/image"
import GenreStep    from "@/components/onboarding/steps/GenreStep"
import EnergyStep   from "@/components/onboarding/steps/EnergyStep"
import MoodStep     from "@/components/onboarding/steps/MoodStep"
import AcousticStep from "@/components/onboarding/steps/AcousticStep"
import ActivityStep from "@/components/onboarding/steps/ActivityStep"

const TOTAL_STEPS = 5

export default function ManualOnboardingPage() {
  const [step, setStep]         = useState(1)
  const [animKey, setAnimKey]   = useState(0)
  const [slideDir, setSlideDir] = useState<"left" | "right">("left")

  const [formData, setFormData] = useState({
    genres:       [] as string[],
    energy:       0.5,
    mood:         "",
    acousticness: 0.5,
    activities:   [] as string[],
  })

  // Per-step validation — decides if Next glows / is clickable
  const canAdvance = () => {
    switch (step) {
      case 1: return formData.genres.length > 0
      case 3: return formData.mood !== ""
      case 5: return formData.activities.length > 0
      default: return true
    }
  }

  const next = () => {
    if (step < TOTAL_STEPS && canAdvance()) {
      setSlideDir("left")
      setAnimKey((k) => k + 1)
      setStep(step + 1)
    }
  }

  const back = () => {
    if (step > 1) {
      setSlideDir("right")
      setAnimKey((k) => k + 1)
      setStep(step - 1)
    }
  }

  const stepContent = () => {
    switch (step) {
      case 1: return <GenreStep    formData={formData} setFormData={setFormData} />
      case 2: return <EnergyStep   formData={formData} setFormData={setFormData} />
      case 3: return <MoodStep     formData={formData} setFormData={setFormData} />
      case 4: return <AcousticStep formData={formData} setFormData={setFormData} />
      case 5: return <ActivityStep formData={formData} setFormData={setFormData} />
    }
  }

  const nextEnabled  = canAdvance()
  const backEnabled  = step > 1

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

      {/* Relative wrapper — arrows float outside card in cream bg */}
      <div className="relative w-[90vw]">

        {/* Back arrow — left of card, aligned to progress bar */}
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
        <div className="w-full bg-white rounded-[40px] shadow-2xl px-14 py-10 flex flex-col gap-8 overflow-hidden">

          {/* Animated step content */}
          <div
            key={animKey}
            className={`min-h-[360px] ${slideDir === "left" ? "slide-from-right" : "slide-from-left"}`}
          >
            {stepContent()}
          </div>

          {/* Progress bar — full width, no arrows */}
          <div className="flex flex-col gap-2">
            <div className="w-full bg-jukeDark/15 h-[6px] rounded-full overflow-hidden">
              <div
                className="h-full bg-jukeRed rounded-full transition-all duration-500 text-["
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <p className="text-center text-jukeDark text-[26px]">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>

        </div>

        {/* Next arrow — right of card, aligned to progress bar */}
        <button
          onClick={next}
          disabled={!nextEnabled}
          className={`absolute right-[-80px] bottom-[50px] w-[60px] h-[60px] rounded-full text-[30px] flex items-center justify-center transition-all duration-200
            ${nextEnabled
              ? "bg-jukeRed text-white shadow-[0_0_14px_rgba(157,75,75,0.4)] hover:bg-jukeDark"
              : "bg-jukeDark/20 text-white cursor-not-allowed"
            }`}
        >
          {step === TOTAL_STEPS ? "✓" : "›"}
        </button>

      </div>
    </div>
  )
}
