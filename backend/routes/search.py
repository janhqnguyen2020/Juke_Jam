"""Search endpoints: text search + filter lookups."""

from typing import List

from fastapi import APIRouter

import data
from models import SearchRequest, SongResult
from helpers import track_to_result
from musicSearch.music_search import (
    retrieve_candidates,
    rank_candidates_with_tfidf,
)

router = APIRouter()


@router.get("/genres", response_model=List[str])
def get_genres():
    """All 114 available genres."""
    return sorted(data.indexes["genre"].keys())


@router.get("/moods", response_model=List[str])
def get_moods():
    """Available mood buckets: focus, sad, happy, chill, hype."""
    return sorted(data.indexes["mood"].keys())


@router.get("/energy-levels", response_model=List[str])
def get_energy_levels():
    """Available energy labels: calm, medium, energetic."""
    return sorted(data.indexes["energy"].keys())


@router.post("/search", response_model=List[SongResult])
def search(req: SearchRequest):
    """
    Search songs by title/artist text + optional genre/mood/energy filters.
    Uses inverted index for candidate retrieval, TF-IDF for ranking.
    """
    candidates = retrieve_candidates(
        indexes=data.indexes,
        title_query=req.title,
        artist_query=req.artist,
        genres=req.genres,
        mood=req.mood,
        energy=req.energy,
    )

    ranked = rank_candidates_with_tfidf(
        candidates=candidates,
        query_texts=[req.title or "", req.artist or ""],
        track_lookup=data.track_lookup,
        indexes=data.indexes,
        top_k=req.top_k,
    )

    results = []
    for tid, score in ranked:
        r = track_to_result(tid, score)
        if r:
            results.append(r)
    return results
