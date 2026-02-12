"""Spotify OAuth endpoints: login, callback, profile building."""

from datetime import datetime
from typing import Dict
import os
import secrets
import urllib.parse

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import httpx

import data
from musicSearch.music_search import hour_to_timeslot

router = APIRouter(prefix="/spotify")

# Spotify config (loaded from env)
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/callback")

AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE = "https://api.spotify.com/v1"

SCOPES = " ".join([
    "user-top-read",
    "user-read-recently-played",
    "user-read-private",
    "user-library-read",
])


async def _spotify_get(endpoint: str, access_token: str, params: dict = None) -> dict:
    """Helper to make authenticated GET requests to Spotify API."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}{endpoint}",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Spotify token expired. Re-login at /spotify/login")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Spotify API error: {resp.text}")
    return resp.json()


@router.get("/login")
def spotify_login():
    """Redirect user to Spotify's authorization page."""
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
    }
    url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


@router.get("/profile/{spotify_user_id}")
async def spotify_profile(spotify_user_id: str):
    """
    Pull the user's Spotify data and build a JukeJam user profile.
    Fetches top artists (genres), top tracks + audio features (mood/energy),
    and recently played (time context).
    """
    token_data = data.spotify_tokens.get(spotify_user_id)
    if not token_data:
        raise HTTPException(status_code=404, detail="User not connected. Visit /spotify/login first.")

    access_token = token_data["access_token"]

    # Fetch top artists and top tracks
    top_artists = await _spotify_get("/me/top/artists", access_token, {"limit": 20, "time_range": "medium_term"})
    top_tracks = await _spotify_get("/me/top/tracks", access_token, {"limit": 50, "time_range": "medium_term"})

    # Extract genres from top artists
    genre_counts: Dict[str, int] = {}
    for artist in top_artists.get("items", []):
        for genre in artist.get("genres", []):
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
    top_genres = sorted(genre_counts, key=genre_counts.get, reverse=True)[:5]

    # Get audio features for top tracks
    track_ids = [t["id"] for t in top_tracks.get("items", []) if t.get("id")]
    audio_features = []
    if track_ids:
        features_resp = await _spotify_get("/audio-features", access_token, {"ids": ",".join(track_ids[:100])})
        audio_features = [f for f in features_resp.get("audio_features", []) if f]

    # Compute average audio profile
    if audio_features:
        avg_energy = sum(f["energy"] for f in audio_features) / len(audio_features)
        avg_valence = sum(f["valence"] for f in audio_features) / len(audio_features)
        avg_danceability = sum(f["danceability"] for f in audio_features) / len(audio_features)
    else:
        avg_energy = 0.5
        avg_valence = 0.5
        avg_danceability = 0.5

    # Map valence to mood preferences
    if avg_valence > 0.65:
        preferred_moods = {"happy": 0.4, "hype": 0.3, "chill": 0.2, "sad": 0.1}
    elif avg_valence > 0.45:
        preferred_moods = {"chill": 0.35, "happy": 0.3, "hype": 0.2, "sad": 0.15}
    else:
        preferred_moods = {"sad": 0.35, "chill": 0.3, "happy": 0.2, "hype": 0.15}

    # Build time-context from recently played tracks
    recently_played = await _spotify_get("/me/player/recently-played", access_token, {"limit": 50})

    timeslot_tracks: Dict[str, list] = {}
    for item in recently_played.get("items", []):
        played_at = item.get("played_at", "")
        if played_at:
            try:
                hour = datetime.fromisoformat(played_at.replace("Z", "+00:00")).hour
            except (ValueError, AttributeError):
                continue
            ts = hour_to_timeslot(hour)
            tid = item.get("track", {}).get("id")
            if tid:
                timeslot_tracks.setdefault(ts, []).append(tid)

    all_recent_ids = list({tid for tids in timeslot_tracks.values() for tid in tids})
    recent_features_map: Dict[str, Dict] = {}
    if all_recent_ids:
        recent_feat_resp = await _spotify_get("/audio-features", access_token, {"ids": ",".join(all_recent_ids[:100])})
        for feat in recent_feat_resp.get("audio_features", []):
            if feat:
                recent_features_map[feat["id"]] = feat

    spotify_time_ctx: Dict[str, Dict] = {}
    for ts, tids in timeslot_tracks.items():
        feats = [recent_features_map[t] for t in tids if t in recent_features_map]
        if feats:
            ts_avg_valence = sum(f["valence"] for f in feats) / len(feats)
            ts_avg_energy = sum(f["energy"] for f in feats) / len(feats)

            if ts_avg_valence > 0.65 and ts_avg_energy > 0.65:
                inferred_mood = "hype"
            elif ts_avg_valence > 0.55:
                inferred_mood = "happy"
            elif ts_avg_energy < 0.35:
                inferred_mood = "sad"
            elif ts_avg_valence < 0.40:
                inferred_mood = "focus"
            else:
                inferred_mood = "chill"

            if ts_avg_energy > 0.7:
                inferred_activity = "workout"
            elif ts_avg_energy < 0.3:
                inferred_activity = "relax"
            elif ts_avg_energy < 0.45:
                inferred_activity = "study"
            else:
                inferred_activity = "commute"

            spotify_time_ctx[ts] = {
                "typical_mood": inferred_mood,
                "typical_activity": inferred_activity,
                "top_genres": top_genres,
                "event_count": len(feats),
                "confidence": round(len(feats) / max(len(all_recent_ids), 1), 3),
            }

    # Store user profile
    profile = {
        "user_id": spotify_user_id,
        "top_genres": top_genres,
        "preferred_moods": preferred_moods,
        "avg_energy_preference": round(avg_energy, 3),
        "listening_time_profile": {"morning": 0.33, "afternoon": 0.34, "night": 0.33},
        "skip_rate": 0.0,
        "platform_mix": {"mobile": 1.0},
    }
    data.user_profiles[spotify_user_id.lower()] = profile

    # Store time context
    if spotify_time_ctx:
        data.time_context_profiles[spotify_user_id.lower()] = spotify_time_ctx

    return {
        "status": "ok",
        "profile": profile,
        "time_context": spotify_time_ctx or "No recent listening data — auto-suggest will use defaults",
        "spotify_stats": {
            "top_artists": [a["name"] for a in top_artists.get("items", [])[:5]],
            "top_tracks": [f"{t['name']} - {t['artists'][0]['name']}" for t in top_tracks.get("items", [])[:5]],
            "avg_energy": round(avg_energy, 3),
            "avg_valence": round(avg_valence, 3),
            "avg_danceability": round(avg_danceability, 3),
            "genre_count": len(genre_counts),
        },
    }
