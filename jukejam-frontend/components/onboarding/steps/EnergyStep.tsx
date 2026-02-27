interface Props {
  formData: any
  setFormData: (d: any) => void
}

export default function EnergyStep({ formData, setFormData }: Props) {
  const label =
    formData.energy < 0.33 ? "Chill" :
    formData.energy < 0.66 ? "Medium" : "Energetic"

  const pct = Math.round(formData.energy * 100)

  return (
    <div className="flex flex-col gap-3">

      {/* Title + instruction on same line */}
      <div className="flex items-baseline justify-between px-[20px]">
        <h2 className="text-[40px] font-bold text-jukeDark">Energy Preference</h2>
        <p className="text-jukeDark/60 text-[24px]">Use slider to gauge</p>
      </div>

      <hr className="border-jukeRed w-full" />

      <div className="flex flex-col gap-5 mt-2 px-[20px]">
        <div className="flex justify-between items-end">
          <span className="text-jukeDark text-[40px] font-bold">Energy level</span>
          <span className="text-jukeRed font-extrabold text-[32px] leading-none">{pct}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={formData.energy}
          onChange={(e) =>
            setFormData({ ...formData, energy: parseFloat(e.target.value) })
          }
          className="w-[96%] accent-jukeRed h-3 gap-[10px] px-[30px]"
        />

        <div className="flex justify-between text-[24px] px-[20px] gap-[10px] font-semibold text-jukeDark">
          <span>Chill</span>
          <span>Medium</span>
          <span>Energetic</span>
        </div>

        <p className="text-center text-jukeRed font-bold text-[24px]">{label}</p>
      </div>
    </div>
  )
}
