"""User profile endpoints."""

from typing import List

from fastapi import APIRouter, HTTPException

import data
from models import UserProfileResponse, OnboardingRequest

router = APIRouter()


@router.get("/user/{user_id}", response_model=UserProfileResponse)
def get_user_profile(user_id: str):
    """Get a user's aggregated profile."""
    profile = data.user_profiles.get(user_id.lower())
    if not profile:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")
    return UserProfileResponse(**profile)


@router.get("/users", response_model=List[str])
def list_users():
    """List all known user IDs."""
    return [p["user_id"] for p in data.user_profiles.values()]


@router.post("/user/onboarding")
def onboarding(req: OnboardingRequest):
    """
    Save a new user's onboarding preferences.
    In production this would write to a database. For demo, stores in memory.
    """
    data.user_profiles[req.user_id.lower()] = {
        "user_id": req.user_id,
        "top_genres": req.favorite_genres[:5],
        "preferred_moods": {
            "happy": 0.25,
            "chill": 0.25,
            "hype": 0.25,
            "sad": 0.25,
        },
        "avg_energy_preference": 0.5,
        "listening_time_profile": {
            "morning": 0.33,
            "afternoon": 0.34,
            "night": 0.33,
        },
        "skip_rate": 0.0,
        "platform_mix": {"mobile": 1.0},
    }
    return {"status": "ok", "user_id": req.user_id}
