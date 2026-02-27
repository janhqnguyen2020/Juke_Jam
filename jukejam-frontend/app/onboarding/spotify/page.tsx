import Image from "next/image"
import RadioProgress from "@/components/ui/RadioProgress"

export default function SpotifyOnboardingPage() {
  return (
    <div className="min-h-screen bg-jukeCream flex flex-col items-center">

      {/* Centered title banner */}
      <Image
        src="/icons/spotifyOnboard.svg"
        alt="Spotify Onboarding"
        width={3000}
        height={50}
        className="h-[420px] w-auto"
        priority
      />

      {/* Bottom split 50/50 */}
      <div className="flex w-full flex-1">

        {/* Left — description */}
      <div className="w-1/2 flex items-center justify-center px-16">

        <div className="bg-white rounded-[40px] shadow-xl px-12 py-10 max-w-[600px] w-full text-center flex flex-col gap-[10px]">
          <h2 className="text-[48px] font-bold text-jukeDark">
            Connecting to Your Spotify Account
          </h2>

          <hr className="border-jukeRed w-[80%] mx-auto" />

          <p className="text-[#000000] text-[20px] mb-[30px]">
            JukeJam will use your Spotify listening history to personalize
            recommendations based on your taste, activity, and time of day.
          </p>

        </div>

      </div>

        {/* Right — radio progress */}
        <div className="scale-140 w-1/2 flex items-center justify-center">
          <RadioProgress targetProgress={100} />
        </div>

      </div>
    </div>
  )
}
