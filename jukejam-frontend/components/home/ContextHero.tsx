"use client"

import { Sunrise, Sun, Sunset, Moon, Sparkles, X } from "lucide-react"
import type { ProfileSummary } from "@/lib/types"
import { timeSlotFromHour, type TimeSlot } from "@/lib/time"
import { Panel, Pill } from "@/components/ui/panel"

const SLOT_ICON: Record<TimeSlot, React.ElementType> = {
  morning: Sunrise, afternoon: Sun, evening: Sunset, night: Moon,
}

export interface Selections {
  genre: string | null
  energy: string | null
  mood: string | null
  activity: string | null
}

interface Props {
  now: Date | null
  profile: ProfileSummary | null
  selections: Selections
  onOpenContext: () => void
  onClearContext: () => void
}

export default function ContextHero({ now, profile, selections, onOpenContext, onClearContext }: Props) {
  const slot = now ? timeSlotFromHour(now.getHours()) : null
  const SlotIcon = slot ? SLOT_ICON[slot] : Sun
  const time = now?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) ?? "--:--"
  const date = now?.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) ?? ""

  const tasteGenres = (profile?.top_genres ?? []).slice(0, 3)
  const tasteParts = [...tasteGenres, profile?.energy_label ? `${profile.energy_label} energy` : null].filter(Boolean)

  const picked: { label: string; value: string }[] = []
  if (selections.mood)     picked.push({ label: "Mood",     value: selections.mood })
  if (selections.activity) picked.push({ label: "Activity", value: selections.activity })
  if (selections.genre)    picked.push({ label: "Genre",    value: selections.genre })
  if (selections.energy)   picked.push({ label: "Energy",   value: selections.energy })
  const hasContext = Boolean(selections.mood || selections.activity)

  return (
    <Panel
      id="time"
      title="Right now"
      icon={<SlotIcon className="h-[24px] w-[24px] shrink-0" strokeWidth={2} />}
      action={slot ? <Pill strong>{slot}</Pill> : null}
      className="flex flex-col"
    >
      <p className="text-[48px] font-[900] tabular-nums tracking-[-0.025em] text-jj-text" suppressHydrationWarning>{time}</p>
      <p className="mt-[4px] text-[18px] font-[600] text-jj-muted" suppressHydrationWarning>{date}</p>

      <p className="mt-[20px] text-[18px] text-jj-text">Picked for your current context and taste profile.</p>

      {tasteParts.length > 0 && (
        <p className="mt-[8px] text-[16px] text-jj-muted">
          <span className="font-[600] text-jj-text">Your taste:</span> {tasteParts.join(" · ")}
        </p>
      )}

      <div className="mt-[20px] border-t border-jj-border pt-[20px]">
        <p className="mb-[8px] text-[14px] font-[700] uppercase tracking-[0.05em] text-jj-muted">Your selections</p>
        {picked.length > 0 ? (
          <div className="flex flex-wrap gap-[8px]">
            {picked.map((p) => (
              <Pill key={p.label}>
                <span className="mr-[4px] font-[400] normal-case text-jj-muted">{p.label}:</span>
                {p.value}
              </Pill>
            ))}
          </div>
        ) : (
          <p className="text-[16px] text-jj-muted">None yet. Your feed uses your taste profile and the time of day.</p>
        )}

        <div className="mt-[16px] flex flex-wrap items-center gap-[12px]">
          <button
            onClick={onOpenContext}
            className="inline-flex items-center gap-[8px] rounded-full bg-jj-primary px-[20px] py-[8px] text-[16px] font-[700] text-jj-paper transition-colors hover:bg-jj-dark"
          >
            <Sparkles className="h-[16px] w-[16px]" strokeWidth={2} />
            {hasContext ? "Change mood & activity" : "Set mood & activity"}
          </button>
          {hasContext && (
            <button
              onClick={onClearContext}
              className="inline-flex items-center gap-[4px] text-[16px] font-[600] text-jj-muted hover:text-jj-primary"
            >
              <X className="h-[16px] w-[16px]" /> Clear
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}
