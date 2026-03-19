interface SplitScreenProps {
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitScreen({ left, right }: SplitScreenProps) {
  return (
    <div className="flex h-[125vh] overflow-hidden">
      {/* LEFT */}
      <div className="relative w-1/3 overflow-hidden">
        {left}
      </div>

      {/* RIGHT */}
      <div className="w-2/3 bg-[#7e2f2f] flex items-center justify-center overflow-y-auto">
        {right}
      </div>
    </div>
  )
}