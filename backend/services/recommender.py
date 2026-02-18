"""
JukeJam Recommender Service

Ports April's ranking-implementation notebook to the backend.

April's design:
  - Feature space: genre, main_genre, mood, energy, artist tokens, title tokens
  - Each song = sparse TF-IDF vector in that space
  - Query = weighted sparse vector (explicit query + user profile + time context)
  - Score = cosine similarity between query and song vectors
  - Retrieval = set UNION across indexes (intentional — scoring handles ranking)
"""

import csv
import json
import math
from collections import defaultdict
from pathlib import Path

# ── Paths (relative to this file's location) ───────────────────────────────────
_BASE = Path(__file__).resolve().parent.parent.parent
_INDEXES_PATH      = _BASE / "indexes" / "indexes.json"
_TIME_CONTEXT_PATH = _BASE / "indexes" / "time_context_profiles.json"
_CATALOG_PATH      = _BASE / "data" / "processed" / "SONG_CATALOG.csv"
_PROFILE_PATH      = _BASE / "data" / "processed" / "USER_PROFILE.csv"

# These are empty dicts/lists at import time.
# load_all() fills them at app startup so every request is fast.
_genre_index:      dict = {}
_main_genre_index: dict = {}
_mood_index:       dict = {}
_energy_index:     dict = {}
_artist_index:     dict = {}
_title_index:      dict = {}

_features:        list = []   # sorted list of all feature strings e.g. ["energy:calm", ...]
_feature_inds:    dict = {}   # feature string → integer index position
_idf:             dict = {}   # feature string → IDF weight (float)
_song_vectors:    dict = {}   # track_id → {feature_index: tfidf_weight}
_song_audio_vecs: dict = {}   # track_id → {energy, danceability, valence, acousticness, tempo_norm}
_catalog:         dict = {}   # track_id → full CSV row dict (for result enrichment)
_user_profiles:   dict = {}   # user_id (lowercased) → profile dict
_time_context:    dict = {}   # user_id → {time_of_day: {typical_mood, top_genres, ...}}

_loaded = False

VALID_MOODS      = {"happy", "sad", "chill", "hype", "focus"}
VALID_ENERGY     = {"calm", "medium", "energetic"}
VALID_TIME_OF_DAY = {"morning", "afternoon", "evening", "night"}

ENERGY_ALIAS = {"low": "calm", "high": "energetic"}

#activity -> target audio feature vector
ACTIVITY_AUDIO_PROFILES = {
    "workout":  {"energy": 0.85, "danceability": 0.80, "valence": 0.65, "acousticness": 0.05, "tempo_norm": 0.80},
    "study":    {"energy": 0.30, "danceability": 0.30, "valence": 0.40, "acousticness": 0.65, "tempo_norm": 0.35},
    "relax":    {"energy": 0.20, "danceability": 0.30, "valence": 0.55, "acousticness": 0.80, "tempo_norm": 0.25},
    "commute":  {"energy": 0.60, "danceability": 0.65, "valence": 0.55, "acousticness": 0.20, "tempo_norm": 0.60},
    "party":    {"energy": 0.85, "danceability": 0.90, "valence": 0.80, "acousticness": 0.05, "tempo_norm": 0.75},
    "sleep":    {"energy": 0.10, "danceability": 0.15, "valence": 0.35, "acousticness": 0.90, "tempo_norm": 0.15},
}

VALID_ACTIVITIES = set(ACTIVITY_AUDIO_PROFILES.keys())

def _energy_pref_to_label(energy_pref: float) -> str:
    """Map USER_PROFILE's continuous energy_pref [0-1] to a catalog energy label."""
    if energy_pref < 0.4:
        return "calm"
    elif energy_pref < 0.7:
        return "medium"
    else:
        return "energetic"


# ── Startup loader ─────────────────────────────────────────────────────────────

