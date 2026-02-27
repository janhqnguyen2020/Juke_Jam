# JukeJam — Complete System Overview

> CS 125 · Next Generation Search Systems · Team: Juke Jam
> Members: April Wong (craigw2), Joseph Nguyen (Josepan1), Allyson Lopez (allysal1)
> Last updated: 2026-02-24

---

## Table of Contents

1. [What Is JukeJam?](#1-what-is-jukejam)
2. [Project Goal & Purpose](#2-project-goal--purpose)
3. [Commit History — What Was Built When](#3-commit-history--what-was-built-when)
4. [Folder Layout & File Descriptions](#4-folder-layout--file-descriptions)
5. [The Recommendation System Model](#5-the-recommendation-system-model)
6. [Logical View — Index, Matching, Ranking, Context](#6-logical-view--index-matching-ranking-context)

---

## 1. What Is JukeJam?

JukeJam is a **context-aware, personalized music recommendation engine**. It does not stream music — it recommends songs from a curated catalog of ~81,000 tracks based on who you are (your listening history / onboarding profile) and what you are doing right now (time of day, activity, mood).

It is a full-stack prototype:
- **Backend**: Python / FastAPI REST API
- **Data layer**: pre-processed CSV + JSON indexes (no live database)
- **Frontend**: Flutter mobile app (mock / prototype, runs on web/Android/iOS)

The core idea: move beyond "more of the same." Current platforms loop users into similarity bubbles. JukeJam uses a multi-signal scoring model that weighs explicit user intent, long-term taste profile, and present-moment context all at once.

---

## 2. Project Goal & Purpose

### Problem
Streaming platforms serve repetitive recommendations. Users waste time skipping. They miss new artists. Playlists go stale. Skip signals are ignored. Context (time of day, current activity) is rarely used.

### Solution
A recommendation engine that combines three independent signals into every ranked result:

| Signal | Source | Weight |
|---|---|---|
| Explicit query | What the user typed or filtered | Highest (1.0) |
| User profile | Long-term listening taste | Medium (0.5) |
| Time context | Historical patterns by time slot | Soft nudge (0.3) |

And adds a fourth dimension when known: **activity** (workout, study, relax, etc.) which uses a continuous audio feature space separate from the text/categorical TF-IDF space.

### Target Users
Active music listeners who use Spotify or similar platforms daily: students building study playlists, commuters, gym-goers, listeners trying to discover underground artists.

---

## 3. Commit History — What Was Built When

### `f68097b` — Initial commit *(Jan 22, 2026)*
- Added bare `README.md`.
- The project existed as an empty repo.

---

### `d7c77e2` — Add project proposal *(Jan 22, 2026)*
- Added `ProjectProposal.md` (133 lines).
- Defined the full problem statement, target users, system concept, data sources, personal model, search/ranking logic, architecture, and team plan.
- Key decisions locked in here:
  - Context signals: time of day, activity, skip patterns.
  - Skip = negative signal (meaningful, not ignored).
  - Personal model = dynamic profile that evolves over time.
  - Matching = audio features (tempo, energy, mood) + profile.
  - Ranking = similarity + novelty + context fit.

---

### `d8c5718` — Song Catalog dataset *(early phase)*
- Introduced `data/raw/` and the first version of the song catalog.
- Raw Spotify Extended Streaming History JSON files added (personal listening history from 2021 to 2026 across 11 files).
- MSD (Million Song Dataset) MP3 examples added for future audio analysis.
- Foundation of the data pipeline.

---

### `d1e95a5` — Example user events template *(early phase)*
- Added `data/processed/user_events.csv`.
- Established the `cleanUserEvent` pattern — a cleaned/filtered version of raw streaming history.
- This file is the implicit signal source: every play event, with timestamp, track ID, ms played, skip detection.
- Template for filtering your own Spotify export data.

---

### `0669d86` — Datasets complete *(data phase)*
- All processed datasets finalized:
  - `SONG_CATALOG.csv` — 81k tracks with audio features, genre taxonomy, mood bucket, energy label.
  - `USER_PROFILE.csv` — one row per user: `top_genres`, `energy_pref`, `valence_pref`, `mood_bias`, `activity_preferences`.
  - `session_features.csv` — derived time-of-day session patterns per user.
  - `_track_remap.json` — mapping layer for track ID normalization.
- This commit represents the end of the data engineering phase.

---

### `45a3758` — Experiment *(exploration phase)*
- Early experimentation with ranking approaches.
- Not a stable feature branch — exploratory notebooks and prototypes.

---

### `7c054e8` — Eliminate filler files. Add time profile *(profile phase)*
- Cleaned up dead files and placeholder code.
- Added **time context profiles** — per-user, per-time-slot data:
  - `typical_mood` (e.g., "focus")
  - `top_genres` for that time slot
  - `typical_activity` (inferred)
  - `mood_distribution` (probability vector)
  - `activity_distribution`
- This data is stored in `indexes/time_context_profiles.json`.
- Critical addition: time-of-day context is now a real data-backed signal, not a rule.

---

### `ec96ab2` — Clean up data. Update columns for onboarding and future rec *(schema phase)*
- `USER_PROFILE.csv` columns restructured:
  - Added `activity_preferences` column.
  - Added `onboarding_source` column (`spotify_oauth` | `manual` | `spotify_export`).
  - Normalized float fields: `energy_pref`, `valence_pref`, `danceability_pref`, `acousticness_pref`, `tempo_pref` — all in [0, 1].
  - `mood_bias` stored as a JSON string dict, e.g. `{"focus": 0.45, "happy": 0.21, ...}`.
- `SONG_CATALOG.csv` columns standardized:
  - Added `mood_bucket`, `main_genre`, `energy_label`, `danceability_label`, `mood_label`, `tempo_label`, `acoustic_label`, `loudness_label`, `mode_label`.
  - `main_genre` is a coarser taxonomy layer above `genre` (12 categories vs 114).
- This is the schema that all downstream code depends on.

---

### `6ff64c8` — Ranking Implementation v1 *(core engine phase)*
- First working implementation of the recommendation pipeline in a Jupyter notebook (`notebooks/`).
- TF-IDF vector space constructed over the song catalog.
- Feature vocabulary built: `genre:*`, `mood:*`, `energy:*`, `artist:*`, `title:*` tokens.
- Query vector built from user input + user profile.
- Cosine similarity computed between query vector and all song vectors.
- Basic scoring: `score = tfidf_cosine`.
- Songs returned ranked by score.

---

### `38e30b8` — Ranking Implementation v2 with profile context *(core engine phase)*
- Major upgrade to the ranking notebook.
- Added **Layer 2 (user profile)** to the query vector:
  - `top_genres` boost at 0.5× weight.
  - `energy_pref` mapped to energy label and boosted.
  - `mood_bias` dict applied proportionally.
- Added **Layer 3 (time context)** to the query vector:
  - Per-user, per-time-slot genre and mood boosts at 0.3× weight.
- Added **activity audio scoring** — completely separate vector space:
  - Each activity maps to a target audio feature vector `{energy, danceability, valence, acousticness, tempo_norm}`.
  - Cosine similarity between target and actual song audio features.
  - Blended into final score: `0.65 * tfidf + 0.25 * activity + 0.10 * popularity`.
- Added **greedy diversity penalty**: -0.08 per artist repeat in results.
- Added **main_genre** layer to the taxonomy (broad + granular genre now both active in feature space).
- Added `indexes/` directory with all pre-built inverted indexes:
  - `genre_index.json`, `main_genre_index.json`, `mood_index.json`, `energy_index.json`, `artist_index.json`, `title_index.json` — merged into `indexes.json`.

---

### `7cc7edf` — Eliminate duplicate, work on OAuth *(backend phase)*
- Moved ranking logic from notebooks into `backend/services/recommender.py`.
- Built FastAPI backend:
  - `backend/app.py` — app entry point, startup loader.
  - `backend/routes/spotify.py` — OAuth login/callback, profile creation from Spotify data.
  - `backend/routes/manual.py` — manual onboarding endpoint.
  - `backend/routes/profile.py` — shared activity update endpoint.
  - `backend/routes/recommend.py` — `/recommend/` POST and `/recommend/home/{user_id}` GET.
  - `backend/services/spotify_client.py` — all Spotify API calls isolated here.
  - `backend/services/profile_builder.py` — feature engineering for profile creation.
  - `backend/models/user_profile.py` — Pydantic request/response models.
- Spotify `/audio-features` API was blocked (Spotify restricted it for new apps), so fallback chain implemented:
  1. Match track IDs in our catalog.
  2. Fall back to artist name match.
  3. Fall back to genre-average features.
- Indexes consolidated into one `indexes/indexes.json` file for faster startup load.
- Bug fix from April's notebook: stale loop variable `i` replaced with local `fi` in feature vector construction.

---

### `3e212fe` — Develop log view by adding taxonomy for subgenre and main genre *(refinement phase)*
- `main_genre` taxonomy fully integrated as a two-tier genre system:
  - Tier 1 (granular): 114 genres — `genre:indie-pop`, `genre:reggaeton`, `genre:ambient`, etc.
  - Tier 2 (broad): 12 categories — `main_genre:rock`, `main_genre:electronic`, `main_genre:latin`, etc.
- Both tiers active in TF-IDF space simultaneously. A query for `main_genre:rock` also gets score from granular `genre:indie`, `genre:alternative`, etc. because they share the same IDF-weighted vector space.
- Logging/debugging views added for index inspection.
- `clean_REDO_Data.ipynb` notebook finalized for catalog preprocessing.
- `index.ipynb` notebook finalized for building all indexes.

---

### `7e1c535` — Prototype version with Python backend and mock Flutter *(current, prototype phase)*
- Flutter frontend built (mock/prototype UI):
  - `frontend/lib/main.dart` — app entry, routing, dark theme.
  - `frontend/lib/pages/title_page.dart` — landing page with Spotify / manual onboarding choice.
  - `frontend/lib/pages/onboarding_manual_page.dart` — form-based onboarding (genres, mood, energy, etc.).
  - `frontend/lib/pages/onboarding_spotify_page.dart` — OAuth redirect page.
  - `frontend/lib/pages/home_page.dart` — main feed with filter chips (genre, mood, energy, activity), search bar, home feed, results list.
  - `frontend/lib/pages/context_quiz_page.dart` — 3-step context quiz (mood → activity → genre).
  - `frontend/lib/services/api_service.dart` — HTTP client talking to FastAPI backend.
  - `frontend/lib/models/song.dart` — Song data model.
  - `frontend/lib/widgets/song_card.dart` — card UI for each recommendation.
  - `frontend/lib/widgets/filter_chip_row.dart` — horizontal scrollable filter chip row.
- Backend finalized and running.
- End-to-end flow working: onboard → profile saved → home feed → filter → context quiz → ranked results.

---

## 4. Folder Layout & File Descriptions

```
jukejam/
│
├── ProjectProposal.md          # Original project proposal (CS 125)
├── README.md                   # Basic project readme
├── SYSTEM_OVERVIEW.md          # This document
│
├── backend/                    # Python FastAPI REST API
│   ├── app.py                  # App entry point. Registers all routers. Runs load_all() at startup.
│   ├── .env                    # Spotify client ID + secret (not committed to git)
│   ├── requirements.txt        # Python dependencies
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── user_profile.py     # Pydantic schemas: ManualOnboardRequest, UserProfile, ActivityUpdateRequest
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── spotify.py          # GET /spotify/login, GET /spotify/callback
│   │   ├── manual.py           # POST /manual/onboard
│   │   ├── profile.py          # POST /profile/activities
│   │   └── recommend.py        # POST /recommend/, GET /recommend/home/{user_id}
│   │
│   └── services/
│       ├── __init__.py
│       ├── spotify_client.py   # All Spotify API HTTP calls (exchange_code, get_top_artists, etc.)
│       ├── profile_builder.py  # Feature engineering: builds USER_PROFILE from Spotify data or quiz
│       └── recommender.py      # Core engine: TF-IDF vectors, query builder, scoring, ranking
│
├── data/
│   ├── raw/
│   │   ├── Personal Data/Joseph/Spotify Extended Streaming History/
│   │   │   └── Streaming_History_Audio_*.json   # Raw Spotify history (2021–2026)
│   │   └── msd/MP3-Example/                     # Million Song Dataset MP3 samples (by genre)
│   │
│   └── processed/
│       ├── SONG_CATALOG.csv        # 81k songs with audio features + taxonomy labels (THE catalog)
│       ├── USER_PROFILE.csv        # One row per user with taste profile
│       ├── user_events.csv         # Cleaned Spotify streaming events (play, skip, duration)
│       ├── session_features.csv    # Per-session features derived from user_events
│       └── _track_remap.json       # Track ID normalization map
│
├── indexes/
│   ├── indexes.json                # Master inverted index file — all 6 indexes merged into one JSON
│   │                               # Keys: "genre", "main_genre", "mood", "energy", "artist", "title"
│   │                               # Value: { feature_value → [list of track_ids] }
│   ├── genre_index.json            # Standalone genre index (114 genres)
│   ├── main_genre_index.json       # Standalone main genre index (12 broad categories)
│   ├── mood_index.json             # Standalone mood index (5 moods)
│   ├── energy_index.json           # Standalone energy index (3 levels)
│   ├── artist_index.json           # Standalone artist token index
│   ├── title_index.json            # Standalone title token index
│   └── time_context_profiles.json  # Per-user, per-time-slot listening history context
│
├── notebooks/
│   ├── clean_REDO_Data.ipynb   # Data cleaning pipeline: raw Spotify JSON → SONG_CATALOG.csv
│   └── index.ipynb             # Index building pipeline: SONG_CATALOG.csv → all index files
│
└── frontend/                   # Flutter mobile app
    └── lib/
        ├── main.dart                           # App entry, route table, dark theme
        ├── models/
        │   └── song.dart                       # Song data model (track_id, title, artist, score, etc.)
        ├── pages/
        │   ├── title_page.dart                 # Landing: choose Spotify or manual onboarding
        │   ├── onboarding_manual_page.dart     # Quiz form: genres, mood, energy, acoustic, tempo, activities
        │   ├── onboarding_spotify_page.dart    # Spotify OAuth redirect page
        │   ├── home_page.dart                  # Main feed: filter chips, search bar, song list
        │   └── context_quiz_page.dart          # 3-step in-session quiz: mood → activity → genre
        ├── services/
        │   └── api_service.dart                # HTTP client: homeFeed(), recommend()
        └── widgets/
            ├── song_card.dart                  # Card UI for each recommended song
            └── filter_chip_row.dart            # Horizontal scrollable chip row (genre, mood, etc.)
```

---

## 5. The Recommendation System Model

### Data Model: SONG_CATALOG.csv

Every track in the catalog has these fields:

| Field | Type | Example | Description |
|---|---|---|---|
| `track_id` | `str` | `"3nqQXoyQOWXiESFLlDF1hG"` | Spotify track ID (primary key) |
| `title` | `str` | `"Unholy"` | Song name |
| `artist_name` | `str` | `"Sam Smith, Kim Petras"` | One or more artists |
| `album_name` | `str` | `"Unholy"` | Album name |
| `genre` | `str` | `"pop"` | Granular genre (one of 114) |
| `main_genre` | `str` | `"pop"` | Broad category (one of 12) |
| `popularity` | `int` | `100` | Spotify popularity score [0–100] |
| `danceability` | `float` | `0.714` | Rhythmic regularity [0–1] |
| `energy` | `float` | `0.472` | Perceived intensity/activity [0–1] |
| `valence` | `float` | `0.238` | Musical positiveness [0–1] |
| `tempo` | `float` | `131.121` | BPM (beats per minute) |
| `acousticness` | `float` | `0.013` | Acoustic vs electronic [0–1] |
| `instrumentalness` | `float` | `0.0` | Vocal content (0=vocals, 1=none) |
| `liveness` | `float` | `0.266` | Live performance probability [0–1] |
| `speechiness` | `float` | `0.086` | Speech fraction [0–1] |
| `loudness` | `float` | `-7.375` | Average loudness in dBFS |
| `mode` | `int` | `1` | Major (1) or minor (0) |
| `key` | `int` | `2` | Pitch class [0–11] |
| `mood_bucket` | `str` | `"sad"` | Derived mood: happy/sad/chill/hype/focus |
| `energy_label` | `str` | `"medium"` | calm / medium / energetic |
| `danceability_label` | `str` | `"high"` | low / medium / high |
| `tempo_label` | `str` | `"fast"` | slow / medium / fast |
| `acoustic_label` | `str` | `"electronic"` | acoustic / mixed / electronic |
| `loudness_label` | `str` | `"normal"` | quiet / normal / loud |
| `mode_label` | `str` | `"major (bright)"` | Human-readable mode |

**Mood classification logic** (mirrors notebook):
```
valence > 0.6 AND energy > 0.6  → "happy"
valence < 0.4 AND energy < 0.5  → "sad"
acousticness > 0.5 AND energy < 0.5 → "chill"
energy > 0.75 AND tempo > 120   → "hype"
else                             → "focus"
```

---

### Data Model: USER_PROFILE.csv

One row per user:

| Field | Type | Example | Description |
|---|---|---|---|
| `user_id` | `str` | `"joseph"` | Username / Spotify ID |
| `top_genres` | `str` | `"pop,indie,show-tunes"` | Comma-separated top genres (up to 5) |
| `energy_pref` | `float` | `0.648` | Average energy preference [0–1] |
| `valence_pref` | `float` | `0.460` | Average valence (mood brightness) [0–1] |
| `danceability_pref` | `float` | `0.580` | Average danceability preference [0–1] |
| `acousticness_pref` | `float` | `0.218` | Average acousticness preference [0–1] |
| `tempo_pref` | `float` | `0.513` | Normalized tempo preference [0–1] |
| `mood_bias` | `str (JSON)` | `'{"focus":0.459,"happy":0.21,...}'` | Probability distribution over 5 moods |
| `activity_preferences` | `str` | `"commute,relax,study"` | Comma-separated preferred activities |
| `onboarding_source` | `str` | `"spotify_oauth"` | How the profile was created |

**Onboarding sources:**
- `spotify_oauth` — user connected Spotify; profile built from top tracks + top artists.
- `spotify_export` — profile built from exported Spotify streaming history JSON files.
- `manual` — user filled out quiz form; quiz answers mapped to numeric fields.

---

### Data Model: time_context_profiles.json

Per-user, per-time-slot listening context, derived from historical streaming events:

```json
{
  "joseph": {
    "afternoon": {
      "typical_mood":  "focus",
      "mood_distribution": { "focus": 0.476, "happy": 0.183, "sad": 0.158, "hype": 0.133, "chill": 0.05 },
      "typical_activity": "study",
      "activity_distribution": { "study": 0.82, "commute": 0.099, "workout": 0.081, "relax": 0.0 },
      "top_genres": ["indie", "pop", "show-tunes", "indie-pop", "j-pop"],
      "event_count": 17085,
      "confidence": 0.183
    },
    "evening":  { ... },
    "morning":  { ... },
    "night":    { ... }
  }
}
```

Time slots: `morning` (5–11h), `afternoon` (12–16h), `evening` (17–21h), `night` (22–4h).

---

## 6. Logical View — Index, Matching, Ranking, Context

---

### 6.1 Index

> **What is it?** A pre-built inverted index that maps each feature value to the set of track IDs that have that feature.

**Purpose:** Speed. Without an index, a query would have to scan all 81,000 songs. With an index, you get a candidate set of matching songs in O(1) dictionary lookups.

**Structure:**
```
IndexType = dict[str, list[str]]
# feature_value → [track_id_1, track_id_2, ...]
```

**The 6 indexes and what they contain:**

| Index | Key type | Example key | Example values |
|---|---|---|---|
| `genre` | granular genre string | `"indie-pop"` | `["3nqQXoy...", "5ww2BF9...", ...]` |
| `main_genre` | broad category string | `"rock"` | `["0BxE4Fq...", "27ZZdyT...", ...]` |
| `mood` | mood bucket | `"focus"` | `["3F5CgOj...", "5XeFesFb...", ...]` |
| `energy` | energy label | `"calm"` | `["6xGruZO...", "5wANPM4...", ...]` |
| `artist` | single artist name token | `"billie"` | `["0u2P5u6...", "4RVwu0g...", ...]` |
| `title` | single title word token | `"lights"` | `["0VjIjW4...", ...]` |

**Scale:**
- 114 granular genres
- 12 main genres
- 5 mood buckets
- 3 energy levels
- 35,000+ artist tokens
- 56,000+ title tokens

**How it's built** (`notebooks/index.ipynb` → stored in `indexes/indexes.json`):

For each song in `SONG_CATALOG.csv`:
1. Add `track_id` to `genre_index[song.genre]`.
2. Add `track_id` to `main_genre_index[song.main_genre]`.
3. Add `track_id` to `mood_index[song.mood_bucket]`.
4. Add `track_id` to `energy_index[song.energy_label]`.
5. Tokenize `artist_name` (split by space/comma), add to `artist_index[token]`.
6. Tokenize `title` (lowercase split), add to `title_index[token]`.

All 6 indexes are merged into one `indexes.json` and loaded at server startup into memory as Python dicts. The entire index fits in RAM — no database needed.

**At startup**, TF-IDF song vectors are built from the index:
```
For each feature f in feature_vocabulary:
    df(f) = number of songs that have feature f
    IDF(f) = log( N / (1 + df(f)) )

For each song s:
    song_vector[s] = { feature_index: IDF(f) for each feature f that s has }
```

This is a **binary TF (term frequency = 1 if present, 0 if not)** multiplied by IDF. Songs in rare/specific categories get higher feature weights. Songs in common categories (like "pop" or "focus") get lower weights.

**Example:**

- `mood:focus` appears in 40,000 songs → IDF ≈ log(81000 / 40001) ≈ 0.70 (low signal)
- `artist:quevedo` appears in 3 songs → IDF ≈ log(81000 / 4) ≈ 10.2 (very strong signal)

So a query for "Quevedo" strongly surfaces those exact songs, while a query for "focus mood" needs support from other features to differentiate results.

---

### 6.2 Matching

> **What is it?** The candidate retrieval stage — filtering the 81,000-song catalog down to a manageable set of candidates that are at least somewhat relevant to the query.

**Algorithm:** Set UNION across all index lookups.

```python
def retrieve_candidates(genres, main_genres, mood, energy, artist, title) -> list[str]:
    sets = []
    if genres:      sets.append( union of genre_index[g] for g in genres )
    if main_genres: sets.append( union of main_genre_index[g] for g in main_genres )
    if mood:        sets.append( set(mood_index[mood]) )
    if energy:      sets.append( set(energy_index[energy]) )
    if artist:      sets.append( union of artist_index[token] for token in artist.split() )
    if title:       sets.append( union of title_index[token] for token in title.lower().split() )

    return list( set.union(*sets) )  # UNION — intentionally inclusive
```

**Why UNION, not INTERSECTION?**

INTERSECTION would require a song to match ALL criteria — this would eliminate too many songs, especially for sparse queries. UNION lets any matching signal bring a song into the candidate pool. The scoring stage (ranking) then determines how well each candidate actually fits the full query.

**Example:**

Query: `mood="focus"`, `energy="calm"`, `main_genres=["rock"]`

- `mood_index["focus"]` → 40,000 songs
- `energy_index["calm"]` → 8,000 songs
- `main_genre_index["rock"]` → 12,000 songs
- UNION → ~45,000 candidates (overlap counted once)

All 45,000 go to the scoring stage. The ones that match all three criteria will score highest.

**Fallback behavior:**

If no explicit query filters are provided (e.g., `/recommend/home/{user_id}` — the app-open feed):
1. Load user's `top_genres` from `USER_PROFILE.csv`.
2. Use those as the candidate pool via `genre_index`.

This ensures the home feed always returns something relevant without the user typing anything.

**Input types:**

| Parameter | Python type | Cardinality | Example |
|---|---|---|---|
| `genres` | `list[str] \| None` | 0–N granular genres | `["indie-pop", "acoustic"]` |
| `main_genres` | `list[str] \| None` | 0–N broad genres | `["rock", "electronic"]` |
| `mood` | `str \| None` | 1 of 5 values | `"focus"` |
| `energy` | `str \| None` | 1 of 3 + 2 aliases | `"calm"` or `"low"` |
| `artist` | `str \| None` | free text, tokenized | `"arctic monkeys"` |
| `title` | `str \| None` | free text, tokenized | `"blinding lights"` |

**Energy aliasing:**
```python
ENERGY_ALIAS = {"low": "calm", "high": "energetic"}
```
The frontend can send "low" or "high"; the backend normalizes to the catalog labels.

---

### 6.3 Ranking

> **What is it?** For each candidate song, compute a score that reflects how well it matches the full query (explicit + profile + context). Sort descending. Return top K.

Ranking has two parallel scoring mechanisms:

---

#### Mechanism 1: TF-IDF Cosine Similarity (categorical features)

**Query vector construction** is a 3-layer additive process:

```
query_vector: dict[feature_index → weight]
```

**Layer 1 — Explicit query (weight = 1.0)**

Direct user intent. Highest weight because this is what the user is asking for right now.

```python
# Example: user selects mood="focus", energy="calm", genre="indie"
query_vector["mood:focus"]  += 1.0
query_vector["energy:calm"] += 1.0
query_vector["genre:indie"] += 1.0
```

**Layer 2 — User profile (weight = 0.5)**

Personalization without overriding. Profile preferences added at half the explicit weight.

```python
# From USER_PROFILE.csv for user "joseph":
# top_genres = "pop,indie,show-tunes,indie-pop,j-pop"
# energy_pref = 0.648 → maps to "energetic" label
# mood_bias = {"focus": 0.459, "happy": 0.21, ...}

query_vector["genre:pop"]        += 0.5
query_vector["genre:indie"]      += 0.5   # cumulative! (+ 1.0 from explicit) = 1.5
query_vector["genre:show-tunes"] += 0.5
query_vector["energy:energetic"] += 0.5
query_vector["mood:focus"]       += 0.5 * 0.459 = 0.229   # cumulative with explicit
query_vector["mood:happy"]       += 0.5 * 0.21  = 0.105
query_vector["mood:sad"]         += 0.5 * 0.173 = 0.086
# etc.
```

**Layer 3 — Time context (weight = 0.3)**

A soft nudge based on historical listening at this time of day.

```python
# From time_context_profiles.json for "joseph" / "afternoon":
# top_genres = ["indie", "pop", "show-tunes", "indie-pop", "j-pop"]
# typical_mood = "focus"

query_vector["genre:indie"]      += 0.3   # cumulative (1.0 + 0.5 + 0.3 = 1.8 now)
query_vector["genre:pop"]        += 0.3
query_vector["mood:focus"]       += 0.3   # cumulative
```

**Cosine similarity:**

```
score_tfidf = dot(query_vector, song_vector) / (||query|| × ||song||)
```

This is normalized — a song with 2 matching features scores the same as a song with 10 matching features if the proportional alignment is equal. IDF ensures rare/specific features (like an artist match) contribute more than common features (like "focus" mood).

**Example full query vector (user "joseph", mood=focus, energy=calm, afternoon):**

```
feature                 weight
mood:focus              1.0 (explicit) + 0.229 (profile) + 0.3 (time) = 1.529
mood:happy              0.105 (profile)
mood:sad                0.086 (profile)
energy:calm             1.0 (explicit)
energy:energetic        0.5 (profile)
genre:indie             1.0 (explicit) + 0.5 (profile) + 0.3 (time) = 1.8
genre:pop               0.5 (profile) + 0.3 (time) = 0.8
genre:show-tunes        0.5 (profile) + 0.3 (time) = 0.8
```

---

#### Mechanism 2: Activity Audio Cosine Similarity (continuous features)

This is a **completely separate vector space** from TF-IDF. It uses Spotify's continuous audio features.

**Activity profiles** — target audio feature vectors:

| Activity | energy | danceability | valence | acousticness | tempo_norm |
|---|---|---|---|---|---|
| `workout` | 0.85 | 0.80 | 0.65 | 0.05 | 0.80 |
| `study` | 0.30 | 0.30 | 0.40 | 0.65 | 0.35 |
| `relax` | 0.20 | 0.30 | 0.55 | 0.80 | 0.25 |
| `commute` | 0.60 | 0.65 | 0.55 | 0.20 | 0.60 |
| `party` | 0.85 | 0.90 | 0.80 | 0.05 | 0.75 |
| `sleep` | 0.10 | 0.15 | 0.35 | 0.90 | 0.15 |

**Example — activity="study", song "Glimpse of Us" by Joji:**

```
Target (study):   {energy: 0.30, danceability: 0.30, valence: 0.40, acousticness: 0.65, tempo_norm: 0.35}
Song actual:      {energy: 0.317, danceability: 0.44, valence: 0.268, acousticness: 0.891, tempo_norm: 0.68}

activity_score = cosine(target, song_actual) ≈ 0.85  (high match — Joji fits study)
```

**Example — activity="workout", same song:**

```
Target (workout): {energy: 0.85, danceability: 0.80, valence: 0.65, acousticness: 0.05, tempo_norm: 0.80}
Song actual:      {energy: 0.317, ...}

activity_score ≈ 0.45  (low match — Joji does not fit workout)
```

---

#### Final Scoring Formula

```
# With activity:
score = 0.65 × tfidf_cosine + 0.25 × activity_audio_cosine + 0.10 × popularity_norm

# Without activity (auto-detected from time context or not provided):
score = 0.85 × tfidf_cosine + 0.15 × popularity_norm
```

Where `popularity_norm = song.popularity / 100` (Spotify's [0–100] score normalized to [0–1]).

---

#### Diversity — Greedy Artist Penalty

After scoring, a greedy pass prevents one artist from dominating the top-K results:

```python
artist_counts = {}

for song in sorted_by_score:
    repeat = artist_counts.get(song.artist, 0)
    final_score = base_score - 0.08 × repeat
    results.append(song)
    artist_counts[song.artist] = repeat + 1
```

Effect: the 2nd song from the same artist costs -0.08, the 3rd costs -0.16, etc. This allows better songs from a repeated artist to still win if they score high enough, while giving competitors a fair chance.

**Example:**

```
Sorted candidates:
  Bad Bunny - Tití Me Preguntó    score=0.91  → final=0.91  (first Bad Bunny)
  Bad Bunny - Moscow Mule         score=0.88  → final=0.80  (-0.08 penalty)
  Arctic Monkeys - Do I Wanna Know score=0.85 → final=0.85  (first Arctic Monkeys, no penalty)
  Bad Bunny - Neverita            score=0.83  → final=0.67  (-0.16 penalty)
```

Result order: Tití (0.91), Arctic Monkeys (0.85), Moscow Mule (0.80), ...

---

#### Output: Ranked Result Object

```python
{
    "track_id":     "3F5CgOj3wFlRv51JsHbxhe",
    "score":        0.8732,          # float, rounded to 4 decimal places
    "title":        "Jimmy Cooks",
    "artist":       "Drake",
    "genre":        "hip-hop",       # granular genre
    "main_genre":   "hip-hop",       # broad category
    "mood":         "focus",         # mood_bucket
    "energy_label": "medium",        # calm | medium | energetic
    "popularity":   91               # int [0–100]
}
```

---

### 6.4 Context

> **What is it?** The set of signals that describe the user's **current situation**, used to personalize recommendations beyond static taste preferences.

Context is not a single system — it appears across multiple layers of the engine.

---

#### Context Signal 1: Time of Day

**Source:** Server clock at request time.
**Type:** `str` enum — `"morning"` | `"afternoon"` | `"evening"` | `"night"`
**Detection:**
```python
hour = datetime.now().hour
if 5 <= hour < 12:   time_of_day = "morning"
elif 12 <= hour < 17: time_of_day = "afternoon"
elif 17 <= hour < 22: time_of_day = "evening"
else:                 time_of_day = "night"
```

**Effect:** Looks up `time_context_profiles[user_id][time_of_day]` and adds that time slot's `top_genres` and `typical_mood` to the query vector at weight 0.3. Also resolves `typical_activity` for the activity audio scoring.

**Example:** Joseph at 2pm (afternoon) → `typical_activity = "study"` is inferred even if he did not manually select an activity. The system then uses the study audio profile to score songs.

---

#### Context Signal 2: Explicit Activity

**Source:** User selects an activity in the Context Quiz or filter chips.
**Type:** `str` enum — `workout` | `study` | `relax` | `commute` | `party` | `sleep`
**Effect:** Triggers Mechanism 2 (activity audio cosine scoring). Overrides any inferred activity from time context.

**Example payload:**
```json
{
  "user_id": "joseph",
  "mood": "focus",
  "activity": "study",
  "time_of_day": "afternoon",
  "top_k": 10
}
```

---

#### Context Signal 3: Explicit Mood

**Source:** User selects mood in Context Quiz or filter chips.
**Type:** `str` enum — `happy` | `sad` | `chill` | `hype` | `focus`
**Effect:** Added to query vector at full weight (1.0) in Layer 1. Also combined additively with profile mood_bias in Layer 2.

---

#### Context Signal 4: Energy

**Source:** User selects energy filter.
**Type:** `str` — `calm` | `medium` | `energetic` (or aliases `low` | `high`)
**Effect:** Added to query vector at full weight (1.0). Also derived from `energy_pref` in user profile and added at 0.5× weight.

---

#### Context Signal 5: The Context Quiz (in-session context)

The 3-step Context Quiz is the UI mechanism for collecting real-time context. It captures:

1. **Step 1 — Mood**: "How are you feeling?" → one of 5 moods (required)
2. **Step 2 — Activity**: "What are you doing?" → one of 6 activities (required)
3. **Step 3 — Genre**: "What type of music?" → multi-select from 10 genres (optional)

The quiz result fires a POST to `/recommend/` with `mood`, `activity`, and `main_genres` all populated.

**Data types collected:**
```dart
// Flutter ContextQuizPage
String? _mood;       // "focus" | "happy" | "sad" | "chill" | "hype"
String? _activity;   // "study" | "workout" | "relax" | "commute" | "party" | "sleep"
Set<String> _genres; // {"rock", "indie", "pop", ...}  (multi-select)
```

---

#### Context Signal 6: Historical Listening Context

**Source:** Built from raw Spotify streaming history JSON files, condensed into `time_context_profiles.json`.
**Type:** Per-user, per-time-slot object.
**Fields:**

| Field | Type | Example | What it tells the engine |
|---|---|---|---|
| `typical_mood` | `str` | `"focus"` | Most common mood at this time slot |
| `mood_distribution` | `dict[str, float]` | `{"focus": 0.476, "happy": 0.183, ...}` | Full mood probability vector |
| `typical_activity` | `str` | `"study"` | Most common activity at this time slot |
| `activity_distribution` | `dict[str, float]` | `{"study": 0.82, "commute": 0.099, ...}` | Full activity probability vector |
| `top_genres` | `list[str]` | `["indie", "pop", "show-tunes"]` | Top 5 genres listened to at this slot |
| `event_count` | `int` | `17085` | How many listening events in this slot (confidence indicator) |
| `confidence` | `float` | `0.183` | Fraction of total events in this slot |

This context is the **memory** of the system. Without it, the engine knows your profile (static taste) and your current query (immediate intent). With it, the engine also knows your historical behavior at this specific time of day — making it context-aware rather than just preference-aware.

---

#### How All Context Signals Combine

```
Final query vector = Layer 1 (explicit, weight=1.0)
                   + Layer 2 (user profile, weight=0.5)
                   + Layer 3 (time context, weight=0.3)

Final score = 0.65 × TF-IDF cosine(query_vector, song_vector)
            + 0.25 × activity cosine(activity_profile, song_audio_features)   # if activity known
            + 0.10 × song.popularity / 100
```

**What each signal protects:**

| Signal | What it prevents |
|---|---|
| Layer 1 (explicit) | Ignoring what the user is asking for right now |
| Layer 2 (profile) | Returning songs that match mood/energy but are wrong genre for this user |
| Layer 3 (time) | Ignoring that this user historically listens to different things at night vs morning |
| Activity audio | Returning songs that are categorically correct (genre/mood) but wrong audio energy (e.g., calm jazz labeled "focus" returned for a workout query) |
| Popularity | Tie-breaking between equally scored unknown vs known songs |
| Diversity penalty | Returning all 10 results from the same artist |

---

## Summary: End-to-End Request Flow

```
User opens app at 2:15pm
    ↓
Flutter: GET /recommend/home/joseph?top_k=10
    ↓
Backend: hour=14 → time_of_day="afternoon"
    ↓
rank_songs(user_id="joseph", time_of_day="afternoon")
    ↓
[MATCHING] No explicit filters → load joseph's top_genres → retrieve_candidates(genres=["pop","indie",...])
           Returns ~18,000 candidate track IDs (UNION of genre indexes)
    ↓
[CONTEXT] time_context["joseph"]["afternoon"] → typical_activity="study", top_genres=["indie","pop",...], typical_mood="focus"
    ↓
[QUERY VECTOR]
    Layer 1: (empty — no explicit query)
    Layer 2: genre:pop += 0.5, genre:indie += 0.5, energy:energetic += 0.5, mood:focus += 0.229, ...
    Layer 3: genre:indie += 0.3, genre:pop += 0.3, mood:focus += 0.3
    ↓
[RANKING] For each of 18,000 candidates:
    tfidf  = cosine(query_vector, song_tfidf_vector)
    act    = cosine(study_profile, song_audio_vector)      # activity="study" from time context
    pop    = song.popularity / 100
    score  = 0.65*tfidf + 0.25*act + 0.10*pop
    ↓
[DIVERSITY] Sort by score, apply -0.08 per artist repeat
    ↓
Return top 10 results as JSON
    ↓
Flutter: render SongCard list
```

---

*JukeJam — CS 125 Next Generation Search Systems, Winter 2026*
