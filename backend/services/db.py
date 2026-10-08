"""
Postgres storage for user profiles and listening events (Neon).

Enabled when DATABASE_URL is set; otherwise callers fall back to the CSVs in
data/processed/. The song catalog and indexes stay as files either way.

Profiles are returned in the same shape as USER_PROFILE.csv rows
(top_genres / activity_preferences as comma strings, mood_bias as a JSON string)
so the recommender doesn't care where they came from.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row

PROFILE_FIELDS = [
    "user_id", "top_genres", "energy_pref", "valence_pref", "danceability_pref",
    "acousticness_pref", "tempo_pref", "mood_bias", "activity_preferences", "onboarding_source",
]
PREF_FIELDS = ["energy_pref", "valence_pref", "danceability_pref", "acousticness_pref", "tempo_pref"]

EVENT_FIELDS = [
    "user_id", "spotify_id", "ts", "event_type", "ms_played", "skipped", "shuffle",
    "platform", "reason_end", "time_of_day", "session_id", "completion_ratio",
    "like_proxy", "inferred_mood", "user_mood_state",
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id              TEXT PRIMARY KEY,
    top_genres           TEXT NOT NULL DEFAULT '',
    energy_pref          DOUBLE PRECISION,
    valence_pref         DOUBLE PRECISION,
    danceability_pref    DOUBLE PRECISION,
    acousticness_pref    DOUBLE PRECISION,
    tempo_pref           DOUBLE PRECISION,
    mood_bias            JSONB,
    activity_preferences TEXT NOT NULL DEFAULT '',
    onboarding_source    TEXT,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_events (
    id               BIGSERIAL PRIMARY KEY,
    user_id          TEXT NOT NULL,
    spotify_id       TEXT NOT NULL,
    ts               TIMESTAMPTZ,
    event_type       TEXT,
    ms_played        INTEGER,
    skipped          BOOLEAN,
    shuffle          BOOLEAN,
    platform         TEXT,
    reason_end       TEXT,
    time_of_day      TEXT,
    session_id       INTEGER,
    completion_ratio DOUBLE PRECISION,
    like_proxy       SMALLINT,
    inferred_mood    TEXT,
    user_mood_state  TEXT
);

CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON user_events (user_id);
"""


def enabled() -> bool:
    return bool(os.getenv("DATABASE_URL"))


def connect() -> psycopg.Connection:
    # prepare_threshold=None: Neon's pooled endpoint is PgBouncer (transaction mode),
    # where server-side prepared statements aren't reliable.
    return psycopg.connect(os.environ["DATABASE_URL"], prepare_threshold=None, connect_timeout=15)


def init_db():
    """Create tables if they don't exist (safe to run on every startup)."""
    with connect() as conn:
        conn.execute(SCHEMA)


# ── Profiles ───────────────────────────────────────────────────────────────────

def _profile_params(profile: dict) -> dict:
    params = {f: profile.get(f) for f in PROFILE_FIELDS}
    for f in PREF_FIELDS:
        params[f] = float(params[f]) if params[f] not in (None, "") else None
    mood_bias = params["mood_bias"]
    if isinstance(mood_bias, dict):
        mood_bias = json.dumps(mood_bias)
    params["mood_bias"] = mood_bias or None
    params["top_genres"] = params["top_genres"] or ""
    params["activity_preferences"] = params["activity_preferences"] or ""
    return params


def _profile_row(row: dict) -> dict:
    """DB row → USER_PROFILE.csv-shaped dict."""
    profile = {f: row[f] for f in PROFILE_FIELDS}
    profile["mood_bias"] = json.dumps(row["mood_bias"]) if row["mood_bias"] is not None else ""
    return profile


def fetch_profiles() -> list[dict]:
    with connect() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(f"SELECT {', '.join(PROFILE_FIELDS)} FROM user_profiles")
        return [_profile_row(r) for r in cur]


def upsert_profile(profile: dict, conn: psycopg.Connection | None = None):
    """Insert a profile, or replace it if user_id already exists."""
    cols = ", ".join(PROFILE_FIELDS)
    vals = ", ".join(f"%({f})s::jsonb" if f == "mood_bias" else f"%({f})s" for f in PROFILE_FIELDS)
    updates = ", ".join(f"{f} = EXCLUDED.{f}" for f in PROFILE_FIELDS if f != "user_id")
    sql = (f"INSERT INTO user_profiles ({cols}) VALUES ({vals}) "
           f"ON CONFLICT (user_id) DO UPDATE SET {updates}, updated_at = now()")
    if conn is not None:
        conn.execute(sql, _profile_params(profile))
        return
    with connect() as conn:
        conn.execute(sql, _profile_params(profile))


def update_activity_preferences(user_id: str, activities: str) -> dict | None:
    """Set activity_preferences (comma string). Returns the updated profile, or None if not found."""
    with connect() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            f"UPDATE user_profiles SET activity_preferences = %s, updated_at = now() "
            f"WHERE user_id = %s RETURNING {', '.join(PROFILE_FIELDS)}",
            (activities, user_id),
        )
        row = cur.fetchone()
        return _profile_row(row) if row else None


# ── Events ─────────────────────────────────────────────────────────────────────

def _opt(cast, value: str):
    value = (value or "").strip()
    return cast(value) if value else None


def _bool(value: str):
    value = (value or "").strip().lower()
    return None if not value else value == "true"


def parse_event_row(row: dict) -> dict:
    """user_events.csv row (all strings) → typed event dict keyed by EVENT_FIELDS."""
    try:
        ts = _opt(datetime.fromisoformat, row.get("timestamp"))
    except ValueError:
        ts = None  # recommender treats unknown timestamps as a year old
    if ts is not None and ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return {
        "user_id":          (row.get("user_id") or "").strip(),
        "spotify_id":       (row.get("spotify_id") or "").strip(),
        "ts":               ts,
        "event_type":       _opt(str, row.get("event_type")),
        "ms_played":        _opt(int, row.get("ms_played")),
        "skipped":          _bool(row.get("skipped")),
        "shuffle":          _bool(row.get("shuffle")),
        "platform":         _opt(str, row.get("platform")),
        "reason_end":       _opt(str, row.get("reason_end")),
        "time_of_day":      _opt(str, row.get("time_of_day")),
        "session_id":       _opt(int, row.get("session_id")),
        "completion_ratio": _opt(float, row.get("completion_ratio")),
        "like_proxy":       _opt(int, row.get("like_proxy")),
        "inferred_mood":    _opt(str, row.get("inferred_mood")),
        "user_mood_state":  _opt(str, row.get("user_mood_state")),
    }


def fetch_events():
    """Yield typed event dicts (only the columns the recommender uses)."""
    cols = "user_id, spotify_id, ts, skipped, like_proxy, completion_ratio, ms_played, session_id"
    # Named (server-side) cursor streams rows in batches instead of loading ~190k at once.
    with connect() as conn, conn.cursor(name="user_events_stream", row_factory=dict_row) as cur:
        cur.itersize = 10_000
        cur.execute(f"SELECT {cols} FROM user_events")
        yield from cur
