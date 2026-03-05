"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SplitScreen } from "@/components/layout/SplitScreen"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [error,    setError]    = useState("")

  const handleLogin = () => {
    const id = username.trim()
    if (!id) {
      setError("Please enter a username.")
      return
    }
    localStorage.setItem("user_id", id)
    router.push("/home")
  }

  return (
    <SplitScreen
      left={
        <div className="relative w-full h-full">
          <Image
            src="/images/recordMain.jpg" alt="Record player"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-[0px] flex items-center justify-center z-[10px] px-[10px]">
            <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-extrabold text-white text-center leading-tight drop-shadow-2xl max-w-[600px]">
              Welcome back to JukeJam
            </h1>
          </div>
        </div>
      }
      right={
        <div className="flex flex-col items-center justify-start pt-16 h-full w-full px-10">

          {/* Logo */}
          <Image
            src="/icons/logoTitle.svg"
            alt="JukeJam"
            width={620}
            height={140}
            className="w-[620px] h-auto"
            priority
          />

          {/* Staff graphic */}
          <div className="flex flex-col items-center text-center">
            <h3 className="mt-0 text-[30px] text-jukeCream font-medium leading-tight drop-shadow-lg">
              Recommendations that hit the right note, every time
            </h3>
            <Image
              src="/icons/musicStaffLanding.svg"
              alt="Person, Task, Time"
              width={620}
              height={320}
              className="w-[620px] h-auto justify-center items-center drop-shadow-lg"
            />
          </div>

          {/* Username form */}
          <div className="flex flex-col gap-[10px] w-full max-w-[700px]">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError("") }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="rounded-full px-[24px] py-5 text-[32px] text-jukeDark bg-jukeCream border-2 border-jukeDark/20 outline-none focus:border-jukeRed placeholder-jukeDark/40 transition-all"
            />
            {error && (
              <p className="text-jukeRed text-sm text-center">{error}</p>
            )}
          </div>

          <div className="flex w-full max-w-[700px] justify-center items-center mt-[10px]">
            <button
              onClick={handleLogin}
              disabled={!username.trim()}
              className="w-[300px] bg-jukeDark hover:bg-black text-jukeCream rounded-full py-[15px] text-[24px] font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Log In
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-jukeCream text-[24px]">
            No account?{" "}
            <a href="http://localhost:8000/spotify/login" className="underline font-bold text-jukeCream hover:text-jukeCream/80">
              Start Jammin
            </a>
          </p>

        </div>
      }
    />
  )
}
