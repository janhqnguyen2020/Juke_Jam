"""
POST /feedback — record a like or skip from the web app.

Inserts exactly one row into the existing user_events table. No schema or
ranking-formula changes:
  - skip → skipped=true, ms_played=0, like_proxy=0 (the recommender's existing
           skip signal). Also applied in memory so the next request reflects it.
  - like → event_type='like' only. like_proxy is left NULL on purpose: the
           recommender treats like_proxy=1 as "already played a lot" and adds a
           small novelty penalty, which would push a liked song DOWN.
"""

import logging
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import db
from services.recommender import VALID_TIME_OF_DAY, record_skip

router = APIRouter()
log = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=200)
    track_id: str = Field(min_length=1, max_length=64)
    action: Literal["like", "skip"]
    time_of_day: Optional[str] = None


@router.post("/feedback")
def feedback(req: FeedbackRequest):
    time_of_day = req.time_of_day if req.time_of_day in VALID_TIME_OF_DAY else None
    skip = req.action == "skip"
    event = {
        "user_id":     req.user_id,
        "spotify_id":  req.track_id,
        "ts":          datetime.now(timezone.utc),
        "event_type":  req.action,
        "skipped":     skip,
        "ms_played":   0 if skip else None,
        "like_proxy":  0 if skip else None,
        "platform":    "jukejam_web",
        "reason_end":  "feedback",
        "time_of_day": time_of_day,
    }

    stored = False
    if db.enabled():
        try:
            db.insert_event(event)
            stored = True
        except Exception:
            log.exception("feedback insert failed")
            raise HTTPException(503, "Could not save feedback right now.")

    if skip:
        record_skip(req.user_id, req.track_id)

    return {"ok": True, "stored": stored, "action": req.action}
