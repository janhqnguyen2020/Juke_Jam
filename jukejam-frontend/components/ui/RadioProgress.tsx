"use client"

import { useEffect, useState } from "react"

interface RadioProgressProps {
  targetProgress?: number
}

export default function RadioProgress({ targetProgress = 100 }: RadioProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetProgress) {
          clearInterval(interval)
          return targetProgress
        }
        return prev + 1
      })
    }, 30)
    return () => clearInterval(interval)
  }, [targetProgress])

  const radius = 55
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center">

      {/* Radio body */}
      <div className="relative bg-[#ad3d4a] rounded-[36px] w-[380px] shadow-2xl pb-6">

        {/* Antenna */}
        <div
          className="absolute bg-[#e06070] rounded-full"
          style={{
            width: "6px",
            height: "90px",
            top: "-80px",
            left: "48px",
            transform: "rotate(0deg)",
            transformOrigin: "bottom center",
          }}
        />
        

        {/* Front panel — inset with margins */}
        <div className="mx-4 mt-5 bg-[#c4828a] rounded-[20px] px-4 py-3">

          {/* Tuner lines — tapered right to left */}
          <div className="flex flex-col gap-[4px] mb-2">
            <div className="h-[3px] mt-[20px] bg-[#ad3d4a] rounded-full w-full" />
            <div className="h-[3px] bg-[#ad3d4a] rounded-full w-full" />
            <div className="h-[3px] bg-[#ad3d4a] rounded-full w-full" />
          </div>

          {/* Status text */}
          <p className="text-white font-bold text-[36px] text-center">
            {progress < 100 ? "Building profile…" : "Profile ready!"}
          </p>
        </div>

        {/* Bottom dials row */}
        <div className="flex items-center justify-around px-8 pt-4 mb-[10px]">

          {/* Left — circular progress */}
          <div className="relative flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="-rotate-90">
              <circle
                stroke="#7a2030"
                fill="#7a2030"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke="#22c55e"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <span className="absolute text-white font-extrabold text-base leading-none bottom-[20px]">
              {progress}%
            </span>
          </div>

          {/* Right — Spotify dial */}
          <div className="w-[200px] h-[100px] bg-black rounded-full flex flex-col items-center justify-center gap-[7px] bt-[20px]">
            <div className="w-14 h-[5px] bg-[#1DB954] rounded-full" />
            <div className="w-10 h-[5px] bg-[#1DB954] rounded-full" />
            <div className="w-6  h-[5px] bg-[#1DB954] rounded-full" />
          </div>

        </div>

      </div>

    </div>
  )
}
