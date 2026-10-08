"use client"

import { Check, Search } from "lucide-react"

export interface FilterState {
  genre:  string | null
  energy: string | null
}

const GENRE_OPTIONS = [
  { label: "Pop",        value: "pop"        },
  { label: "Rock",       value: "rock"       },
  { label: "Hip-Hop",    value: "hip-hop"    },
  { label: "Electronic", value: "electronic" },
  { label: "Latin",      value: "latin"      },
  { label: "Metal",      value: "metal"      },
  { label: "Country",    value: "country"    },
  { label: "Jazz",       value: "jazz"       },
  { label: "Classical",  value: "classical"  },
  { label: "World",      value: "world"      },
]

const ENERGY_OPTIONS = [
  { label: "Calm",      value: "calm"      },
  { label: "Medium",    value: "medium"    },
  { label: "Energetic", value: "energetic" },
]

interface Props {
  filters:        FilterState
  onChange:       (f: FilterState) => void
  searchQuery:    string
  onSearchChange: (v: string) => void
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-[6px] rounded-full border px-[16px] py-[6px] text-[16px] font-[600] transition-colors
        ${active
          ? "border-jj-primary bg-jj-primary text-jj-paper"
          : "border-jj-border bg-jj-paper text-jj-text hover:border-jj-accent hover:bg-jj-cream"
        }`}
    >
      {active && <Check className="h-[16px] w-[16px]" strokeWidth={3} />}
      {children}
    </button>
  )
}

function ChipRow({
  label,
  options,
  value,
  onSelect,
}: {
  label:    string
  options:  { label: string; value: string }[]
  value:    string | null
  onSelect: (v: string | null) => void
}) {
  return (
    <div className="flex flex-col gap-[8px] tablet:flex-row tablet:items-start tablet:gap-[16px]">
      <span className="w-[80px] shrink-0 pt-[6px] text-[16px] font-[700] text-jj-muted">{label}</span>
      <div className="flex flex-wrap gap-[8px]">
        <Chip active={value === null} onClick={() => onSelect(null)}>All</Chip>
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <Chip key={opt.value} active={active} onClick={() => onSelect(active ? null : opt.value)}>
              {opt.label}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

export default function FilterBar({ filters, onChange, searchQuery, onSearchChange }: Props) {
  const set = (key: keyof FilterState) => (value: string | null) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-col gap-[16px]">
      <ChipRow label="Genre"  options={GENRE_OPTIONS}  value={filters.genre}  onSelect={set("genre")}  />
      <ChipRow label="Energy" options={ENERGY_OPTIONS} value={filters.energy} onSelect={set("energy")} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-[16px] top-1/2 h-[20px] w-[20px] -translate-y-1/2 text-jj-muted" />
        <input
          type="text"
          placeholder="Search artist or song…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-full border border-jj-border bg-white/70 py-[12px] pl-[48px] pr-[20px] text-[18px] text-jj-text outline-none transition-colors placeholder:text-jj-muted focus:border-jj-primary"
        />
      </div>
    </div>
  )
}
