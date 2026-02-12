"""
Shared in-memory data stores for JukeJam backend.
All route modules import from here to access loaded data.
"""

from typing import Dict

# Loaded at startup from JSON / CSV files
indexes: Dict = {}
track_lookup: Dict = {}
user_profiles: Dict[str, Dict] = {}
time_context_profiles: Dict[str, Dict] = {}

# Runtime stores (populated when users connect Spotify)
spotify_tokens: Dict[str, Dict] = {}
