const MOODS = [
  { label: "Happy",  emoji: "😊" },
  { label: "Sad",    emoji: "😢" },
  { label: "Chill",  emoji: "😌" },
  { label: "Focus",  emoji: "🎯" },
  { label: "Hype",   emoji: "🔥" },
]

interface Props {
  formData: any
  setFormData: (d: any) => void
}

export default function MoodStep({ formData, setFormData }: Props) {
  return (
    <div className="flex flex-col gap-3">

      {/* Title + instruction on same line */}
      <div className="flex items-baseline justify-between px-[20px]">
        <h2 className="text-[40px] font-bold text-jukeDark">Mood Preference</h2>
        <p className="text-jukeDark/60 text-[24px]">Select the mood that best describes you</p>
      </div>

      <hr className="border-jukeRed w-full" />

      <div className="flex flex-wrap justify-center gap-[8px] mt-[10px]">
        {MOODS.map((mood) => {
          const active = formData.mood === mood.label
          return (
            <button
              key={mood.label}
              onClick={() => setFormData({ ...formData, mood: mood.label })}
              className={`flex flex-col items-center gap-4 min-w-[200px] py-8 px-10 rounded-[28px] border-2 transition-all ${
                active
                  ? "bg-jukeRed border-jukeRed text-white shadow-[0_0_24px_rgba(157,75,75,0.4)]"
                  : "bg-white border-jukeDark text-jukeDark hover:border-jukeRed"
              }`}
            >
              <span className="text-8xl">{mood.emoji}</span>
              <span className="text-[26px] font-semibold">{mood.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
