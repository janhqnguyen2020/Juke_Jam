# music_search.py
# Dictionary-indexed search with TF-IDF and bucket filters for a song catalog.

from __future__ import annotations
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Iterable
import json
import math
import re
from collections import Counter, defaultdict

import pandas as pd

# -----------------------------
# Tokenization / Text utilities
# -----------------------------

TOKEN_RE = re.compile(r"\w+")

def tokenize(text: Optional[str]) -> List[str]:
    """Lowercase, simple alphanumeric tokenization."""
    if not text:
        return []
    return TOKEN_RE.findall(text.lower())

# -----------------------------
# Data loading
# -----------------------------

def load_indexes(indexes_path: Path) -> Dict[str, Dict[str, List[int]]]:
    """
    Load the JSON indexes file.
    Expected keys: 'genre', 'mood', 'title', 'artist', 'energy'.
    Each maps token -> list of track_ids.
    """
    with open(indexes_path, "r", encoding="utf-8") as f:
        indexes = json.load(f)

    required = {"genre", "mood", "title", "artist", "energy"}
    missing = required - set(indexes.keys())
    if missing:
        raise ValueError(f"Indexes file is missing keys: {missing}")

    # Ensure postings are lists of ints (track_ids)
    for key in required:
        for tok, postings in list(indexes[key].items()):
            if not isinstance(postings, list):
                raise ValueError(f"Index '{key}' token '{tok}' must map to a list of track_ids.")

    return indexes


def load_catalog(csv_path: Path) -> Tuple[pd.DataFrame, Dict[int, Dict]]:
    """
    Load the song catalog CSV and build a row lookup by track_id.
    Expects columns: 'track_id', 'title', 'artist_name', 'mood_bucket', 'energy_label', etc.
    """
    df = pd.read_csv(csv_path)
    if "track_id" not in df.columns:
        raise ValueError("SONG_CATALOG must contain a 'track_id' column.")
    # Build dictionary for quick lookup
    track_lookup = df.set_index("track_id").to_dict(orient="index")
    return df, track_lookup

# -----------------------------
# Index helpers (for IDF)
# -----------------------------

def unique_doc_count(track_lookup: Dict[int, Dict]) -> int:
    """Total number of documents (tracks)."""
    return len(track_lookup)


def doc_freq_for_token(token: str,
                       title_index: Dict[str, List[int]],
                       artist_index: Dict[str, List[int]]) -> int:
    """Document frequency across title+artist postings (union)."""
    title_docs = set(title_index.get(token, []))
    artist_docs = set(artist_index.get(token, []))
    return len(title_docs | artist_docs)


def idf(token: str,
        title_index: Dict[str, List[int]],
        artist_index: Dict[str, List[int]],
        N: int) -> float:
    """
    Smooth IDF: ln((N + 1) / (df + 1)) + 1 to avoid div-by-zero.
    """
    df = doc_freq_for_token(token, title_index, artist_index)
    return math.log((N + 1) / (df + 1)) + 1.0

# -----------------------------
# Candidate retrieval (filters)
# -----------------------------

