import type { HomeResponse, ProfileSummary, RecommendResponse } from "@/lib/types"

// Set NEXT_PUBLIC_API_URL in .env.local (dev) or the Vercel dashboard (prod).
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "")

export async function manualOnboard(payload: {
  user_id: string
  genres: string[]
  energy: string
  mood: string
  vibe: string
  acoustic_preference: string
  tempo: string
  activities: string[]
}): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/manual/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Server responded with ${res.status}`)
  return res.json()
}

export async function getHomeRecommendations(userId: string, topK = 10): Promise<HomeResponse> {
  const res = await fetch(`${API_URL}/recommend/home/${userId}?top_k=${topK}`)
  if (!res.ok) throw new Error(`Server responded with ${res.status}`)
  return res.json()
}

export async function getContextRecommendations(payload: {
  user_id: string
  mood?: string | null
  activity?: string | null
  main_genres?: string[] | null
  genres?: string[] | null
  energy?: string | null
  artist?: string | null
  title?: string | null
  time_of_day?: string | null
  top_k?: number
}, signal?: AbortSignal): Promise<RecommendResponse> {
  const res = await fetch(`${API_URL}/recommend/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) throw new Error(`Server responded with ${res.status}`)
  return res.json()
}

/** Read-only taste summary. Returns null on any failure so callers can just hide the UI. */
export async function getProfile(userId: string): Promise<ProfileSummary | null> {
  try {
    const res = await fetch(`${API_URL}/profile/${encodeURIComponent(userId)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !Array.isArray(data.top_genres)) return null
    return data as ProfileSummary
  } catch {
    return null
  }
}

/**
 * Record a like or skip. Never throws: the UI reacts immediately either way,
 * and a failure is only logged.
 */
export async function sendFeedback(payload: {
  user_id: string
  track_id: string
  action: "like" | "skip"
  time_of_day?: string
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.warn(`[feedback] ${payload.action} not saved: server responded ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.warn(`[feedback] ${payload.action} not saved:`, err)
    return false
  }
}
