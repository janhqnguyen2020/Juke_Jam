"""
JukeJam FastAPI Backend
App entry point — startup, CORS, health check, and router registration.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict
import ast
import csv
import json
import os
import secrets
import urllib.parse

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import httpx

load_dotenv()

import data
from musicSearch.music_search import load_indexes, load_catalog

from routes.search import router as search_router
from routes.recommend import router as recommend_router
from routes.users import router as users_router
from routes.spotify import router as spotify_router
from routes.evaluation import router as evaluation_router

# ---------------------
# Paths
# ---------------------
BASE_DIR = Path(__file__).resolve().parent.parent
INDEXES_PATH = BASE_DIR / "indexes" / "indexes.json"
TIME_CTX_PATH = BASE_DIR / "indexes" / "time_context_profiles.json"
CATALOG_CSV = BASE_DIR / "data" / "processed" / "SONG_CATALOG.csv"
PROFILES_CSV = BASE_DIR / "data" / "processed" / "USER_PROFILE.csv"

# ---------------------
# App setup
# ---------------------
app = FastAPI(title="JukeJam API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------
# Register routers
# ---------------------
app.include_router(search_router)
app.include_router(recommend_router)
app.include_router(users_router)
app.include_router(spotify_router)
app.include_router(evaluation_router)


# ---------------------
# Startup: load preprocessed data
# ---------------------
def _parse_dict_string(s: str) -> Dict[str, float]:
    """Parse strings like \"{'happy':0.15,'chill':0.55}\" into dicts."""
    try:
        return ast.literal_eval(s)
    except Exception:
        return {}


@app.on_event("startup")
def load_all_data():
    # 1. Inverted indexes (from index.ipynb)
    data.indexes.update(load_indexes(INDEXES_PATH))

    # 2. Song catalog lookup
    _, track_lookup_local = load_catalog(CATALOG_CSV)
    data.track_lookup.update(track_lookup_local)

    # 3. User profiles (from CSV)
    with open(PROFILES_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            uid = row["user_id"]
            data.user_profiles[uid.lower()] = {
                "user_id": uid,
                "top_genres": [g.strip() for g in row["top_genres"].split(",")],
                "preferred_moods": _parse_dict_string(row["preferred_moods"]),
                "avg_energy_preference": float(row["avg_energy_preference"]),
                "listening_time_profile": _parse_dict_string(row["listening_time_profile"]),
                "skip_rate": float(row["skip_rate"]),
                "platform_mix": _parse_dict_string(row["platform_mix"]),
            }

    # 4. Time-context profiles (from index.ipynb — preprocessed JSON)
    if TIME_CTX_PATH.exists():
        with open(TIME_CTX_PATH, "r", encoding="utf-8") as f:
            data.time_context_profiles.update(json.load(f))

    print(f"Loaded {len(data.track_lookup):,} songs, "
          f"{len(data.user_profiles)} users, "
          f"{len(data.time_context_profiles)} time-context profiles")


# ---------------------
# Spotify callback (must be at root /callback, not under /spotify prefix)
# ---------------------
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/callback")
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"


@app.get("/callback")
async def spotify_callback(code: str = None, error: str = None, state: str = None):
    """
    Spotify redirects here after user grants/denies permission.
    Exchanges the authorization code for access + refresh tokens.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"Spotify auth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": SPOTIFY_REDIRECT_URI,
                "client_id": SPOTIFY_CLIENT_ID,
                "client_secret": SPOTIFY_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Token exchange failed: {token_resp.text}")

    tokens = token_resp.json()
    access_token = tokens["access_token"]

    async with httpx.AsyncClient() as client:
        me_resp = await client.get(
            f"{SPOTIFY_API_BASE}/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if me_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch Spotify profile")

    me = me_resp.json()
    spotify_user_id = me["id"]

    data.spotify_tokens[spotify_user_id] = {
        "access_token": access_token,
        "refresh_token": tokens.get("refresh_token"),
        "display_name": me.get("display_name"),
    }

    return {
        "status": "ok",
        "spotify_user_id": spotify_user_id,
        "display_name": me.get("display_name"),
        "message": "Spotify connected! Use /spotify/profile/{spotify_user_id} to build your JukeJam profile.",
    }


# ---------------------
# Health check
# ---------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "songs_loaded": len(data.track_lookup),
        "users_loaded": len(data.user_profiles),
        "time_context_users": len(data.time_context_profiles),
        "index_keys": list(data.indexes.keys()),
    }


# ---------------------
# Run with: uvicorn main:app --reload --port 8000
# ---------------------
