"""
Profile feature enginerring for JukeJam.

converts raw spotify data or quiz answers into a structured USER_PROFILE.
All profile building logic lives here - routes just call these functions
"""

from __future__ import annotations

import csv # for reading/writing csv files
import json # for reading/writing json files
import statistics # for calculating averages
from pathlib import Path # for file paths

#Path to USER_PROFILE.csv
PROFILE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "processed" / "USER_PROFILE.csv"

#Path to SONG_CATALOG.csv (has audio features for 81k tracks)
CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "processed" / "SONG_CATALOG.csv"

# audio feature columns we need from the catalog
FEATURE_COLS = ["energy", "valence", "danceability", "acousticness", "tempo"]


# ── Local catalog lookup (replaces Spotify /audio-features API) ────
def lookup_audio_features(track_ids: list[str]) -> list[dict]:
    """
    Look up audio features from SONG_CATALOG.csv instead of Spotify's
    /audio-features endpoint (which is now restricted).
    Returns a list of feature dicts for any matching track_ids.
    """
    wanted = set(track_ids)
    matched = []

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["track_id"] in wanted:
                matched.append({col: float(row[col]) for col in FEATURE_COLS})
                wanted.discard(row["track_id"])
                if not wanted:
                    break  # found all, stop scanning

    print(f"[CATALOG LOOKUP] matched {len(matched)}/{len(track_ids)} tracks")
    return matched


def lookup_by_artist_names(artist_names: list[str]) -> tuple[list[dict], list[str]]:
    """
    Fallback: find tracks in SONG_CATALOG by artist name.
    Returns (features_list, genres_list) so we can also fill in genres
    when Spotify's API returns empty genre arrays.
    """
    # normalize for case-insensitive matching
    wanted = set(name.lower() for name in artist_names)
    matched = []
    genre_counts = {}

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # artist_name column can contain multiple artists (e.g. "Drake, Rihanna")
            row_artists = [a.strip().lower() for a in row["artist_name"].split(",")]
            if any(a in wanted for a in row_artists):
                matched.append({col: float(row[col]) for col in FEATURE_COLS})
                genre = row.get("genre", "")
                if genre:
                    genre_counts[genre] = genre_counts.get(genre, 0) + 1

    top_genres = sorted(genre_counts, key=genre_counts.get, reverse=True)[:5]
    print(f"[ARTIST LOOKUP] found {len(matched)} catalog tracks from {len(artist_names)} artists, genres: {top_genres}")
    return matched, top_genres


# ── Cache of catalog genre names (loaded once, reused everywhere) ───
_catalog_genres_cache = None

def _get_catalog_genres() -> set[str]:
    """Load unique genre values from SONG_CATALOG once and cache them."""
    global _catalog_genres_cache
    if _catalog_genres_cache is None:
        genres = set()
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                genres.add(row["genre"].lower())
        _catalog_genres_cache = genres
        print(f"[CACHE] loaded {len(genres)} unique catalog genres")
    return _catalog_genres_cache


def _map_spotify_genres(spotify_genres: list[str]) -> set[str]:
    """
    Map Spotify's granular genre names to our catalog's genre values.
    Spotify uses things like "indie pop", "art pop", "melodic rap".
    Our catalog uses "indie", "pop", "hip-hop", etc.
    We check if any catalog genre appears inside the Spotify genre string.
    """
    catalog_genres = _get_catalog_genres()

    matched = set()
    for sg in spotify_genres:
        sg_lower = sg.lower()
        # exact match first (e.g. "k-pop" == "k-pop")
        if sg_lower in catalog_genres:
            matched.add(sg_lower)
            continue
        # substring match (e.g. "indie pop" contains "indie" and "pop")
        for cg in catalog_genres:
            if cg in sg_lower:
                matched.add(cg)

    print(f"[GENRE MAP] spotify genres {spotify_genres[:10]} -> catalog genres {matched}")
    return matched


def genre_fallback_features(genres: list[str]) -> list[dict]:
    """
    Fallback when too few tracks matched the catalog.
    Maps Spotify genre names to catalog genres, then averages
    audio features across all matching catalog tracks.
    """
    catalog_genres = _map_spotify_genres(genres)

    if not catalog_genres:
        print("[GENRE FALLBACK] no genre matches, using neutral defaults")
        return [{"energy": 0.5, "valence": 0.5, "danceability": 0.5,
                 "acousticness": 0.3, "tempo": 120.0}]

    totals = {col: 0.0 for col in FEATURE_COLS}
    count = 0

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("genre", "").lower() in catalog_genres:
                for col in FEATURE_COLS:
                    totals[col] += float(row[col])
                count += 1

    print(f"[GENRE FALLBACK] averaged {count} catalog tracks from genres: {catalog_genres}")
    return [{col: totals[col] / count for col in FEATURE_COLS}]


