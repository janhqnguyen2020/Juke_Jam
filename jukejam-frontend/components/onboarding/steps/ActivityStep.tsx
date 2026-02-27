const ACTIVITIES = [
  { label: "Workout",  icon: "🏋️" },
  { label: "Study",    icon: "📚" },
  { label: "Relax",    icon: "🛋️" },
  { label: "Commute",  icon: "🚌" },
  { label: "Party",    icon: "🎉" },
  { label: "Sleep",    icon: "😴" },
]

interface Props {
  formData: any
  setFormData: (d: any) => void
}

export default function ActivityStep({ formData, setFormData }: Props) {
  const toggle = (activity: string) => {
    const selected: string[] = formData.activities
    if (!selected.includes(activity) && selected.length >= 3) return
    setFormData({
      ...formData,
      activities: selected.includes(activity)
        ? selected.filter((a) => a !== activity)
        : [...selected, activity],
    })
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Title + instruction on same line */}
      <div className="flex items-baseline justify-between px-[20px]">
        <h2 className="text-[40px] font-bold text-jukeDark">Activities Selection</h2>
        <p className="text-jukeDark/60 text-[24px]">Select at most 3</p>
      </div>

      <hr className="border-jukeRed w-full" />

      <div className="grid grid-cols-3 gap-[8px] mt-2 max-w-[700px] mx-auto w-full">
        {ACTIVITIES.map((activity) => {
          const active = formData.activities.includes(activity.label)
          return (
            <button
              key={activity.label}
              onClick={() => toggle(activity.label)}
              className={`flex flex-col items-center gap-[8px] py-8 rounded-[28px] border-2 transition-all ${
                active
                  ? "bg-jukeRed border-jukeRed text-white shadow-[0_0_14px_rgba(157,75,75,0.4)]"
                  : "bg-white border-jukeDark/20 text-jukeDark hover:border-jukeRed"
              }`}
            >
              <span className="text-8xl">{activity.icon}</span>
              <span className="text-[26px] font-semibold">{activity.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