def retrieve_candidates(
    *,
    indexes: Dict[str, Dict[str, List[int]]],
    genres: Optional[Iterable[str]] = None,
    mood: Optional[str] = None,
    energy: Optional[str] = None,
    title_query: Optional[str] = None,
    artist_query: Optional[str] = None
) -> List[int]:
    """
    Returns candidate track_ids using:
      1) Text search precedence: requires intersection across query tokens (AND semantics).
      2) Optional bucket filters: genre(s), mood, energy.
      3) Final set is intersection of all active filters.
    """
    genre_index = indexes["genre"]
    mood_index = indexes["mood"]
    energy_index = indexes["energy"]
    title_index = indexes["title"]
    artist_index = indexes["artist"]

    sets: List[Set[int]] = []

    # 1) Text search precedence
    text_hits: Optional[Set[int]] = None

    if title_query:
        words = tokenize(title_query)
        if words:
            title_sets = [set(title_index.get(w, [])) for w in words]
            if title_sets:
                text_hits = set.intersection(*title_sets) if title_sets else set()

    if artist_query:
        words = tokenize(artist_query)
        if words:
            artist_sets = [set(artist_index.get(w, [])) for w in words]
            if artist_sets:
                artist_hits = set.intersection(*artist_sets) if artist_sets else set()
                text_hits = artist_hits if text_hits is None else (text_hits & artist_hits)

    if text_hits is not None:
        sets.append(text_hits)

    # 2) Bucket filters (optional)
    if genres:
        genre_hits: Set[int] = set()
        for g in genres:
            if g:
                genre_hits |= set(genre_index.get(g.lower(), []))
        sets.append(genre_hits)

    if mood:
        sets.append(set(mood_index.get(mood.lower(), [])))

    if energy:
        sets.append(set(energy_index.get(energy.lower(), [])))

    if not sets:
        # If no filters or queries, no candidates (or you could default to all docs).
        return []

    return list(set.intersection(*sets)) if sets else []

# -----------------------------
# TF-IDF scoring for text query
# -----------------------------

def compute_tf_for_doc(tokens: List[str], query_terms: List[str]) -> Dict[str, float]:
    """
    Compute log-normalized TF per query term for a single document field.
    TF = 0 if absent; otherwise 1 + ln(freq).
    """
    counts = Counter(tokens)
    tf: Dict[str, float] = {}
    for t in query_terms:
        f = counts.get(t, 0)
        tf[t] = 0.0 if f == 0 else (1.0 + math.log(f))
    return tf


def score_doc_tfidf_for_fields(
    *,
    doc: Dict,
    query_terms: List[str],
    N: int,
    title_index: Dict[str, List[int]],
    artist_index: Dict[str, List[int]],
    field_weights: Optional[Dict[str, float]] = None,
    title_col: str = "title",
    artist_col: str = "artist_name",
) -> float:
    """
    Compute TF-IDF score for a document across multiple fields (title, artist),
    with optional field weights. Default: title=2.0, artist=1.0.
    """
    if field_weights is None:
        field_weights = {"title": 2.0, "artist": 1.0}

    # Tokenize fields
    title_tokens = tokenize(doc.get(title_col, ""))
    artist_tokens = tokenize(doc.get(artist_col, ""))

    # Per-field TF
    tf_title = compute_tf_for_doc(title_tokens, query_terms)
    tf_artist = compute_tf_for_doc(artist_tokens, query_terms)

    score = 0.0
    for term in query_terms:
        # IDF from indexes
        term_idf = idf(term, title_index, artist_index, N)

        # Weighted TF sum across fields
        s = field_weights.get("title", 1.0) * tf_title[term] + \
            field_weights.get("artist", 1.0) * tf_artist[term]

        score += s * term_idf

    return score


def rank_candidates_with_tfidf(
    *,
    candidates: List[int],
    query_texts: List[str],
    track_lookup: Dict[int, Dict],
    indexes: Dict[str, Dict[str, List[int]]],
    field_weights: Optional[Dict[str, float]] = None,
    title_col: str = "title",
    artist_col: str = "artist_name",
    top_k: int = 20
) -> List[Tuple[int, float]]:
    """
    Rank candidate track_ids using TF-IDF over title+artist fields.
    query_texts: list of text fragments to combine (e.g., [title_query, artist_query])
    """
    title_index = indexes["title"]
    artist_index = indexes["artist"]

    # Build query terms
    query_terms: List[str] = []
    for qt in query_texts:
        if qt:
            query_terms.extend(tokenize(qt))

    # If no query terms, return candidates unscored (score=0)
    if not query_terms:
        return [(tid, 0.0) for tid in candidates[:top_k]]

    # Unique document count
    N = unique_doc_count(track_lookup)

    # Score each candidate
    scored: List[Tuple[int, float]] = []
    for tid in candidates:
        doc = track_lookup.get(tid)
        if not doc:
            continue
        s = score_doc_tfidf_for_fields(
            doc=doc,
            query_terms=query_terms,
            N=N,
            title_index=title_index,
            artist_index=artist_index,
            field_weights=field_weights,
            title_col=title_col,
            artist_col=artist_col,
        )
        scored.append((tid, s))

    # Sort by score desc; tie-breaker: stable by track_id
    scored.sort(key=lambda x: (-x[1], x[0]))
    return scored[:top_k]

