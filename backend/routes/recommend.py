"""
/recommend endpoint for JukeJam.

Accepts a POST with user_id and optional filters.
Calls the recommender service and returns ranked songs.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.recommender import (
    rank_songs,
    VALID_MOODS,
    VALID_ENERGY,
    VALID_TIME_OF_DAY,
    VALID_ACTIVITIES,
)

router = APIRouter()


class RecommendRequest(BaseModel):
    user_id: str

    # Taxonomy filters — use one or both:
    #   genres:      granular genres  e.g. ["indie-pop", "acoustic"]   (114 options)
    #   main_genres: broad categories e.g. ["rock", "pop"]             (12 options)
    genres:      Optional[list[str]] = None
    main_genres: Optional[list[str]] = None

    mood:        Optional[str] = None   # happy | sad | chill | hype | focus
    energy:      Optional[str] = None   # calm | medium | energetic  (or low/high)
    artist:      Optional[str] = None   # partial artist name string
    title:       Optional[str] = None   # partial title string

    time_of_day: Optional[str] = None   # morning | afternoon | evening | night
    activity:    Optional[str] = None   # workout | study | relax | commute | party | sleep

    top_k: int = 10


@router.post("/")
def recommend(req: RecommendRequest):
    # Validate mood
    if req.mood and req.mood not in VALID_MOODS:
        raise HTTPException(400, f"mood must be one of: {sorted(VALID_MOODS)}")

    # Validate energy (allow aliases)
    energy_aliases = {"low", "high"}
    if req.energy and req.energy not in VALID_ENERGY | energy_aliases:
        raise HTTPException(400, f"energy must be one of: {sorted(VALID_ENERGY)}")

    # Validate time_of_day
    if req.time_of_day and req.time_of_day not in VALID_TIME_OF_DAY:
        raise HTTPException(400, f"time_of_day must be one of: {sorted(VALID_TIME_OF_DAY)}")

    # Validate activity
    if req.activity and req.activity not in VALID_ACTIVITIES:
        raise HTTPException(400, f"activity must be one of: {sorted(VALID_ACTIVITIES)}")

    results = rank_songs(
        user_id=req.user_id,
        genres=req.genres,
        main_genres=req.main_genres,
        mood=req.mood,
        energy=req.energy,
        artist=req.artist,
        title=req.title,
        time_of_day=req.time_of_day,
        activity=req.activity,
        top_k=req.top_k,
    )

    return {
        "user_id": req.user_id,
        "count": len(results),
        "recommendations": results,
    }


@router.get("/home/{user_id}")
def home_feed(user_id: str, top_k: int = 10):
    """
    Auto-suggest endpoint — no query required.

    Detects the current hour server-side and maps it to a time_of_day slot.
    rank_songs then uses:
      - User profile top_genres as the candidate pool
      - Time context boosts (genre + mood from listening history)
      - typical_activity inferred from time context (activity audio scoring)
      - User profile personalization (energy_pref, mood_bias)

    Called by the frontend on app open. Returns a personalized home feed
    without the user having to type anything.
    """
    hour = datetime.now().hour
    if 5 <= hour < 12:
        time_of_day = "morning"
    elif 12 <= hour < 17:
        time_of_day = "afternoon"
    elif 17 <= hour < 22:
        time_of_day = "evening"
    else:
        time_of_day = "night"

    results = rank_songs(
        user_id=user_id,
        time_of_day=time_of_day,
        top_k=top_k,
    )

    return {
        "user_id":      user_id,
        "time_of_day":  time_of_day,
        "count":        len(results),
        "recommendations": results,
    }
