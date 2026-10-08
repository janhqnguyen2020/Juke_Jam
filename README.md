# Juke_Jam
Project for COMPSCI 125: a context-aware music recommendation engine.
See [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) for how the recommender works.

## Run locally

**1. Backend** (Python 3.11, port 8000)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt # add requirements-notebooks.txt to run the notebooks
uvicorn app:app --reload --port 8000
```
Wait for `[RECOMMENDER] Ready.` in the log. Spotify login needs a `backend/.env` file:
```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/spotify/callback
```
Optional: `FRONTEND_URL` (default `http://localhost:3000`) and `ALLOWED_ORIGINS` (default `*`).

**Database (optional locally).** With `DATABASE_URL` set (Neon pooled string, `?sslmode=require`), user
profiles and listening events are read from and written to Postgres, and tables are created on startup.
Without it, the backend uses `data/processed/USER_PROFILE.csv` and `user_events.csv`. The song catalog
and indexes are always files. To copy the CSVs into a fresh database (safe to re-run):
```bash
python scripts/import_profiles.py
```

**2. Frontend** (Node 20+, port 3000)
```bash
cd jukejam-frontend
npm install
npm run dev
```
Open http://localhost:3000. The frontend calls `http://localhost:8000` unless `NEXT_PUBLIC_API_URL` is set.

## Secrets
- Real keys live only in `backend/.env` (local) or the hosting dashboard (prod). All `.env` files are gitignored.
- Never put secrets in `NEXT_PUBLIC_*` variables: they are bundled into browser JS.

## Deploy
**Backend → Render.** New → Blueprint → select this repo (uses [render.yaml](render.yaml)). Set these in the dashboard:

| Variable | Value |
|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | from the Spotify developer dashboard |
| `SPOTIFY_REDIRECT_URI` | `https://<backend>.onrender.com/spotify/callback` |
| `FRONTEND_URL` | `https://<app>.vercel.app` |
| `ALLOWED_ORIGINS` | `https://<app>.vercel.app` |
| `DATABASE_URL` | Neon pooled connection string |

**Frontend → Vercel.** Import the repo, set **Root Directory** to `jukejam-frontend`, and add
`NEXT_PUBLIC_API_URL=https://<backend>.onrender.com`.

**Spotify dashboard.** Add the production `SPOTIFY_REDIRECT_URI` under Redirect URIs. In development mode,
only accounts added to the app's user list can log in.

Set `DATABASE_URL` on Render so new profiles persist. Without it, they're written to the CSV on Render's
disk and lost on every restart or redeploy.
