import { SplitScreen } from "@/components/layout/SplitScreen"
import Link from "next/link"
import Image from "next/image"

export default function LoginPage() {
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
                    className="w-[620px] h-auto justify-center items-center drop-shadow-lg"
                  />
                </div>

          {/* Form */}
          <div className="flex flex-col gap-[10px] w-full max-w-[700px]">
            <input
              type="text"
              placeholder="  Username"
              className="w-full rounded-full px-6 py-[20px] text-jukeDark bg-jukeCream placeholder-jukeDark/[50px] outline-none text-base"
            />
            <input
              type="password"
              placeholder="   Password"
              className="w-full rounded-full px-6 py-[20px] text-jukeDark bg-jukeCream placeholder-jukeDark/[50px] outline-none text-base"
            />
          </div>

          <div className="flex w-full max-w-[700px] justify-center items-center mt-[10px]">
            <button className="w-[300px] bg-jukeDark hover:bg-black text-jukeCream rounded-full py-[15px] text-[24px] font-bold transition-all duration-200">
              Log In
            </button>
          </div>

          {/* Footer link */}
          <p className="w-[350px] bg-jukeDark hover:bg-black text-jukeCream rounded-full py-[20px] text-[30px] font-bold">
            No account?{" "}
            <Link href="/onboarding/spotify" className="underline text-jukeDark font-medium">
              Start Jammin
            </Link>
          </p>

        </div>
      }
    />
  )
}