# -----------------------------
# Feature-based similarity scoring (Stage 2 reranking)
# -----------------------------

# Audio feature keys used for cosine similarity
AUDIO_FEATURES = ["energy", "valence", "danceability", "acousticness", "tempo"]

# Normalization ranges for features that aren't already 0-1
_TEMPO_MIN, _TEMPO_MAX = 40.0, 220.0


def _normalize_tempo(tempo: float) -> float:
    """Normalize BPM to 0-1 range."""
    return max(0.0, min(1.0, (tempo - _TEMPO_MIN) / (_TEMPO_MAX - _TEMPO_MIN)))


def _build_feature_vector(record: Dict, normalize_tempo: bool = True) -> List[float]:
    """
    Extract [energy, valence, danceability, acousticness, tempo_norm] from a
    song row or user-average dict.  Missing values default to 0.5.
    """
    vec = []
    for feat in AUDIO_FEATURES:
        val = float(record.get(feat, 0.5))
        if feat == "tempo" and normalize_tempo:
            val = _normalize_tempo(val)
        vec.append(val)
    return vec


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two equal-length vectors.  Returns 0-1."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _mood_match_score(song_mood: str, target_mood: str) -> float:
    """1.0 if exact match, 0.3 for adjacent moods, 0.0 otherwise."""
    if not song_mood or not target_mood:
        return 0.0
    if song_mood == target_mood:
        return 1.0
    adjacent = {
        "happy": {"hype", "chill"},
        "hype":  {"happy"},
        "chill": {"happy", "sad", "focus"},
        "sad":   {"chill", "focus"},
        "focus": {"chill", "sad"},
    }
    return 0.3 if target_mood in adjacent.get(song_mood, set()) else 0.0


def _genre_match_score(song_genre: str, user_genres: List[str]) -> float:
    """1.0 if song genre is in user's top genres, else 0.0."""
    if not song_genre or not user_genres:
        return 0.0
    return 1.0 if song_genre.lower() in [g.lower() for g in user_genres] else 0.0


def build_user_audio_vector(
    user_profile: Dict,
    mood: str,
    activity: Optional[str] = None,
) -> List[float]:
    """
    Build a target audio-feature vector from the user profile + context.
    Uses the user's avg_energy_preference as base, then adjusts for
    the requested mood / activity.
    """
    # Start from user's baseline energy
    base_energy = float(user_profile.get("avg_energy_preference", 0.5))

    # Activity overrides energy target
    activity_energy = {
        "workout": 0.85, "study": 0.25, "relax": 0.20, "commute": 0.55,
    }
    if activity and activity in activity_energy:
        base_energy = activity_energy[activity]

    # Mood sets valence + danceability targets
    mood_profiles = {
        "happy": {"valence": 0.80, "danceability": 0.70, "acousticness": 0.30, "tempo": 120},
        "sad":   {"valence": 0.20, "danceability": 0.30, "acousticness": 0.60, "tempo": 85},
        "chill": {"valence": 0.45, "danceability": 0.40, "acousticness": 0.55, "tempo": 95},
        "hype":  {"valence": 0.75, "danceability": 0.85, "acousticness": 0.15, "tempo": 140},
        "focus": {"valence": 0.40, "danceability": 0.35, "acousticness": 0.50, "tempo": 100},
    }
    mp = mood_profiles.get(mood, {"valence": 0.5, "danceability": 0.5, "acousticness": 0.5, "tempo": 110})

    target = {
        "energy": base_energy,
        "valence": mp["valence"],
        "danceability": mp["danceability"],
        "acousticness": mp["acousticness"],
        "tempo": mp["tempo"],
    }
    return _build_feature_vector(target)


