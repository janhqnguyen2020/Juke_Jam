import Image from "next/image"
import Link from "next/link"

const MOCK_SONGS = [
  { title: "Blinding Lights", artist: "The Weeknd", genre: "Pop", mood: "Hype", score: 0.97 },
  { title: "HUMBLE.", artist: "Kendrick Lamar", genre: "Hip-Hop", mood: "Hype", score: 0.94 },
  { title: "Levitating", artist: "Dua Lipa", genre: "Pop", mood: "Happy", score: 0.91 },
  { title: "Redbone", artist: "Childish Gambino", genre: "R&B", mood: "Chill", score: 0.89 },
  { title: "good 4 u", artist: "Olivia Rodrigo", genre: "Pop", mood: "Hype", score: 0.87 },
  { title: "Heat Waves", artist: "Glass Animals", genre: "Indie", mood: "Chill", score: 0.85 },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-jukeCream flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 bg-jukeDark">
        <Image
          src="/icons/logoTitle.svg"
          alt="JukeJam"
          width={140}
          height={56}
          className="h-[44px] w-auto"
        />
        <div className="flex items-center gap-4">
          <Link href="/quiz">
            <button className="border border-jukeCream/50 text-jukeCream hover:bg-jukeCream hover:text-jukeDark rounded-full px-5 py-2 text-sm font-medium transition-all">
              New Context
            </button>
          </Link>
          <div className="w-9 h-9 rounded-full bg-jukeCream/20 flex items-center justify-center text-jukeCream text-sm font-bold">
            U
          </div>
        </div>
      </nav>

      {/* Context banner */}
      <div className="bg-jukeRed/20 border-b border-jukeRed/30 px-8 py-3 flex items-center gap-3">
        <span className="text-jukeDark text-sm font-medium">
          🎯 Right now: <strong>Working Out</strong> · <strong>Hype mood</strong> · Evening
        </span>
        <Link href="/quiz" className="text-jukeDark/60 text-xs underline hover:text-jukeDark ml-2">change</Link>
      </div>

      {/* Feed */}
      <main className="flex-1 px-8 py-8 max-w-[900px] mx-auto w-full">
        <h2 className="text-2xl font-bold text-jukeDark mb-6">Your Recommendations</h2>

        <div className="flex flex-col gap-3">
          {MOCK_SONGS.map((song, i) => (
            <div
              key={song.title}
              className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-5">
                <span className="text-jukeDark/30 font-bold text-lg w-5 text-center">{i + 1}</span>
                <div className="w-11 h-11 rounded-xl bg-jukeDark/10 flex items-center justify-center text-xl">
                  🎵
                </div>
                <div>
                  <p className="font-semibold text-jukeDark text-base">{song.title}</p>
                  <p className="text-jukeDark/60 text-sm">{song.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-jukeCream border border-jukeDark/20 text-jukeDark px-3 py-1 rounded-full font-medium">
                  {song.genre}
                </span>
                <span className="text-xs bg-jukeRed/10 text-jukeRed px-3 py-1 rounded-full font-medium">
                  {song.mood}
                </span>
                <span className="text-jukeDark/40 text-sm font-mono w-12 text-right">
                  {(song.score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
