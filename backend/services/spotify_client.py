from __future__ import annotations

"""
Spotify API Communication layer

All HTTP communication calls to spotify live here
routes never touch httpx directly - they call these functions instead
"""

import os
import time
import base64

import httpx
from fastapi import HTTPException

# ---- spotify credentials from .env ----
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/spotify/callback")

TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE_URL = "https://api.spotify.com/v1"

async def exchange_code_for_token(code: str) -> str:
    """
    exchange an authorization code for an access token.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(TOKEN_URL, data = {
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
    async with httpx.AsyncClient() as client:
        response = await client.get(
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

async def get_client_token() -> str:
    """Get/refresh an app-level token using Client Credentials flow."""
    global _client_token, _token_expires_at
    if _client_token and time.time() < _token_expires_at - 60:
        return _client_token
    credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    async with httpx.AsyncClient() as client:
        response = await client.post(
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

async def get_track_art(track_id: str) -> str | None:
    """Return the 300×300 album art URL for a track, or None on any error."""
    try:
        token = await get_client_token()
        data = await spotify_get(f"/tracks/{track_id}", token)
        images = data.get("album", {}).get("images", [])
        if len(images) >= 2:
            return images[1]["url"]   # index 1 = 300×300
        return images[0]["url"] if images else None
    except Exception:
        return None

async def get_audio_features(token: str, track_ids: list[str]):
    """
    GET /audio-features - returns audio features for a list of track ids."""

    ids = ",".join(track_ids)

    return await spotify_get("/audio-features", token, {"ids": ids})

