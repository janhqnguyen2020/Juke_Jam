"""
Manual onboarding for JukeJam (non-Spotify users).

The frontend sends a JSON form with human-friendly selections.
This route maps those selections to the same USER_PROFILE schema
that Spotify OAuth produces.
"""

import json # for mood_bias serialization
from fastapi import APIRouter, HTTPException # for route handling and error responses

from models.user_profile import ManualOnboardRequest
from services.profile_builder import (
    compute_mood_bias, save_profile
)

router = APIRouter()

# --- Mapping tables ----
ENERGY_MAP = {
    "low": 0.30,
    "medium": 0.55,
    "high": 0.80,
}

VIBE_MAP = {
    "dark": 0.30,
    "neutral": 0.50,
    "upbeat": 0.70,
}

ACOUSTIC_MAP = {
    "acoustic": 0.70,
    "mixed": 0.40,
    "electronic": 0.12,
}

TEMPO_MAP = {
    "slow": 0.35,
    "medium": 0.50,
    "fast": 0.68,
}

DANCE_MATRIX = {
    ("low", "dark"): 0.30,
    ("low", "neutral"): 0.35,
    ("low", "upbeat"): 0.45,
    ("medium", "dark"): 0.40,
    ("medium", "neutral"): 0.55,
    ("medium", "upbeat"): 0.65,
    ("high", "dark"): 0.50,
    ("high", "neutral"): 0.60,
    ("high", "upbeat"): 0.78,
}

# ── Route: Manual onboarding ──────────────────────────────────────
@router.post("/onboard")
def onboard(req: ManualOnboardRequest):
    # Validate inputs
    if req.energy not in ENERGY_MAP:
        raise HTTPException(400, f"energy must be one of: {list(ENERGY_MAP.keys())}")
    if req.mood not in ("happy", "sad", "chill", "hype", "focus"):
        raise HTTPException(400, "mood must be one of: happy, sad, chill, hype, focus")
    if req.vibe not in VIBE_MAP:
        raise HTTPException(400, f"vibe must be one of: {list(VIBE_MAP.keys())}")
    if req.acoustic_preference not in ACOUSTIC_MAP:
        raise HTTPException(400, f"acoustic_preference must be one of: {list(ACOUSTIC_MAP.keys())}")
    if req.tempo not in TEMPO_MAP:
        raise HTTPException(400, f"tempo must be one of: {list(TEMPO_MAP.keys())}")
    if not req.genres or len(req.genres) < 1:
        raise HTTPException(400, "Pick at least 1 genre")

    # Map quiz answers to numeric profile fields
    profile = {
        "user_id": req.user_id,
        "top_genres": ",".join(req.genres[:5]),
        "energy_pref": ENERGY_MAP[req.energy],
        "valence_pref": VIBE_MAP[req.vibe],
        "danceability_pref": DANCE_MATRIX.get((req.energy, req.vibe), 0.55),
        "acousticness_pref": ACOUSTIC_MAP[req.acoustic_preference],
        "tempo_pref": TEMPO_MAP[req.tempo],
        "mood_bias": json.dumps(compute_mood_bias(req.mood)),
        "activity_preferences": ",".join(req.activities),
        "onboarding_source": "manual",
    }

    save_profile(profile)

    return {
        "message": f"Profile created for {req.user_id}",
        "profile": profile,
    }