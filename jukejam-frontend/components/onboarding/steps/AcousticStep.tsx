interface Props {
  formData: any
  setFormData: (d: any) => void
}

export default function AcousticStep({ formData, setFormData }: Props) {
  const label =
    formData.acousticness < 0.33 ? "Electronic" :
    formData.acousticness < 0.66 ? "Balanced" : "Acoustic"

  const pct = Math.round(formData.acousticness * 100)

  return (
    <div className="flex flex-col gap-3">

      {/* Title + instruction on same line */}
      <div className="flex items-baseline justify-between px-[20px]">
        <h2 className="text-[40px] font-bold text-jukeDark">Acoustic VS Electronic</h2>
        <p className="text-jukeDark/60 text-[24px]">Use slider to gauge</p>
      </div>

      <hr className="border-jukeRed w-full" />

      <div className="flex flex-col gap-5 mt-2 px-4">
        <div className="flex justify-between items-end">
          <span className="text-jukeDark/50 text-[36px] font-medium py-[10px] px-[20px]">Acousticness level</span>
          <span className="text-jukeRed font-extrabold text-[32px] px-[10px]">{pct}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={formData.acousticness}
          onChange={(e) =>
            setFormData({ ...formData, acousticness: parseFloat(e.target.value) })
          }
          className="w-[96%] accent-jukeRed h-3 gap-[10px] px-[30px]"
        />

        <div className="flex justify-between text-[24px] px-[20px] gap-[10px] font-semibold text-jukeDark">
          <span>Electronic</span>
          <span>Balanced</span>
          <span>Acoustic</span>
        </div>

        <p className="text-center text-jukeRed font-bold text-[24px]">{label}</p>
      </div>
    </div>
  )
}
