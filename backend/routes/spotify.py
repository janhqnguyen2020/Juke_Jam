"""
Spotify OAuth routes for JukeJam

ROUTES only - all spotify API calls live in services/spotify_client.py
all profile logic lives n services/profile_builder.py
"""

import os # for env vars
from urllib.parse import urlencode # for building query strings

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from services.spotify_client import (
    exchange_code_for_token, get_current_user,
    get_top_artists, get_top_tracks, get_track_art,
)

from services.profile_builder import (
    build_spotify_profile, save_profile,
    lookup_audio_features, lookup_by_artist_names,
    genre_fallback_features,
)

router = APIRouter()

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URL", "http://127.0.0.1:8000/spotify/callback")
AUTH_URL = "https://accounts.spotify.com/authorize"

SCOPES = " ".join([
    "user-top-read",        # to get user's top artists and tracks
    "user-library-read",    # to get user's saved tracks (for better audio features),
    "user-read-recently-played",    # to get user's recently played tracks (for better audio features),
])

# ---- Route 1: Login -> redirect to Spotify auth page ----
@router.get("/login")
def login():
    params = urlencode({
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
    })

    return RedirectResponse(f"{AUTH_URL}?{params}")

# ---- Route 2: Callback -> exchange code, build profile ----
@router.get("/callback")
async def callback(code: str):
    #step 1: get access token
    access_token = await exchange_code_for_token(code)

    #step 2: pull user data from spotify
    me = await get_current_user(access_token)
    user_id = me["id"]

    top_artists = await get_top_artists(access_token)
    top_tracks = await get_top_tracks(access_token)

    track_ids = [t["id"] for t in top_tracks.get("items", [])]
    if not track_ids:
        raise HTTPException(400, "No top tracks found for user. Listen to more music first!")

    #step 3: look up audio features from our own catalog (Spotify API blocked this)
    # fallback chain: track_id match -> artist name match -> genre averages
    catalog_genres = []
    features = lookup_audio_features(track_ids)

    if len(features) < 5:
        artist_names = [a["name"] for a in top_artists.get("items", [])]
        features, catalog_genres = lookup_by_artist_names(artist_names)

    if len(features) < 5:
        genres = []
        for artist in top_artists.get("items", []):
            genres.extend(artist.get("genres", []))
        features = genre_fallback_features(genres[:5])

    #step 4: build profile dict, save to csv
    profile = build_spotify_profile(user_id, top_artists, features, catalog_genres)
    # Default all activities so the home feed has context from day one
    profile["activity_preferences"] = "workout,study,commute,relax,party,sleep"
    save_profile(profile)

    # Redirect to frontend home — user_id passed as query param for localStorage
    return RedirectResponse(f"http://localhost:3000/home?user_id={user_id}")

# ---- Route 3: Album art proxy ----
@router.get("/art/{track_id}")
async def track_art(track_id: str):
    url = await get_track_art(track_id)
    if not url:
        raise HTTPException(404, "Album art not found")
    return {"url": url}