def load_all():
    """
    Load all data and build TF-IDF song vectors

    Feature space (what gets added to the vocabulary):
      genre:<name>       — 114 granular genres  e.g. genre:acoustic, genre:k-pop
      main_genre:<name>  — 12 broad categories  e.g. main_genre:rock, main_genre:pop
      mood:<bucket>      — 5 moods              e.g. mood:focus, mood:happy
      energy:<label>     — 3 levels             e.g. energy:calm, energy:energetic
      artist:<token>     — tokenized artist names (35k+ tokens)
      title:<token>      — tokenized song titles (56k+ tokens)
    """
    global _genre_index, _main_genre_index, _mood_index, _energy_index
    global _artist_index, _title_index, _features, _feature_inds, _idf
    global _song_vectors, _song_audio_vecs, _catalog, _user_profiles, _time_context, _loaded

    if _loaded:
        return

    print("[RECOMMENDER] Loading indexes...")
    with open(_INDEXES_PATH, encoding="utf-8") as f:
        index_data = json.load(f)

    _genre_index      = index_data["genre"]
    _main_genre_index = index_data["main_genre"]
    _mood_index       = index_data["mood"]
    _energy_index     = index_data["energy"]
    _artist_index     = index_data["artist"]
    _title_index      = index_data["title"]

    # ── Step 1: Build feature vocabulary ──────────────────────────────────────
    # Collect every possible feature string, sort them, assign integer positions.
    # This defines the "dimensions" of the vector space.
    feature_set = set()

    for g in _genre_index:      
        feature_set.add(f"genre:{g}")
    for g in _main_genre_index: 
        feature_set.add(f"main_genre:{g}")   # taxonomy layer
    for m in _mood_index:       
        feature_set.add(f"mood:{m}")
    for e in _energy_index:     
        feature_set.add(f"energy:{e}")
    for a in _artist_index:     
        feature_set.add(f"artist:{a}")
    for t in _title_index:      
        feature_set.add(f"title:{t}")

    _features = sorted(feature_set)
    _feature_inds = {f: i for i, f in enumerate(_features)}
    print(f"[RECOMMENDER] Vocabulary: {len(_features)} features")

    # ── Step 2: Build binary TF song vectors ───────────────────────────────────
    # TF = 1 if a song has that feature, 0 otherwise (binary).
    raw_vecs: dict = defaultdict(dict)

    def _populate(index: dict, prefix: str):
        for feat, song_ids in index.items():
            f = f"{prefix}:{feat}"
            if f not in _feature_inds:
                continue
            fi = _feature_inds[f]
            for song_id in song_ids:
                raw_vecs[str(song_id)][fi] = 1

    _populate(_genre_index,      "genre")
    _populate(_main_genre_index, "main_genre")
    _populate(_mood_index,       "mood")
    _populate(_energy_index,     "energy")
    _populate(_artist_index,     "artist")
    _populate(_title_index,      "title")

    # ── Step 3: Compute IDF weights ───────────────────────────────────────────
    # IDF = log(N / (1 + df))
    #   N  = total number of songs in the catalog
    #   df = number of songs that have this feature
    # Interpretation:
    #   - genre:study appears in 996 songs → low IDF → contributes less per song
    #   - artist:quevedo appears in a few songs → high IDF → strong match signal
    N = len(raw_vecs)
    df_counts: dict = defaultdict(int)
    for vec in raw_vecs.values():
        for fi in vec:
            df_counts[fi] += 1

    _idf = {}
    for f, fi in _feature_inds.items():
        df = df_counts.get(fi, 0)
        _idf[f] = math.log(N / (1 + df))

    # ── Step 4: Apply IDF → TF-IDF song vectors ────────────────────────────────
    # Each song's binary TF vector is scaled by IDF.
    # Result: songs in rare/specific categories get higher feature weights.
    for song_id, vec in raw_vecs.items():
        _song_vectors[song_id] = {
            fi: weight * _idf[_features[fi]]
            for fi, weight in vec.items()
        }

    print(f"[RECOMMENDER] Built vectors for {len(_song_vectors)} songs")

    # ── Load catalog metadata + audio feature vectors ─────────────────────────
    with open(_CATALOG_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            _catalog[row["track_id"]] = row
            try:
                raw_tempo = float(row.get("tempo", 120) or 120)
                _song_audio_vecs[row["track_id"]] = {
                    "energy":       float(row.get("energy", 0.5) or 0.5),
                    "danceability": float(row.get("danceability", 0.5) or 0.5),
                    "valence":      float(row.get("valence", 0.5) or 0.5),
                    "acousticness": float(row.get("acousticness", 0.5) or 0.5),
                    "tempo_norm":   min(raw_tempo, 250) / 250,
                }
            except (ValueError, TypeError):
                pass
    print(f"[RECOMMENDER] Catalog: {len(_catalog)} tracks")


    # ── Load user profiles ─────────────────────────────────────────────────────
    with open(_PROFILE_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            _user_profiles[row["user_id"].lower()] = row
    print(f"[RECOMMENDER] Profiles: {len(_user_profiles)} users")

    # ── Load time context profiles ─────────────────────────────────────────────
    with open(_TIME_CONTEXT_PATH, encoding="utf-8") as f:
        _time_context = json.load(f)
    print(f"[RECOMMENDER] Time context: {len(_time_context)} users")

    _loaded = True
    print("[RECOMMENDER] Ready.")


# ── Stage 1: Candidate Retrieval (filtering)

def retrieve_candidates(
    genres: list[str] | None = None,
    main_genres: list[str] | None = None,
    mood: str | None = None,
    energy: str | None = None,
    artist: str | None = None,
    title: str | None = None,
) -> list[str]:
  
    sets = []

    def add_hits(index: dict, keys: list[str] | None):
        if not keys:
            return
        hits = set()
        for k in keys:
            hits |= set(index.get(k, []))
        if hits:
            sets.append(hits)

    add_hits(_genre_index,      genres)
    add_hits(_main_genre_index, main_genres)
    add_hits(_mood_index,       [mood] if mood else None)
    add_hits(_energy_index,     [energy] if energy else None)
    add_hits(_artist_index,     [artist] if artist else None)

    if title:
        add_hits(_title_index, title.lower().split())

    if not sets:
        return []

    return list(set.union(*sets))


# ── Stage 2: Query Vector Construction 
def build_query_vector(
    genres: list[str] | None = None,
    main_genres: list[str] | None = None,
    mood: str | None = None,
    energy: str | None = None,
    artist: str | None = None,
    title: str | None = None,
    user_id: str | None = None,
    time_of_day: str | None = None,
    user_weight: float = 1.0,
    profile_weight: float = 0.5,
    time_weight: float = 0.3,
) -> dict[int, float]:
    """
    Three additive layers (highest → lowest weight):

    Layer 1 — Explicit query (user_weight=1.0)
      What the user asked for right now.
      e.g. genres=["indie"], mood="focus", energy="medium"
      These get the full weight because they are the direct intent signal.

    Layer 2 — User profile prefs (profile_weight=0.5)
      From USER_PROFILE.csv: top_genres, energy_pref, mood_bias.
      Personalizes without overriding the explicit query.
      e.g. if user's top genre is "pop" → genre:pop gets a +0.5 boost
      e.g. mood_bias = {"focus": 0.45, "happy": 0.1, ...} → mood:focus += 0.5*0.45

    Layer 3 — Time context (time_weight=0.3)
      From time_context_profiles.json: what this user historically listened
      to at this time of day.
      Soft nudge — doesn't dominate, just tilts results toward historical patterns.

    Taxonomy:
      genre: and main_genre: features can both be set.
      This lets a query for main_genre:"rock" also boost matching granular genres
      through the shared IDF vector space.
    """
    q: dict[int, float] = {}

    def set_feature(f: str, w: float):
        # FIX from April's notebook: use `fi` (local var), not `i` (stale loop var)
        if f in _feature_inds:
            fi = _feature_inds[f]
            q[fi] = q.get(fi, 0.0) + w

    # ── Layer 1: Explicit query ─────────────────────────────────────────────
    if genres:
        for g in genres:
            set_feature(f"genre:{g}", user_weight)

    if main_genres:
        for g in main_genres:
            set_feature(f"main_genre:{g}", user_weight)

    if mood:
        set_feature(f"mood:{mood}", user_weight)

    if energy:
        e = ENERGY_ALIAS.get(energy, energy)   # normalize low/high aliases
        set_feature(f"energy:{e}", user_weight)

    if artist:
        for token in artist.lower().split():
            set_feature(f"artist:{token}", user_weight)

    if title:
        for token in title.lower().split():
            set_feature(f"title:{token}", user_weight)

    # ── Layer 2: User profile prefs ─────────────────────────────────────────
    if user_id:
        profile = _user_profiles.get(user_id.lower())
        if profile:
            # top_genres: stored as comma-separated string e.g. "indie,pop,alternative"
            for g in profile.get("top_genres", "").split(","):
                g = g.strip()
                if g:
                    set_feature(f"genre:{g}", profile_weight)

            # energy_pref: float [0–1] → map to catalog energy label
            try:
                ep = float(profile["energy_pref"])
                set_feature(f"energy:{_energy_pref_to_label(ep)}", profile_weight)
            except (ValueError, KeyError):
                pass

            # mood_bias: JSON string e.g. '{"focus": 0.45, "happy": 0.1, ...}'
            # Weight each mood by its probability × profile_weight
            try:
                mood_bias = json.loads(profile["mood_bias"])
                for m, bias in mood_bias.items():
                    set_feature(f"mood:{m}", profile_weight * bias)
            except (json.JSONDecodeError, KeyError, TypeError):
                pass

    # ── Layer 3: Time context ────────────────────────────────────────────────
    if user_id and time_of_day:
        ctx = _time_context.get(user_id.lower(), {}).get(time_of_day)
        if ctx:
            for g in ctx.get("top_genres", []):
                set_feature(f"genre:{g}", time_weight)
            typical_mood = ctx.get("typical_mood")
            if typical_mood:
                set_feature(f"mood:{typical_mood}", time_weight)

    return q


# ── Stage 3: Scoring ───────────────────────────────────────────────────────────

def _cosine_sim(q_vec: dict, song_vec: dict) -> float:
    dot = sum(song_vec[i] * q_vec[i] for i in song_vec if i in q_vec)
    norm_q = math.sqrt(sum(v * v for v in q_vec.values()))
    norm_s = math.sqrt(sum(v * v for v in song_vec.values()))
    if norm_q == 0 or norm_s == 0:
        return 0.0
    return dot / (norm_q * norm_s)


def _activity_score(activity: str, song_id: str) -> float:
    """
    Cosine similarity between an activity's target audio profile and a song's
    actual Spotify audio features.

    This is a completely separate vector space from TF-IDF.
    TF-IDF operates on categorical features (genre, mood, artist tokens).
    This operates on continuous features (energy, valence, tempo, etc.).

    Example:
      activity="relax" → target {energy:0.2, acousticness:0.8, ...}
      Song with energy=0.18, acousticness=0.75 → high similarity → boosted
      Song with energy=0.9,  acousticness=0.05 → low similarity  → not boosted
    """
    profile = ACTIVITY_AUDIO_PROFILES.get(activity)
    song = _song_audio_vecs.get(song_id)
    if not profile or not song:
        return 0.0

    keys = list(profile.keys())
    p_vec = [profile[k] for k in keys]
    s_vec = [song.get(k, 0.5) for k in keys]

    dot = sum(p * s for p, s in zip(p_vec, s_vec))
    norm_p = math.sqrt(sum(v * v for v in p_vec))
    norm_s = math.sqrt(sum(v * v for v in s_vec))

    if norm_p == 0 or norm_s == 0:
        return 0.0
    return dot / (norm_p * norm_s)


# ── Main entry point ───────────────────────────────────────────────────────────

def rank_songs(
    user_id: str,
    genres: list[str] | None = None,
    main_genres: list[str] | None = None,
    mood: str | None = None,
    energy: str | None = None,
    artist: str | None = None,
    title: str | None = None,
    time_of_day: str | None = None,
    activity: str | None = None,
    top_k: int = 10,
) -> list[dict]:
    """
    Full pipeline: retrieve → score → diversify → return enriched results.

    Scoring formula:
      With activity:    score = 0.65 * tfidf_cosine + 0.25 * activity_audio_cosine + 0.10 * popularity_norm
      Without activity: score = 0.85 * tfidf_cosine + 0.15 * popularity_norm

    Diversity: greedy artist-repeat penalty of 0.08 per prior occurrence in results.

    Candidate fallback: if no explicit filters are given (e.g. home feed),
    fall back to the user's profile top_genres as the candidate pool so the
    function doesn't return empty.
    """
    if not _loaded:
        load_all()

    norm_energy = ENERGY_ALIAS.get(energy, energy) if energy else None

    candidates = retrieve_candidates(
        genres=genres,
        main_genres=main_genres,
        mood=mood,
        energy=norm_energy,
        artist=artist,
        title=title,
    )

    # Fallback: no explicit filters → use profile top_genres as candidate pool.
    # This makes the /home endpoint work (it passes no filters, just user + time).
    if not candidates and user_id:
        profile = _user_profiles.get(user_id.lower(), {})
        profile_genres = [
            g.strip()
            for g in profile.get("top_genres", "").split(",")
            if g.strip()
        ]
        if profile_genres:
            candidates = retrieve_candidates(genres=profile_genres)

    if not candidates:
        return []

    # If no explicit activity, check time context for a typical activity.
    # time_context_profiles.json already stores typical_activity per time slot.
    resolved_activity = activity
    if not resolved_activity and user_id and time_of_day:
        ctx = _time_context.get(user_id.lower(), {}).get(time_of_day, {})
        resolved_activity = ctx.get("typical_activity")

    query_vec = build_query_vector(
        genres=genres,
        main_genres=main_genres,
        mood=mood,
        energy=energy,
        artist=artist,
        title=title,
        user_id=user_id,
        time_of_day=time_of_day,
    )

    if not query_vec:
        return []

    # ── Score every candidate ──────────────────────────────────────────────────
    scored = []
    for song_id in candidates:
        sid = str(song_id)
        song_vec = _song_vectors.get(sid)
        if not song_vec:
            continue

        tfidf = _cosine_sim(query_vec, song_vec)

        try:
            pop_norm = int(_catalog.get(sid, {}).get("popularity", 50) or 50) / 100
        except (ValueError, TypeError):
            pop_norm = 0.5

        if resolved_activity:
            act = _activity_score(resolved_activity, sid)
            score = 0.65 * tfidf + 0.25 * act + 0.10 * pop_norm
        else:
            score = 0.85 * tfidf + 0.15 * pop_norm

        scored.append((sid, score))

    scored.sort(key=lambda x: x[1], reverse=True)

    # ── Greedy diversity: penalise artist repeats ──────────────────────────────
    # Walk candidates in score order. Each time we've already added a song by
    # the same artist, subtract 0.08 from that song's score before accepting it.
    # This lets other artists compete without reshuffling the whole sorted list.
    artist_counts: dict[str, int] = {}
    results = []

    for sid, base_score in scored:
        if len(results) >= top_k:
            break
        row = _catalog.get(sid, {})
        artist = row.get("artist_name", "Unknown")
        repeat = artist_counts.get(artist, 0)
        final_score = base_score - 0.08 * repeat

        results.append({
            "track_id":     sid,
            "score":        round(final_score, 4),
            "title":        row.get("title", "Unknown"),
            "artist":       artist,
            "genre":        row.get("genre", "Unknown"),
            "main_genre":   row.get("main_genre", "Unknown"),
            "mood":         row.get("mood_bucket", "Unknown"),
            "energy_label": row.get("energy_label", "Unknown"),
            "popularity":   int(row.get("popularity", 0) or 0),
        })
        artist_counts[artist] = repeat + 1

    return results
