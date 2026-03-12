import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jukeRed: "#9C4B4B",
        jukeDark: "#6A2C2C",
        jukeCream: "#F4EBD0",
      },
    },
  },
  plugins: [],
}

export default config