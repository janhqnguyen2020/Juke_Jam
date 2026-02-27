const GENRES = [
  "Rock", "Pop", "Hip-Hop", "R&B",
  "Jazz", "Classical", "Electronic", "Country",
  "Latin", "Metal", "Indie", "Soul",
]

interface Props {
  formData: any
  setFormData: (d: any) => void
}

export default function GenreStep({ formData, setFormData }: Props) {
  const toggle = (genre: string) => {
    const selected: string[] = formData.genres
    if (!selected.includes(genre) && selected.length >= 5) return
    setFormData({
      ...formData,
      genres: selected.includes(genre)
        ? selected.filter((g) => g !== genre)
        : [...selected, genre],
    })
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Title + instruction on same line */}
      <div className="flex items-baseline justify-between px-[20px]">
        <h2 className="text-[40px] font-bold text-jukeDark">Genre Selection</h2>
        <p className="text-jukeDark text-[24px]">Select at most 5</p>
      </div>

      <hr className="border-jukeRed w-full" />

      <div className="grid grid-cols-3 gap-[5px] mt-[5px] px-[20px]">
        {GENRES.map((genre) => {
          const active = formData.genres.includes(genre)
          return (
            <button
              key={genre}
              onClick={() => toggle(genre)}
              className={`rounded-full py-4 px-6 text-[26px] font-semibold border-2 transition-all ${
                active
                  ? "bg-jukeRed border-jukeRed text-white shadow-[0_0_24px_rgba(157,75,75,0.4)]"
                  : "bg-white border-jukeDark text-jukeDark hover:border-jukeRed hover:text-jukeRed"
              }`}
            >
              {genre}
            </button>
          )
        })}
      </div>
    </div>
  )
}
