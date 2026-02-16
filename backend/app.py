from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

#load environment variables from .env file
load_dotenv()

from routes.spotify import router as spotify_router
from routes.manual import router as manual_router
from routes.profile import router as profile_router

app = FastAPI(title="JukeJam API")

#allow frontend to call this API from any origin
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

#all routes live under /spotify/... /manual/... /profile/...
app.include_router(spotify_router, prefix="/spotify")
app.include_router(manual_router, prefix="/manual")
app.include_router(profile_router, prefix="/profile")

@app.get("/")
def root():
    return {"Status": "JukeJam API is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)