import type { HomeResponse, RecommendResponse } from "@/lib/types"

const BASE_URL = "http://localhost:8000"

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
  const res = await fetch(`${BASE_URL}/manual/onboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Server responded with ${res.status}`)
  return res.json()
}

export async function getHomeRecommendations(userId: string, topK = 10): Promise<HomeResponse> {
  const res = await fetch(`${BASE_URL}/recommend/home/${userId}?top_k=${topK}`)
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
  const res = await fetch(`${BASE_URL}/recommend/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) throw new Error(`Server responded with ${res.status}`)
  return res.json()
}
