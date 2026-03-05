"use client"

import { Sparkles } from "lucide-react"

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
  onOpenQuiz:     () => void
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
    <div className="flex items-center gap-[12px] flex-wrap">
      <span className="text-jukeDark/60 font-bold text-[24px] min-w-[95px] flex-shrink-0">
        {label}
      </span>

      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 rounded-full px-[12px] py-[8px] text-[14px] font-bold border-2 transition-all duration-150
          ${value === null
            ? "bg-jukeRed  text-jukeCream border-jukeRed"
            : "bg-white     text-jukeDark  border-jukeDark/20 hover:border-jukeDark/50"
          }`}
      >
        All
      </button>

      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(active ? null : opt.value)}
            className={`flex-shrink-0 rounded-full px-[20px] py-[8px] text-base font-bold border-2 transition-all duration-150
              ${active
                ? "bg-jukeRed  text-white    border-jukeRed shadow-[0_0_12px_rgba(156,75,75,0.35)]"
                : "bg-white    text-jukeDark border-jukeDark/20 hover:border-jukeRed hover:text-jukeRed"
              }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function FilterBar({ filters, onChange, searchQuery, onSearchChange, onOpenQuiz }: Props) {
  const set = (key: keyof FilterState) => (value: string | null) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="bg-white border-b-[4px] border-jukeRed px-[12px] py-[36px] flex flex-col gap-[12px] backdrop-blur-sm">
      <ChipRow label="Genre"  options={GENRE_OPTIONS}  value={filters.genre}  onSelect={set("genre")}  />
      <ChipRow label="Energy" options={ENERGY_OPTIONS} value={filters.energy} onSelect={set("energy")} />

      {/* Search + Context Quiz row */}
      <div className="flex items-center gap-[10px] mt-[4px]">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-jukeDark/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search artist or song…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[95%] rounded-full px-[24px] py-5 text-[32px] text-jukeDark bg-jukeCream border-2 border-jukeDark/20 outline-none focus:border-jukeRed placeholder-jukeDark/40 transition-all"
          />
        </div>

        {/* Context Quiz button */}
        <button
          onClick={onOpenQuiz}
          className="flex-shrink-0 flex items-center gap-[8px] px-[20px] py-[10px] rounded-full
                     bg-jukeRed text-jukeCream font-bold text-[15px] border-2 border-jukeDark
                     hover:bg-jukeDark transition-all duration-200 shadow-sm"
        >
          <Sparkles size={16} strokeWidth={2} />
          Context Quiz
        </button>
      </div>
    </div>
  )
}
