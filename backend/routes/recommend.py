"""Recommendation endpoints: /recommend and /auto-suggest."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException

import data
from models import RecommendRequest, SongResult
from helpers import track_to_result, mood_to_energy
from musicSearch.music_search import (
    retrieve_candidates,
    rank_candidates_by_features,
    generate_explanation,
    hour_to_timeslot,
    _TIME_DEFAULTS,
)

router = APIRouter()


@router.post("/recommend", response_model=List[SongResult])
def recommend(req: RecommendRequest):
    """
    Context-aware recommendations with two-stage ranking.
    Stage 1: Filter candidates via inverted indexes (mood, energy, genre).
    Stage 2: Rerank using cosine similarity on audio features + user profile signals.
    """
    profile = data.user_profiles.get(req.user_id.lower())
    if not profile:
        profile = {
            "top_genres": [],
            "preferred_moods": {},
            "avg_energy_preference": 0.5,
            "skip_rate": 0.0,
        }

    genres = profile["top_genres"] if profile["top_genres"] else None

    activity_energy = {
        "workout": "energetic",
        "study": "calm",
        "relax": "calm",
        "commute": "medium",
    }
    energy = activity_energy.get(req.activity) if req.activity else mood_to_energy(req.mood)

    candidates = retrieve_candidates(
        indexes=data.indexes,
        genres=genres,
        mood=req.mood,
        energy=energy,
    )

    ranked = rank_candidates_by_features(
        candidates=candidates,
        track_lookup=data.track_lookup,
        user_profile=profile,
        mood=req.mood,
        activity=req.activity,
        top_k=req.top_k,
    )

    results = []
    for tid, score, breakdown in ranked:
        r = track_to_result(tid, score)
        if r:
            song = data.track_lookup.get(tid, {})
            r.score_breakdown = breakdown
            r.explanation = generate_explanation(
                song, breakdown, profile.get("top_genres", []),
                req.mood, req.activity,
            )
            results.append(r)
    return results


@router.get("/auto-suggest/{user_id}")
def auto_suggest(user_id: str, top_k: int = 20):
    """
    Context-aware auto-suggestion based on current time of day and
    the user's historical listening patterns.
    """
    uid = user_id.lower()
    profile = data.user_profiles.get(uid)
    if not profile:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    now = datetime.now()
    timeslot = hour_to_timeslot(now.hour)

    user_ctx = data.time_context_profiles.get(uid, {}).get(timeslot)
    used_history = user_ctx is not None

    if not user_ctx:
        user_ctx = _TIME_DEFAULTS.get(timeslot, {"typical_mood": "chill", "typical_activity": "relax"})

    mood = user_ctx["typical_mood"]
    activity = user_ctx.get("typical_activity")
    genres = user_ctx.get("top_genres") or profile.get("top_genres") or None

    activity_energy = {
        "workout": "energetic",
        "study": "calm",
        "relax": "calm",
        "commute": "medium",
    }
    energy = activity_energy.get(activity) if activity else mood_to_energy(mood)

    candidates = retrieve_candidates(
        indexes=data.indexes,
        genres=genres,
        mood=mood,
        energy=energy,
    )

    ranked = rank_candidates_by_features(
        candidates=candidates,
        track_lookup=data.track_lookup,
        user_profile=profile,
        mood=mood,
        activity=activity,
        top_k=top_k,
    )

    results = []
    for tid, score, breakdown in ranked:
        r = track_to_result(tid, score)
        if r:
            song = data.track_lookup.get(tid, {})
            r.score_breakdown = breakdown
            r.explanation = generate_explanation(
                song, breakdown, profile.get("top_genres", []),
                mood, activity,
            )
            results.append(r)

    confidence = user_ctx.get("confidence", 0.0)

    if used_history:
        reason = (
            f"You usually listen to {mood} music"
            + (f" while {activity}ing" if activity else "")
            + f" in the {timeslot}"
        )
    else:
        reason = f"Suggested for {timeslot} listening"

    return {
        "inferred_context": {
            "time_of_day": timeslot,
            "current_hour": now.hour,
            "suggested_mood": mood,
            "suggested_activity": activity,
            "genres_used": genres,
            "confidence": confidence,
            "based_on_history": used_history,
            "reason": reason,
        },
        "tracks": results,
    }