def score_candidate_song(
    song: Dict,
    user_vector: List[float],
    target_mood: str,
    user_genres: List[str],
) -> Tuple[float, Dict[str, float]]:
    """
    Score a single candidate song using multi-signal ranking.

    Returns (final_score, breakdown_dict).

    FinalScore = 0.45 * cosine_sim(audio features)
               + 0.25 * mood_match
               + 0.15 * genre_match
               + 0.15 * popularity_norm
    """
    song_vector = _build_feature_vector(song)
    sim = cosine_similarity(user_vector, song_vector)

    mood_sc = _mood_match_score(song.get("mood_bucket", ""), target_mood)
    genre_sc = _genre_match_score(song.get("genre", ""), user_genres)
    pop_sc = float(song.get("popularity", 50)) / 100.0

    final = 0.45 * sim + 0.25 * mood_sc + 0.15 * genre_sc + 0.15 * pop_sc

    breakdown = {
        "audio_similarity": round(sim, 4),
        "mood_match": round(mood_sc, 4),
        "genre_match": round(genre_sc, 4),
        "popularity": round(pop_sc, 4),
        "final_score": round(final, 4),
    }
    return final, breakdown


def rank_candidates_by_features(
    candidates: List[int],
    track_lookup: Dict[int, Dict],
    user_profile: Dict,
    mood: str,
    activity: Optional[str] = None,
    top_k: int = 20,
) -> List[Tuple[int, float, Dict[str, float]]]:
    """
    Second-stage reranking using audio-feature cosine similarity + profile signals.
    Returns list of (track_id, final_score, score_breakdown).
    """
    user_vector = build_user_audio_vector(user_profile, mood, activity)
    user_genres = user_profile.get("top_genres", [])

    scored: List[Tuple[int, float, Dict[str, float]]] = []
    for tid in candidates:
        song = track_lookup.get(tid)
        if not song:
            continue
        final, breakdown = score_candidate_song(song, user_vector, mood, user_genres)
        scored.append((tid, final, breakdown))

    scored.sort(key=lambda x: (-x[1], x[0]))
    return scored[:top_k]


# -----------------------------
# Explanation generator
# -----------------------------

def generate_explanation(
    song: Dict,
    breakdown: Dict[str, float],
    user_genres: List[str],
    mood: str,
    activity: Optional[str] = None,
) -> str:
    """
    Produce a human-readable explanation for why this song was recommended.
    """
    reasons: List[str] = []

    # Audio similarity
    sim = breakdown.get("audio_similarity", 0)
    if sim >= 0.95:
        reasons.append(f"Audio profile is an excellent match ({sim:.0%})")
    elif sim >= 0.85:
        reasons.append(f"Strong audio-feature similarity ({sim:.0%})")

    # Energy
    song_energy = float(song.get("energy", 0.5))
    if activity:
        if activity == "workout" and song_energy >= 0.7:
            reasons.append(f"High energy ({song_energy:.2f}) fits {activity}")
        elif activity in ("study", "relax") and song_energy <= 0.35:
            reasons.append(f"Low energy ({song_energy:.2f}) suits {activity}")

    # Mood
    song_mood = song.get("mood_bucket", "")
    if song_mood == mood:
        reasons.append(f"Mood \"{song_mood}\" matches your selection")
    elif breakdown.get("mood_match", 0) > 0:
        reasons.append(f"Mood \"{song_mood}\" is adjacent to \"{mood}\"")

    # Genre
    song_genre = song.get("genre", "")
    if song_genre.lower() in [g.lower() for g in user_genres]:
        reasons.append(f"Genre \"{song_genre}\" is in your top genres")

    # Popularity
    pop = int(song.get("popularity", 0))
    if pop >= 75:
        reasons.append(f"Popular track (popularity {pop}/100)")

    if not reasons:
        reasons.append("Matches your current context filters")

    return " · ".join(reasons)