# ---- Mood classification (matches SONG_CATALOG thresholds) ----
def classify_mood(energy: float, valence: float,
                  acousticness: float = 0.0, tempo: float = 120.0) -> str:
    """
    Mirrors mood_bucket() in clean_REDO_Data.ipynb exactly.
    Condition order and thresholds must stay in sync with the catalog.
    """
    if valence > 0.6 and energy > 0.6:
        return "happy"
    elif valence < 0.4 and energy < 0.5:
        return "sad"
    elif acousticness > 0.5 and energy < 0.5:
        return "chill"
    elif energy > 0.75 and tempo > 120:
        return "hype"
    else:
        return "focus"
    
def compute_mood_bias(primary_mood: str) -> dict:
    """
    for manual onboarding: user picks a primary mood.
    Give it a 45% weight, spread the rest across other moods.
    """
    moods = {"happy": 0.10, "sad": 0.10, "hype": 0.10, "chill": 0.10, "focus": 0.10}
    moods[primary_mood] = 0.45

    others = [m for m in moods if m != primary_mood]
    leftover = 1.0 - 0.45 - (0.10 * len(others))

    for m in others:
        moods[m] += leftover / len(others)
    total = sum(moods.values())

    return {k: round(v / total, 3) for k, v in moods.items()}

# ── Build profile from Spotify data ───────────────────────────────
def build_spotify_profile(user_id: str, top_artists: dict, features: list[dict],
                          catalog_genres: list[str] = None) -> dict:
    """
    Takes a list of audio feature dicts (from catalog lookup or genre fallback)
    and top artist data to build a USER_PROFILE dict.
    catalog_genres: optional genres from artist lookup (used when Spotify returns none)
    """
    if not features:
        raise ValueError("Could not retrieve audio features.")

    # Audio preference averages
    energy_pref = round(statistics.mean(f["energy"] for f in features), 3)
    valence_pref = round(statistics.mean(f["valence"] for f in features), 3)
    danceability_pref = round(statistics.mean(f["danceability"] for f in features), 3)
    acousticness_pref = round(statistics.mean(f["acousticness"] for f in features), 3)
    tempo_pref = round(statistics.mean(f["tempo"] for f in features) / 250, 3)

    # Top genres: try Spotify first, fall back to catalog genres
    raw_genres = []
    for artist in top_artists.get("items", []):
        raw_genres.extend(artist.get("genres", []))
    mapped = _map_spotify_genres(raw_genres)
    top_genres = list(mapped)[:5]

    # if Spotify returned no genres, use genres from catalog artist lookup
    if not top_genres and catalog_genres:
        top_genres = catalog_genres[:5]
        print(f"[GENRES] using catalog genres: {top_genres}")

    # Mood bias: classify each track, compute distribution
    mood_counts = {"happy": 0, "sad": 0, "hype": 0, "chill": 0, "focus": 0}
    for f in features:
        mood = classify_mood(f["energy"], f["valence"], f.get("acousticness", 0.0), f.get("tempo", 120.0))
        mood_counts[mood] += 1
    total = sum(mood_counts.values())
    mood_bias = {k: round(v / total, 3) for k, v in mood_counts.items()}

    return {
        "user_id": user_id,
        "top_genres": ",".join(top_genres),
        "energy_pref": energy_pref,
        "valence_pref": valence_pref,
        "danceability_pref": danceability_pref,
        "acousticness_pref": acousticness_pref,
        "tempo_pref": tempo_pref,
        "mood_bias": json.dumps(mood_bias),
        "activity_preferences": "",
        "onboarding_source": "spotify_oauth",
    }

# ── Save profile to CSV (shared by both onboarding paths) ─────────
def save_profile(profile: dict):
    """
    Write a profile to USER_PROFILE.csv.
    Updates the row if user_id already exists, otherwise appends.
    """
    rows = []
    found = False

    with open(PROFILE_PATH, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            if row["user_id"] == profile["user_id"]:
                row = profile
                found = True
            rows.append(row)

    if not found:
        rows.append(profile)

    with open(PROFILE_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def update_activity_preferences(user_id: str, activities: list[str]) -> dict | None:
    """
    Update just the activity_preferences field for an existing user.
    Returns the updated profile dict, or None if user not found.
    """
    rows = []
    updated_profile = None

    with open(PROFILE_PATH, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            if row["user_id"] == user_id:
                row["activity_preferences"] = ",".join(activities)
                updated_profile = dict(row)
            rows.append(row)

    if not updated_profile:
        return None

    with open(PROFILE_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return updated_profile