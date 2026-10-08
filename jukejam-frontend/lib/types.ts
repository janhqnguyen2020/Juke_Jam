export interface ScoreDebug {
  tfidf: number
  activity: number | null
  popularity: number
  skip_penalty: number
  novelty_penalty: number
  artist_penalty: number
  genre_penalty: number
}

export interface Song {
  track_id: string
  title: string
  artist: string
  genre: string
  main_genre: string
  mood: string
  energy_label: string
  score: number
  popularity: number
  score_debug?: ScoreDebug
}

export interface HomeResponse {
  user_id: string
  time_of_day: string
  count: number
  recommendations: Song[]
}

export interface RecommendResponse {
  user_id: string
  count: number
  recommendations: Song[]
}

export interface ProfileSummary {
  user_id: string
  top_genres: string[]
  energy_pref: number | null
  energy_label: string | null
  mood_bias: Record<string, number> | null
}
