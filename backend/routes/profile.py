"""
Shared profile routes for JukeJam.

These endpoints work for ALL users (Spotify and manual).
Used to update fields that aren't filled during initial onboarding.
"""

from fastapi import APIRouter, HTTPException

from models.user_profile import ActivityUpdateRequest
from services.profile_builder import update_activity_preferences

router = APIRouter()

VALID_ACTIVITIES = {"study", "commute", "workout", "relax", "party", "sleep"}


@router.post("/activities")
def update_activities(req: ActivityUpdateRequest):
    """
    Update activity preferences for any user.
    Called after Spotify OAuth (which can't collect activities)
    or by manual users who want to change their activities later.
    """
    # validate activity values
    invalid = [a for a in req.activities if a not in VALID_ACTIVITIES]
    if invalid:
        raise HTTPException(400, f"Invalid activities: {invalid}. Must be from: {sorted(VALID_ACTIVITIES)}")

    updated = update_activity_preferences(req.user_id, req.activities)

    if not updated:
        raise HTTPException(404, f"User '{req.user_id}' not found. Complete onboarding first.")

    return {
        "message": f"Activities updated for {req.user_id}",
        "profile": updated,
    }
