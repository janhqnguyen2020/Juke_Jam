from __future__ import annotations

"""
Spotify API Communication layer

All HTTP communication calls to spotify live here
routes never touch httpx directly - they call these functions instead
"""

import os
import time
import base64
import asyncio

import httpx
from fastapi import HTTPException

# ---- spotify credentials from .env ----
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/spotify/callback")

TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE_URL = "https://api.spotify.com/v1"

# ---- one shared HTTP client ----
# Creating an AsyncClient builds a new SSL context (slow, and it blocks the
# event loop) and opens a fresh TLS connection. Reusing one client keeps the
# connection to Spotify open, so each call is a single round trip.
_http: httpx.AsyncClient | None = None

def _client() -> httpx.AsyncClient:
    global _http
    if _http is None or _http.is_closed:
        _http = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _http

async def close_client():
    """Close the shared client (called on app shutdown)."""
    global _http
    if _http is not None and not _http.is_closed:
        await _http.aclose()
    _http = None

async def exchange_code_for_token(code: str) -> str:
    """
    exchange an authorization code for an access token.
    """
    response = await _client().post(TOKEN_URL, data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
    })

    if response.status_code != 200:
        raise HTTPException(400, f"Token exchange failed: {response.text}")
    
    return response.json()["access_token"]

async def spotify_get(endpoint: str, token: str, params: dict = None):
    """
    Make an authenticated GET request to spotify api"""
    response = await _client().get(
        f"{API_BASE_URL}{endpoint}",
        headers = {"Authorization" : f"Bearer {token}"},
        params = params or {},
    )

    if response.status_code == 401:
        raise HTTPException(401, "Spotify token expired. Re-login at /spotify/login")
    if response.status_code != 200:
        print(f"[SPOTIFY ERROR] {endpoint} returned {response.status_code}: {response.text}")
        raise HTTPException(response.status_code, f"Spotify API error: {response.text}")
    
    return response.json()

async def get_current_user(token: str):
    """
    GET /me - returns Spotify user profile info
    """

    return await spotify_get("/me", token)

async def get_top_tracks(token: str, time_range: str = "medium_term", limit: int = 50):
    """
    GET /me/top/tracks - returns user's top tracks."""

    return await spotify_get("/me/top/tracks",
                             token, {"time_range": time_range,
                                     "limit": limit}, )

async def get_top_artists(token: str, time_range: str = "medium_term", limit: int = 50):
    """
    GET /me/top/artists - returns user's top artists."""

    return await spotify_get("/me/top/artists",
                             token, {"time_range": time_range,
                                     "limit": limit}, )

# ── Client Credentials (no user login needed) ──────────────────────────────────
_client_token: str | None = None
_token_expires_at: float = 0.0
_token_lock = asyncio.Lock()   # so ten parallel art requests fetch one token, not ten

async def get_client_token() -> str:
    """Get/refresh an app-level token using Client Credentials flow."""
    global _client_token, _token_expires_at
    if _client_token and time.time() < _token_expires_at - 60:
        return _client_token
    async with _token_lock:
        if _client_token and time.time() < _token_expires_at - 60:
            return _client_token   # another request refreshed it while we waited
        credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
        response = await _client().post(
            TOKEN_URL,
            headers={"Authorization": f"Basic {credentials}"},
            data={"grant_type": "client_credentials"},
        )
        if response.status_code != 200:
            raise HTTPException(500, f"Client credentials failed: {response.text}")
        data = response.json()
        _client_token = data["access_token"]
        _token_expires_at = time.time() + data["expires_in"]
        return _client_token

# Album art URLs never change for a track, so remember them. Only real answers
# are cached (a URL, or "Spotify says this track has no image"); errors are not,
# so a temporary failure is retried next time. Capped to bound memory.
_art_cache: dict[str, str | None] = {}
_ART_CACHE_MAX = 20_000

async def get_track_art(track_id: str) -> str | None:
    """Return the 300×300 album art URL for a track, or None on any error."""
    if track_id in _art_cache:
        return _art_cache[track_id]
    try:
        token = await get_client_token()
        data = await spotify_get(f"/tracks/{track_id}", token)
    except Exception:
        return None
    images = data.get("album", {}).get("images", [])
    if len(images) >= 2:
        url = images[1]["url"]   # index 1 = 300×300
    else:
        url = images[0]["url"] if images else None
    if len(_art_cache) >= _ART_CACHE_MAX:
        _art_cache.pop(next(iter(_art_cache)))   # drop the oldest entry
    _art_cache[track_id] = url
    return url

async def get_audio_features(token: str, track_ids: list[str]):
    """
    GET /audio-features - returns audio features for a list of track ids."""

    ids = ",".join(track_ids)

    return await spotify_get("/audio-features", token, {"ids": ids})

