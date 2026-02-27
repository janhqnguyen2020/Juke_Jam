import { SplitScreen } from "@/components/layout/SplitScreen"
import Link from "next/link"
import Image from "next/image"

export default function LandingPage() {
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
              "Music that Knows the Moment"
            </h1>
          </div>
        </div>
      }
  right={
    <div className="flex flex-col items-center justify-center h-full w-full px-10">

      {/* Logo */}
      <Image
        src="/icons/logoTitle.svg"
        alt="JukeJam"
        width={620}
        height={140}
        className="w-[620px] h-auto"
        priority
      />

      {/* Staff */}
      <div className="flex flex-col items-center text-center">
        <h3 className="mt-0 text-[30px] text-jukeCream font-medium leading-tight drop-shadow-lg">
        Recommendations that hit the right note, every time 
        </h3>

        <Image
          src="/icons/musicStaffLanding.svg"
          alt="Person, Task, Time"
          width={620}
          height={320}
          className="w-[620px] h-auto justify-center item-center drop-shadow-lg"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-[40px] mt-[20px]" >
        <Link href="/onboarding">
        <button className="w-[350px] bg-[#ad3d4a] text-white rounded-full py-[20px] text-[30px] font-bold">
          Start Jammin
        </button>
        </Link>

        <Link href="/login">
        <button className="w-[350px] bg-[#ad3d4a] text-white rounded-full py-[20px] text-[30px] font-bold">
          Log In
        </button>
        </Link>
      </div>
    </div>
  }
    />
  )
}
