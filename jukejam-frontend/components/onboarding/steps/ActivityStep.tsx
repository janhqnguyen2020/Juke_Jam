import { Dumbbell, BookOpen, Bus, Sofa, PartyPopper, Moon } from "lucide-react"

const ACTIVITIES = [
  { label: "Workout", icon: Dumbbell },
  { label: "Study",   icon: BookOpen },
  { label: "Relax",   icon: Sofa },
  { label: "Commute", icon: Bus },
  { label: "Party",   icon: PartyPopper },
  { label: "Sleep",   icon: Moon },
]

interface Props {
  formData: any
  setFormData: (d: any) => void
}

export default function ActivityStep({ formData, setFormData }: Props) {
  const toggle = (label: string) => {
    const selected: string[] = formData.activities
    if (!selected.includes(label) && selected.length >= 3) return
    setFormData({
      ...formData,
      activities: selected.includes(label)
        ? selected.filter((a) => a !== label)
        : [...selected, label],
    })
  }

  return (
    <div className="flex flex-col gap-3">

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
              className={`flex flex-col items-center gap-[12px] py-8 rounded-[28px] border-2 transition-all ${
                active
                  ? "bg-jukeRed border-jukeRed text-white shadow-[0_0_14px_rgba(157,75,75,0.4)]"
                  : "bg-white border-jukeDark/20 text-jukeDark hover:border-jukeRed"
              }`}
            >
              <activity.icon size={48} strokeWidth={1.75} />
              <span className="text-[26px] font-semibold">{activity.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
