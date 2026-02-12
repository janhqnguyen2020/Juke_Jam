"""Evaluation endpoints: precision metrics and context-shift demo."""

from fastapi import APIRouter

import data
from helpers import mood_to_energy
from musicSearch.music_search import (
    retrieve_candidates,
    rank_candidates_by_features,
)

router = APIRouter()


@router.get("/evaluate")
def evaluate():
    """
    Run automated evaluation queries and report precision metrics.
    Tests whether the ranking system returns contextually appropriate songs.
    """
    test_uid = next(iter(data.user_profiles), None)
    if not test_uid:
        return {"error": "No user profiles loaded"}
    profile = data.user_profiles[test_uid]

    test_cases = [
        {"mood": "hype",  "activity": "workout", "expect_energy": "energetic", "expect_mood": "hype"},
        {"mood": "chill", "activity": "relax",   "expect_energy": "calm",      "expect_mood": "chill"},
        {"mood": "sad",   "activity": None,       "expect_energy": "calm",      "expect_mood": "sad"},
        {"mood": "happy", "activity": "commute",  "expect_energy": "medium",    "expect_mood": "happy"},
        {"mood": "focus", "activity": "study",    "expect_energy": "calm",      "expect_mood": "focus"},
    ]

    k = 10
    results = []

    for tc in test_cases:
        genres = profile["top_genres"] if profile.get("top_genres") else None
        activity_energy = {"workout": "energetic", "study": "calm", "relax": "calm", "commute": "medium"}
        energy = activity_energy.get(tc["activity"]) if tc["activity"] else mood_to_energy(tc["mood"])

        candidates = retrieve_candidates(
            indexes=data.indexes,
            genres=genres,
            mood=tc["mood"],
            energy=energy,
        )

        ranked = rank_candidates_by_features(
            candidates=candidates,
            track_lookup=data.track_lookup,
            user_profile=profile,
            mood=tc["mood"],
            activity=tc["activity"],
            top_k=k,
        )

        mood_hits = 0
        energy_hits = 0
        avg_score = 0.0
        top_songs = []

        for tid, score, breakdown in ranked:
            song = data.track_lookup.get(tid, {})
            if song.get("mood_bucket", "") == tc["expect_mood"]:
                mood_hits += 1
            if song.get("energy_label", "") == tc["expect_energy"]:
                energy_hits += 1
            avg_score += score
            top_songs.append({
                "title": song.get("title", "?"),
                "artist": song.get("artist_name", "?"),
                "energy": float(song.get("energy", 0)),
                "valence": float(song.get("valence", 0)),
                "mood_bucket": song.get("mood_bucket", "?"),
                "score": round(score, 4),
            })

        n = len(ranked)
        results.append({
            "query": f"mood={tc['mood']}, activity={tc['activity']}",
            "candidates_found": len(candidates),
            "top_k": n,
            "mood_precision_at_k": round(mood_hits / n, 2) if n else 0,
            "energy_precision_at_k": round(energy_hits / n, 2) if n else 0,
            "avg_score": round(avg_score / n, 4) if n else 0,
            "top_3": top_songs[:3],
        })

    return {
        "user_id": profile.get("user_id", test_uid),
        "user_top_genres": profile.get("top_genres", []),
        "evaluation_results": results,
    }


@router.get("/context-shift")
def context_shift():
    """
    Demonstrate how changing context (study vs workout) shifts the candidate
    pool and score distribution.
    """
    test_uid = next(iter(data.user_profiles), None)
    if not test_uid:
        return {"error": "No user profiles loaded"}
    profile = data.user_profiles[test_uid]
    genres = profile.get("top_genres", []) or None

    contexts = [
        {"mood": "chill", "activity": "study",   "energy_filter": "calm"},
        {"mood": "hype",  "activity": "workout", "energy_filter": "energetic"},
    ]

    comparisons = []
    for ctx in contexts:
        candidates = retrieve_candidates(
            indexes=data.indexes,
            genres=genres,
            mood=ctx["mood"],
            energy=ctx["energy_filter"],
        )

        ranked = rank_candidates_by_features(
            candidates=candidates,
            track_lookup=data.track_lookup,
            user_profile=profile,
            mood=ctx["mood"],
            activity=ctx["activity"],
            top_k=10,
        )

        energies = [float(data.track_lookup.get(tid, {}).get("energy", 0)) for tid, _, _ in ranked]
        valences = [float(data.track_lookup.get(tid, {}).get("valence", 0)) for tid, _, _ in ranked]

        comparisons.append({
            "context": f"{ctx['activity']} + {ctx['mood']}",
            "candidate_pool_size": len(candidates),
            "top_10_avg_energy": round(sum(energies) / len(energies), 3) if energies else 0,
            "top_10_avg_valence": round(sum(valences) / len(valences), 3) if valences else 0,
            "top_10_avg_score": round(sum(s for _, s, _ in ranked) / len(ranked), 4) if ranked else 0,
            "top_3": [
                {
                    "title": data.track_lookup.get(tid, {}).get("title", "?"),
                    "artist": data.track_lookup.get(tid, {}).get("artist_name", "?"),
                    "score": round(score, 4),
                }
                for tid, score, _ in ranked[:3]
            ],
        })

    return {
        "user_id": profile.get("user_id", test_uid),
        "comparison": comparisons,
        "insight": (
            f"Candidate pool shifted from {comparisons[0]['candidate_pool_size']:,} "
            f"to {comparisons[1]['candidate_pool_size']:,}. "
            f"Avg energy shifted from {comparisons[0]['top_10_avg_energy']} "
            f"to {comparisons[1]['top_10_avg_energy']}."
        ),
    }
