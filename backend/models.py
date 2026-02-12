"""Pydantic models (API contracts) for JukeJam."""

from typing import Dict, List, Optional
from pydantic import BaseModel


class SearchRequest(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    genres: Optional[List[str]] = None
    mood: Optional[str] = None
    energy: Optional[str] = None
    top_k: int = 20


class RecommendRequest(BaseModel):
    user_id: str
    mood: str                          # "happy" | "sad" | "chill" | "hype"
    activity: Optional[str] = None     # "study" | "workout" | "relax" | "commute"
    top_k: int = 20


class SongResult(BaseModel):
    track_id: str
    title: str
    artist_name: str
    album_name: str
    genre: str
    duration_ms: int
    popularity: int
    mood_bucket: str
    energy_label: str
    mood_label: str
    tempo_label: str
    danceability: float
    energy: float
    valence: float
    score: float
    score_breakdown: Optional[Dict[str, float]] = None
    explanation: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: str
    top_genres: List[str]
    preferred_moods: Dict[str, float]
    avg_energy_preference: float
    listening_time_profile: Dict[str, float]
    skip_rate: float
    platform_mix: Dict[str, float]


class OnboardingRequest(BaseModel):
    user_id: str
    favorite_genres: List[str]        # up to 5
    favorite_artists: List[str]       # up to 5
    vibe_study: str                   # mood bucket
    vibe_workout: str
    vibe_getting_ready: str
    vibe_cleaning: str
