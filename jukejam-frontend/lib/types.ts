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
