"""Shared helper functions used across multiple route modules."""

from typing import Dict, Optional

from models import SongResult
from data import track_lookup


def track_to_result(tid: str, score: float) -> Optional[SongResult]:
    """Convert a track_id + score into a SongResult response model."""
    info = track_lookup.get(tid)
    if not info:
        return None
    return SongResult(
        track_id=tid,
        title=info.get("title", ""),
        artist_name=info.get("artist_name", ""),
        album_name=info.get("album_name", ""),
        genre=info.get("genre", ""),
        duration_ms=int(info.get("duration_ms", 0)),
        popularity=int(info.get("popularity", 0)),
        mood_bucket=info.get("mood_bucket", ""),
        energy_label=info.get("energy_label", ""),
        mood_label=info.get("mood_label", ""),
        tempo_label=info.get("tempo_label", ""),
        danceability=float(info.get("danceability", 0)),
        energy=float(info.get("energy", 0)),
        valence=float(info.get("valence", 0)),
        score=round(score, 4),
    )


def mood_to_energy(mood: str) -> Optional[str]:
    """Map mood to a reasonable default energy filter."""
    return {
        "hype": "energetic",
        "happy": "medium",
        "chill": "calm",
        "sad": "calm",
        "focus": "medium",
    }.get(mood)
