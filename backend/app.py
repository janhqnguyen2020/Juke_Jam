import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes.spotify import router as spotify_router
from routes.manual import router as manual_router
from routes.profile import router as profile_router
from routes.recommend import router as recommend_router

from services import db
from services.recommender import load_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once at startup: build TF-IDF song vectors, load catalog/profiles.
    # This takes ~5-10 seconds but keeps all requests fast afterward.
    if db.enabled():
        db.init_db()   # create user_profiles / user_events tables if missing
    load_all()
    yield


app = FastAPI(title="JukeJam API", lifespan=lifespan)

# Comma-separated list, e.g. "https://jukejam.vercel.app,http://localhost:3000".
# Defaults to "*" so local dev works without extra setup.
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(spotify_router,  prefix="/spotify")
app.include_router(manual_router,   prefix="/manual")
app.include_router(profile_router,  prefix="/profile")
app.include_router(recommend_router, prefix="/recommend")   # new


@app.get("/")
def root():
    return {"Status": "JukeJam API is running!"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
