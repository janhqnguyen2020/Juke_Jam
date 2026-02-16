from pydantic import BaseModel # For data validation and serialization
from typing import List, Dict, Optional # For type annotations


class ManualOnboardRequest(BaseModel):
    user_id: str
    genres: List[str]                          # pick 3-5 genres
    energy: str = "medium"                     # low / medium / high
    mood: str = "focus"                        # happy / sad / chill / hype / focus
    vibe: str = "neutral"                      # dark / neutral / upbeat
    acoustic_preference: str = "mixed"         # acoustic / mixed / electronic
    tempo: str = "medium"                      # slow / medium / fast
    activities: Optional[List[str]] = []       # study, commute, workout, relax, party, sleep


class ActivityUpdateRequest(BaseModel):
    user_id: str
    activities: List[str]                      # study, commute, workout, relax, party, sleep


class UserProfile(BaseModel):
    user_id: str
    top_genres: str
    energy_pref: float
    valence_pref: float
    danceability_pref: float
    acousticness_pref: float
    tempo_pref: float
    mood_bias: str                             # JSON string
    activity_preferences: str
    onboarding_source: str
