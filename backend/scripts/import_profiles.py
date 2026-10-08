"""
One-time import: USER_PROFILE.csv + user_events.csv → Postgres (DATABASE_URL).

Run from the backend folder:
    python scripts/import_profiles.py

Safe to re-run: profiles are upserted by user_id, and user_events is replaced
wholesale (truncated, then reloaded from the CSV).
"""

import csv
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv

load_dotenv(BACKEND / ".env")

from services import db

DATA = BACKEND.parent / "data" / "processed"
PROFILES_CSV = DATA / "USER_PROFILE.csv"
EVENTS_CSV = DATA / "user_events.csv"


def main():
    if not db.enabled():
        sys.exit("DATABASE_URL is not set (add it to backend/.env)")

    db.init_db()

    with db.connect() as conn:  # one transaction: all-or-nothing
        with open(PROFILES_CSV, newline="", encoding="utf-8") as f:
            profiles = list(csv.DictReader(f))
        for p in profiles:
            db.upsert_profile(p, conn=conn)
        print(f"Profiles upserted: {len(profiles)}")

        conn.execute("TRUNCATE user_events RESTART IDENTITY")
        n = 0
        with open(EVENTS_CSV, newline="", encoding="utf-8") as f, \
             conn.cursor().copy(f"COPY user_events ({', '.join(db.EVENT_FIELDS)}) FROM STDIN") as copy:
            for row in csv.DictReader(f):
                ev = db.parse_event_row(row)
                copy.write_row([ev[c] for c in db.EVENT_FIELDS])
                n += 1
        print(f"Events loaded: {n}")

    with db.connect() as conn:
        for table in ("user_profiles", "user_events"):
            count = conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            print(f"{table}: {count} rows")


if __name__ == "__main__":
    main()