# -----------------------------
# Time-context profile builder
# -----------------------------

# Default mood/activity fallbacks when no historical data exists for a timeslot
_TIME_DEFAULTS = {
    "morning":   {"typical_mood": "focus",  "typical_activity": "commute"},
    "afternoon": {"typical_mood": "happy",  "typical_activity": "study"},
    "evening":   {"typical_mood": "chill",  "typical_activity": "relax"},
    "night":     {"typical_mood": "sad",    "typical_activity": "relax"},
}


def hour_to_timeslot(hour: int) -> str:
    """Map 0-23 hour to a timeslot matching USER_EVENTS.time_of_day values."""
    if 6 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 21:
        return "evening"
    else:
        return "night"


def build_time_context_profiles(
    events_df: pd.DataFrame,
    sessions_df: pd.DataFrame,
    catalog_df: pd.DataFrame,
) -> Dict[str, Dict[str, Dict]]:
    """
    Build time-of-day context profiles for each user from historical data.

    Joins events → sessions (for mood/activity) and events → catalog (for genre).
    Groups by (user_id, time_of_day) and aggregates the most common mood,
    activity, and genres for each timeslot.

    Returns:
        {
            user_id: {
                "morning":   { "typical_mood", "typical_activity", "top_genres", "confidence" },
                "afternoon": { ... },
                ...
            }
        }
    """
    # Normalize column name: some CSVs use spotify_id instead of track_id
    ev = events_df.copy()
    if "spotify_id" in ev.columns and "track_id" not in ev.columns:
        ev = ev.rename(columns={"spotify_id": "track_id"})

    # Merge events with sessions to get mood + activity per event
    merged = ev.merge(
        sessions_df[["user_id", "session_id", "self_reported_mood", "activity_type"]],
        on=["user_id", "session_id"],
        how="left",
    )

    # Map track_id → genre from catalog
    genre_map = catalog_df.set_index("track_id")["genre"].to_dict()
    merged["genre"] = merged["track_id"].map(genre_map)

    # Keep only meaningful events (played, not skipped)
    meaningful = merged[
        (merged["event_type"] == "play") &
        (~merged["skipped"])
    ]

    profiles: Dict[str, Dict[str, Dict]] = {}

    for user_id, user_events in meaningful.groupby("user_id"):
        user_ctx: Dict[str, Dict] = {}

        for tod, tod_events in user_events.groupby("time_of_day"):
            # Most common mood from session data
            moods = tod_events["self_reported_mood"].dropna()
            typical_mood = moods.mode().iloc[0] if len(moods) > 0 else "chill"

            # Most common activity from session data
            activities = tod_events["activity_type"].dropna()
            typical_activity = activities.mode().iloc[0] if len(activities) > 0 else None

            # Top genres from non-skipped tracks
            genres = tod_events["genre"].dropna()
            top_genres = genres.value_counts().head(5).index.tolist() if len(genres) > 0 else []

            # Confidence: fraction of this user's events in this timeslot
            confidence = len(tod_events) / len(user_events)

            user_ctx[tod] = {
                "typical_mood": typical_mood,
                "typical_activity": typical_activity,
                "top_genres": top_genres,
                "event_count": len(tod_events),
                "confidence": round(confidence, 3),
            }

        uid = user_id.lower() if isinstance(user_id, str) else str(user_id)
        profiles[uid] = user_ctx

    return profiles


# -----------------------------
# End-to-end search function
# -----------------------------

