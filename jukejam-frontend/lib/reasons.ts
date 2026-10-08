import type { Song } from "@/lib/types"

/** Spotify popularity (0–100) at or above which we call a track "popular". */
export const POPULAR_THRESHOLD = 70

/** What the request and the user's profile actually asked for. Leave a field out when it wasn't part of the request. */
export interface ReasonContext {
  mood?: string | null            // mood sent with the request
  activity?: string | null        // activity sent with the request
  energy?: string | null          // energy filter sent with the request
  profileEnergy?: string | null   // energy label derived from the user's profile
  genres?: (string | null | undefined)[]  // selected genre + profile top genres
}

export interface Reason {
  text: string
  positive: boolean
}

const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "")

/** Plain-language reasons. Each one is added only when its condition is really true for this song. */
export function getReasons(song: Song, ctx: ReasonContext): Reason[] {
  const out: Reason[] = []
  const dbg = song.score_debug
  const mood = norm(song.mood)
  const energy = norm(song.energy_label)

  if (ctx.mood && mood && mood === norm(ctx.mood)) {
    out.push({ text: `Matches your selected mood (${ctx.mood})`, positive: true })
  }

  if (ctx.energy && energy && energy === norm(ctx.energy)) {
    out.push({ text: `Fits your selected energy (${ctx.energy})`, positive: true })
  } else if (!ctx.energy && ctx.profileEnergy && energy && energy === norm(ctx.profileEnergy)) {
    out.push({ text: `Fits your usual energy level (${ctx.profileEnergy})`, positive: true })
  }

  const wanted = new Set((ctx.genres ?? []).map(norm).filter(Boolean))
  const songGenres = [norm(song.genre), norm(song.main_genre)].filter(Boolean)
  const hit = songGenres.find((g) => wanted.has(g))
  if (hit) {
    out.push({ text: `In a genre you listen to (${hit.replace(/-/g, " ")})`, positive: true })
  }

  if (ctx.activity && dbg && typeof dbg.activity === "number") {
    out.push({
      text: `Sound fits your activity (${ctx.activity}): ${Math.round(dbg.activity * 100)}% audio match`,
      positive: true,
    })
  }

  if (typeof song.popularity === "number" && song.popularity >= POPULAR_THRESHOLD) {
    out.push({ text: "Popular track", positive: true })
  }

  if (out.length === 0) {
    out.push({ text: "Strong overall match for your request and taste profile", positive: true })
  }

  if (dbg) {
    if (dbg.skip_penalty < 0)    out.push({ text: "Ranked lower because you skipped it before", positive: false })
    if (dbg.novelty_penalty < 0) out.push({ text: "Ranked a little lower because you've played it a lot lately", positive: false })
    if (dbg.artist_penalty < 0)  out.push({ text: "Ranked a little lower to vary artists", positive: false })
    if (dbg.genre_penalty < 0)   out.push({ text: "Ranked a little lower to vary genres", positive: false })
  }

  return out
}
