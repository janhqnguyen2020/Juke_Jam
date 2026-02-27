import Link from "next/link"
import Image from "next/image"

const ACTIVITIES = [
  { label: "Working Out", emoji: "💪" },
  { label: "Studying", emoji: "📚" },
  { label: "Commuting", emoji: "🚌" },
  { label: "Relaxing", emoji: "🛋️" },
  { label: "Party", emoji: "🎉" },
  { label: "Sleeping", emoji: "😴" },
]

const MOODS = [
  { label: "Happy", emoji: "😊" },
  { label: "Chill", emoji: "😌" },
  { label: "Hype", emoji: "🔥" },
  { label: "Sad", emoji: "😢" },
  { label: "Focus", emoji: "🎯" },
]

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-jukeCream flex flex-col items-center px-8 py-10 gap-8">

      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <Image
          src="/icons/logoTitle.svg"
          alt="JukeJam"
          width={180}
          height={70}
          className="h-[60px] w-auto"
          priority
        />
        <h1 className="text-2xl font-bold text-jukeDark mt-2">What&apos;s the vibe right now?</h1>
        <p className="text-jukeDark/60 text-sm">Tell us about this moment</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={`h-2 rounded-full transition-all ${n === 1 ? "w-8 bg-jukeDark" : "w-2 bg-jukeDark/30"}`}
          />
        ))}
      </div>

      {/* Activity */}
      <div className="flex flex-col items-center gap-4 w-full max-w-[520px]">
        <h2 className="text-xl font-bold text-jukeDark">What are you doing?</h2>
        <div className="grid grid-cols-3 gap-3 w-full">
          {ACTIVITIES.map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-2 bg-white border-2 border-jukeDark/20 hover:border-jukeDark hover:bg-jukeDark hover:text-jukeCream text-jukeDark rounded-2xl px-4 py-5 text-sm font-semibold transition-all duration-150"
            >
              <span className="text-3xl">{a.emoji}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current mood */}
      <div className="flex flex-col items-center gap-4 w-full max-w-[520px]">
        <h2 className="text-xl font-bold text-jukeDark">How are you feeling?</h2>
        <div className="flex gap-4 flex-wrap justify-center">
          {MOODS.map((mood) => (
            <button
              key={mood.label}
              className="flex flex-col items-center gap-1 bg-white border-2 border-jukeDark/20 hover:border-jukeDark hover:bg-jukeDark hover:text-jukeCream text-jukeDark rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-150 min-w-[80px]"
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span>{mood.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 mt-2">
        <Link href="/onboarding/manual">
          <button className="border-2 border-jukeDark text-jukeDark hover:bg-jukeDark hover:text-jukeCream rounded-full px-8 py-3 font-semibold transition-all">
            Back
          </button>
        </Link>
        <Link href="/home">
          <button className="bg-jukeDark text-jukeCream hover:bg-black rounded-full px-10 py-3 text-lg font-semibold transition-all">
            Get My Recommendations
          </button>
        </Link>
      </div>

    </div>
  )
}