def search_tracks(
    *,
    indexes_path: Path,
    catalog_csv_path: Path,
    title_query: Optional[str] = None,
    artist_query: Optional[str] = None,
    genres: Optional[Iterable[str]] = None,
    mood: Optional[str] = None,
    energy: Optional[str] = None,
    top_k: int = 20,
    field_weights: Optional[Dict[str, float]] = None
) -> List[Tuple[int, float]]:
    """
    Loads data, retrieves candidates with filters, then ranks them by TF-IDF.
    Returns a list of (track_id, score).
    """
    indexes = load_indexes(indexes_path)
    _, track_lookup = load_catalog(catalog_csv_path)

    # Retrieve candidates first (AND semantics across all active filters)
    candidates = retrieve_candidates(
        indexes=indexes,
        genres=genres,
        mood=mood,
        energy=energy,
        title_query=title_query,
        artist_query=artist_query
    )

    # Rank by TF-IDF (title+artist)
    ranked = rank_candidates_with_tfidf(
        candidates=candidates,
        query_texts=[title_query or "", artist_query or ""],
        track_lookup=track_lookup,
        indexes=indexes,
        field_weights=field_weights,
        top_k=top_k
    )
    return ranked


def get_track_info(track_id: int, track_lookup: Dict[int, Dict]) -> Optional[Dict]:
    return track_lookup.get(track_id)


def pretty_print_results(
    results: List[Tuple[int, float]],
    track_lookup: Dict[int, Dict],
    *,
    title_col: str = "title",
    artist_col: str = "artist_name",
    mood_col: str = "mood_bucket",
    energy_col: str = "energy_label"
) -> None:
    for tid, score in results:
        info = track_lookup.get(tid, {})
        title = info.get(title_col, "<?>")
        artist = info.get(artist_col, "<?>")
        mood = info.get(mood_col, "<?>")
        energy = info.get(energy_col, "<?>")
        print(f"{title} — {artist} | mood={mood} energy={energy} | score={score:.3f}")


# -----------------------------
# Example usage (adjust paths)
# -----------------------------
if __name__ == "__main__":
    # >>>> CHANGE THESE <<<<
    INDEXES_PATH = Path("..\..\indexes\indexes.json")
    CATALOG_CSV = Path(r"C:\Users\josep\Downloads\Winter 2026\jukejam\data\processed\SONG_CATALOG.csv")

    # Load once if you're going to run multiple queries in a session
    indexes = load_indexes(INDEXES_PATH)
    df, track_lookup = load_catalog(CATALOG_CSV)

    # 1) Example: text-only search by artist
    candidates = retrieve_candidates(indexes=indexes, artist_query="Lady Gaga")
    ranked = rank_candidates_with_tfidf(
        candidates=candidates,
        query_texts=["", "Lady Gaga"],
        track_lookup=track_lookup,
        indexes=indexes,
        field_weights={"title": 2.0, "artist": 1.5},  # tweak if you like
        top_k=10
    )
    print("\nTop results for artist 'Lady Gaga':")
    pretty_print_results(ranked, track_lookup)

    # 2) Example: filters only
    candidates2 = retrieve_candidates(indexes=indexes, mood="sad", energy="calm")
    ranked2 = rank_candidates_with_tfidf(
        candidates=candidates2,
        query_texts=[""],  # no text query -> scores will be 0
        track_lookup=track_lookup,
        indexes=indexes,
        top_k=10
    )
    print("\nResults for mood='sad' & energy='calm':")
    pretty_print_results(ranked2, track_lookup)

    # 3) Example: combined text + filters
    candidates3 = retrieve_candidates(
        indexes=indexes,
        title_query="Shallow",
        artist_query="Lady Gaga",
        genres=["pop"],
        mood="sad",
        energy="calm"
    )
    ranked3 = rank_candidates_with_tfidf(
        candidates=candidates3,
        query_texts=["Shallow", "Lady Gaga"],
        track_lookup=track_lookup,
        indexes=indexes,
        field_weights={"title": 2.5, "artist": 1.0},
        top_k=10
    )
    print("\nCombined filters + text query:")
    pretty_print_results(ranked3, track_lookup)