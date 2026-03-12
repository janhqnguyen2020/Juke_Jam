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
