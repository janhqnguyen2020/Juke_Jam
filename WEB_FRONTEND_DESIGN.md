# JukeJam — Web Frontend Design Plan (Next.js / React)

> CS 125 · Next Generation Search Systems · Team: Juke Jam
> Migration plan: Flutter → Next.js / React web app
> Last updated: 2026-02-24

---

## Table of Contents

1. [Pages and Components Overview](#1-pages-and-components-overview)
2. [Page 1 — Landing (`/`)](#2-page-1--landing-)
3. [Page 2 — Spotify Onboarding (`/onboarding/spotify`)](#3-page-2--spotify-onboarding-onboardingspotify)
4. [Page 3 — Manual Onboarding (`/onboarding/manual`)](#4-page-3--manual-onboarding-onboardingmanual)
5. [Page 4 — Home Feed (`/home`)](#5-page-4--home-feed-home)
6. [Page 5 — Context Quiz (`/quiz`)](#6-page-5--context-quiz-quiz)
7. [Page 6 — Song Detail (`/song/[track_id]`)](#7-page-6--song-detail-songtrack_id)
8. [Shared Component Specs](#8-shared-component-specs)
9. [State Management Reference](#9-state-management-reference)
10. [API Contract (what the frontend consumes)](#10-api-contract-what-the-frontend-consumes)

---

## 1. Pages and Components Overview

### Pages (Routes) — 6 total

| # | Route | Maps from Flutter | Purpose |
|---|---|---|---|
| 1 | `/` | `title_page.dart` | Landing — choose how to onboard |
| 2 | `/onboarding/spotify` | `onboarding_spotify_page.dart` | Spotify OAuth redirect + waiting state |
| 3 | `/onboarding/manual` | `onboarding_manual_page.dart` | Manual quiz form |
| 4 | `/home` | `home_page.dart` | Main feed — personalized recommendations |
| 5 | `/quiz` | `context_quiz_page.dart` | Context quiz — 3-step mood/activity/genre picker |
| 6 | `/song/[track_id]` | `song_card.dart` (expanded) | Song detail — "Why this?" + score debug view |

### Shared Components — 10 total

| Component | Maps from Flutter | Used on Pages |
|---|---|---|
| `SongCard` | `song_card.dart` | Home, Song Detail |
| `FilterChipRow` | `filter_chip_row.dart` | Home |
| `ContextBanner` | *(new — was inline in home_page)* | Home |
| `ScoreBreakdown` | *(score debug view)* | SongCard expanded, Song Detail |
| `VectorBlendBar` | *(vector blending visualization)* | Song Detail |
| `MoodPicker` | *(inline in context_quiz_page)* | Quiz step 1 |
| `ActivityPicker` | *(inline in context_quiz_page)* | Quiz step 2 |
| `GenrePicker` | *(inline in context_quiz + onboarding)* | Quiz step 3, Manual Onboarding |
| `NavBar` | *(none — Flutter used bottom nav)* | All authenticated pages |
| `OnboardingProgressBar` | *(none — Flutter used stepper)* | Manual Onboarding |

---

## 2. Page 1 — Landing (`/`)

**Purpose:** First thing the user sees. Two paths into the app: connect Spotify (OAuth) or fill out a manual quiz. Must communicate what JukeJam is and why it is different from Spotify's own recommendations.

**What the designer needs to specify:**
- Hero headline and subtext (brand copy)
- Two CTA buttons — Spotify green for OAuth, neutral for manual
- Dark background (consistent with existing Flutter dark theme)
- Trust/privacy disclaimer below buttons

### Fields and Data Types

| Element | Type | Example Value | Why It Exists |
|---|---|---|---|
| App logo / wordmark | `image` | `JukeJam` | Brand identity |
| Hero headline | `string` | `"Music that knows the moment."` | Communicates core value proposition |
| Subtext | `string` | `"Recommendations based on who you are, what you're doing, and when."` | Differentiates from generic streaming |
| Spotify CTA button | `button` → `GET /spotify/login` | `"Connect with Spotify"` | Primary onboarding path — reads top artists and tracks |
| Manual CTA button | `button` → `/onboarding/manual` | `"Set up manually"` | Fallback for users without Spotify or who want control |
| Privacy disclaimer | `string` | `"We never store your Spotify password."` | Trust and privacy reassurance |

### Mock Layout

```
┌──────────────────────────────────────────┐
│                                          │
│              JukeJam                     │
│                                          │
│    "Music that knows the moment."        │
│    Recommendations powered by context,   │
│    taste, and time of day.               │
│                                          │
│    [    Connect with Spotify    ]  green │
│    [      Set up manually       ]  gray  │
│                                          │
│    We never store your Spotify password. │
└──────────────────────────────────────────┘
```

---

## 3. Page 2 — Spotify Onboarding (`/onboarding/spotify`)

**Purpose:** The user clicked "Connect with Spotify." They get redirected to Spotify's OAuth page, then return to this route at the callback URL. The backend (`GET /spotify/callback`) creates their profile from top artists and tracks. This page shows a loading state while that happens, then redirects to `/home`.

**Backend route:** `GET /spotify/login` → Spotify OAuth → `GET /spotify/callback` → profile saved → redirect to `/home`

**What the designer needs to specify:**
- A single status screen with three distinct states: `redirecting`, `building_profile`, `complete`
- Animated spinner or progress indicator
- Error state with retry button

### Fields and Data Types

| Element | Type | Possible Values | Why It Exists |
|---|---|---|---|
| Status message | `string` (state-driven) | `"Connecting to Spotify..."` / `"Building your profile..."` / `"You're all set!"` | Tells the user what is happening — OAuth can take 3–5 seconds |
| Spinner | `boolean` isLoading | `true` / `false` | Visual feedback so user doesn't think the page froze |
| Error message | `string \| null` | `"Could not connect. Try again."` | Graceful failure — Spotify API can fail or be rate-limited |
| Retry button | `button` | `"Try again"` → `GET /spotify/login` | Shown only on error state |
| Profile preview (optional) | `object` | `{ top_genres: ["pop", "indie"], energy_pref: 0.65 }` | Optional confirmation of what was inferred from Spotify data |

### States the Designer Must Spec

| State | Spinner | Message | Button |
|---|---|---|---|
| `redirecting` | yes | "Connecting to Spotify..." | none |
| `building_profile` | yes | "Building your taste profile..." | none |
| `complete` | no | "You're all set!" | none — auto-redirect |
| `error` | no | "Could not connect." | "Try again" |

### Mock Layout (building_profile state)

```
┌──────────────────────────────────────────┐
│                                          │
│               (spinner)                  │
│                                          │
│         Building your profile...         │
│                                          │
│    We're reading your Spotify top tracks │
│    and building your taste profile.      │
│    This takes about 3 seconds.           │
│                                          │
└──────────────────────────────────────────┘
```

---

## 4. Page 3 — Manual Onboarding (`/onboarding/manual`)

**Purpose:** For users without Spotify or who prefer to set preferences manually. A multi-step form whose answers are sent to `POST /manual/onboard`, which saves a row in `USER_PROFILE.csv`.

**What the designer needs to specify:**
- Progress bar at top showing step N of 5
- Each step is one question with visual chip/slider/toggle selectors
- Back and Next navigation at the bottom
- Submit button only appears on the last step

### Step 1 — Genre Selection

**Question:** "What genres do you love?"
**Instructions:** Pick up to 5.

| Field | Frontend Type | Backend Field | Stored As | Options |
|---|---|---|---|---|
| `top_genres` | multi-select chip grid (max 5) | `top_genres` | `"pop,indie,rock"` (comma-separated string) | rock, pop, hip-hop, electronic, r&b, jazz, classical, latin, indie, country, metal, folk |

### Step 2 — Energy Preference

**Question:** "How intense do you like your music?"

| Field | Frontend Type | Backend Field | Stored As | Range |
|---|---|---|---|---|
| `energy_pref` | slider (continuous) | `energy_pref` | `float` [0–1] | 0 = very calm, 1 = very intense |

Label display mapping (for designer reference):
- 0.0–0.39 → label: "Calm"
- 0.40–0.70 → label: "Medium"
- 0.71–1.0 → label: "Energetic"

### Step 3 — Mood Preference

**Question:** "What's your usual vibe?"

| Field | Frontend Type | Backend Field | Stored As | Options |
|---|---|---|---|---|
| `mood_bias` | single-select icon tile grid | `mood_bias` | JSON string: `{"focus": 1.0, ...}` | happy, sad, chill, hype, focus |

### Step 4 — Acoustic vs Electronic

**Question:** "Acoustic or electronic?"

| Field | Frontend Type | Backend Field | Stored As | Range |
|---|---|---|---|---|
| `acousticness_pref` | toggle or slider | `acousticness_pref` | `float` [0–1] | 0 = all electronic, 1 = all acoustic |

### Step 5 — Activities

**Question:** "When do you usually listen?"
**Instructions:** Pick all that apply.

| Field | Frontend Type | Backend Field | Stored As | Options |
|---|---|---|---|---|
| `activity_preferences` | multi-select chip grid | `activity_preferences` | `"study,commute,relax"` (comma-separated string) | workout, study, relax, commute, party, sleep |

### Hidden Fields (set by the page, not shown to user)

| Field | Type | Value | Why |
|---|---|---|---|
| `user_id` | `string` | Generated UUID or typed username | Primary key for USER_PROFILE row |
| `onboarding_source` | `string` | `"manual"` | Tells the backend which profile-building path was used |
| `valence_pref` | `float` | Derived from mood_bias (happy→0.7, sad→0.3, chill→0.55, hype→0.65, focus→0.45) | Inferred — not directly asked |
| `danceability_pref` | `float` | Derived from activity selection (workout/party→0.8, study→0.3, relax→0.3) | Inferred |
| `tempo_pref` | `float` | Mirrors energy_pref | Inferred |

### POST Payload Sent on Submit

```json
{
  "user_id": "joseph",
  "top_genres": "pop,indie,rock",
  "energy_pref": 0.65,
  "valence_pref": 0.45,
  "danceability_pref": 0.40,
  "acousticness_pref": 0.30,
  "tempo_pref": 0.65,
  "mood_bias": "{\"focus\": 1.0, \"happy\": 0.0, \"sad\": 0.0, \"chill\": 0.0, \"hype\": 0.0}",
  "activity_preferences": "study,commute",
  "onboarding_source": "manual"
}
```

### Mock Layout (Step 1)

```
┌──────────────────────────────────────────┐
│  [●●○○○]  Step 1 of 5                    │
│                                          │
│  "What genres do you love?"              │
│  Pick up to 5.                           │
│                                          │
│  [ Rock  ] [ Pop    ] [ Hip-Hop ]        │
│  [ Elec. ] [ R&B    ] [ Jazz    ]        │
│  [ Class.] [ Latin  ] [ Indie   ]        │
│  [Country] [ Metal  ] [ Folk    ]        │
│                                          │
│  [ ← Back ]              [ Next → ]      │
└──────────────────────────────────────────┘
```

---

## 5. Page 4 — Home Feed (`/home`)

**Purpose:** The main page after onboarding. Shows personalized song recommendations without the user typing anything. Powered by `GET /recommend/home/{user_id}`. The user can refine with filter chips, search by text, or launch the Context Quiz for a fresh recommendation pass.

**What the designer needs to specify:**
- Top bar with user identity and time-slot label
- Context Banner showing which signals are active right now
- Four horizontally scrollable filter chip rows (genre, mood, energy, activity)
- Search bar (free text — artist or song title)
- Vertical scrollable list of SongCard components
- Three list states: loading (skeleton cards), populated, empty (no results)

### Top Bar Fields

| Element | Type | Example | Why |
|---|---|---|---|
| `user_id` | `string` | `"joseph"` | Confirms which profile is loaded |
| Time slot label | `string` (derived from server clock) | `"Afternoon"` | Shows the active time context signal |
| Context Quiz button | `button` → `/quiz` | `"Update context"` | Lets user set explicit mood/activity |

### Context Banner Fields

| Field | Type | Example | Why |
|---|---|---|---|
| `time_of_day` | `string` enum | `"afternoon"` | Active time slot from server |
| `typical_activity` | `string` | `"study"` | What the engine inferred from historical data |
| `typical_mood` | `string` | `"focus"` | Same |
| `confidence` | `float` [0–1] | `0.183` | How confident the engine is in this context (based on event_count) |
| `event_count` | `int` | `17085` | Raw count of historical events backing this inference |

**Context Banner Mock:**
```
┌─ Context Banner ─────────────────────────────────────┐
│  Afternoon  ·  Inferred: Study  ·  Mood: Focus       │
│  Based on your 17,085 afternoon listening events     │
└──────────────────────────────────────────────────────┘
```

### Filter Chip Rows

Each row is a `FilterChipRow` component. Selecting a chip re-fetches from `POST /recommend/` with updated filters. Tapping the active chip deselects it (sends `null`).

| Row Label | Field Sent to API | Type | Options |
|---|---|---|---|
| Genre | `main_genres` | `string[] \| null` | rock, pop, hip-hop, electronic, r&b, jazz, classical, latin, indie, country, metal, folk |
| Mood | `mood` | `string \| null` | happy, sad, chill, hype, focus |
| Energy | `energy` | `string \| null` | calm, medium, energetic |
| Activity | `activity` | `string \| null` | workout, study, relax, commute, party, sleep |

### Search Bar Fields

| Field | Type | Sent To API As | Behavior |
|---|---|---|---|
| Search input | `string` | `artist` and/or `title` | Debounced 400ms before firing request; backend tokenizes both independently |

The search bar can be one combined input (designer's choice). The backend accepts `artist` and `title` as separate optional fields — the frontend can split on heuristics or send both as the same value.

### Song List States

| State | Display |
|---|---|
| Loading | 5–10 skeleton placeholder cards (gray animated shimmer) |
| Populated | List of `SongCard` components |
| Empty | Message: "No results found. Try adjusting your filters." |
| Error | Message: "Something went wrong." + Retry button |

### Full API Request Payload (POST /recommend/)

```json
{
  "user_id": "joseph",
  "mood": "focus",
  "activity": "study",
  "main_genres": ["rock"],
  "energy": "calm",
  "artist": null,
  "title": null,
  "time_of_day": "afternoon",
  "top_k": 10
}
```

### Full Page Mock Layout

```
┌──────────────────────────────────────────────────────┐
│ joseph                              Afternoon        │
│                             [ Update context → ]    │
├──────────────────────────────────────────────────────┤
│ Afternoon · Inferred: Study · Mood: Focus            │
│ Based on 17,085 afternoon events (18% confident)     │
├──────────────────────────────────────────────────────┤
│ Search artist or song...                             │
├──────────────────────────────────────────────────────┤
│ Genre:    [ Rock ] [ Pop ] [ Hip-Hop ] [ Elec. ] →   │
│ Mood:     [ Happy ] [●Focus] [ Sad ] [ Chill ] →     │
│ Energy:   [ Calm ] [●Medium] [ Energetic ]           │
│ Activity: [●Study] [ Workout ] [ Relax ] [ Comm.] → │
├──────────────────────────────────────────────────────┤
│ ♪  Jimmy Cooks                     score: 0.87      │
│    Drake · hip-hop · focus · medium                  │
│    [ Why this? ]                                     │
├──────────────────────────────────────────────────────┤
│ ♪  Blinding Lights                 score: 0.83      │
│    The Weeknd · pop · hype · energetic               │
│    [ Why this? ]                                     │
├──────────────────────────────────────────────────────┤
│ ♪  505                             score: 0.79      │
│    Arctic Monkeys · indie · focus · calm             │
│    [ Why this? ]                                     │
└──────────────────────────────────────────────────────┘
```

---

## 6. Page 5 — Context Quiz (`/quiz`)

**Purpose:** A 3-step in-session picker that collects real-time context (mood, activity, genre) and fires a fresh recommendation request. Can render as a full page or a modal sheet over `/home`. The quiz result fires `POST /recommend/` with mood, activity, and main_genres all populated.

**What the designer needs to specify:**
- Step indicator (1/3, 2/3, 3/3)
- Each step is a large-tap visual grid (emoji tiles or icon cards)
- Step 3 (genre) is optional — user can skip
- Back navigation between steps
- Submit fires request and navigates to home feed with fresh results

### Step 1 — Mood

**Question:** "How are you feeling?"

| Field | Type | Options | Required |
|---|---|---|---|
| `mood` | `string` enum, single-select | happy, sad, chill, hype, focus | Yes |

**Mock:**
```
  Step 1 of 3 — How are you feeling?

  [ Happy ]   [ Sad   ]   [ Chill ]
  [ Hype  ]   [ Focus ]
```

### Step 2 — Activity

**Question:** "What are you doing?"

| Field | Type | Options | Required |
|---|---|---|---|
| `activity` | `string` enum, single-select | workout, study, relax, commute, party, sleep | Yes |

**Mock:**
```
  Step 2 of 3 — What are you doing?

  [ Workout ]  [ Study  ]  [ Relax  ]
  [ Commute ]  [ Party  ]  [ Sleep  ]
```

### Step 3 — Genre

**Question:** "Any genre in mind?"

| Field | Type | Options | Required |
|---|---|---|---|
| `main_genres` | `string[]`, multi-select | rock, pop, hip-hop, electronic, r&b, jazz, classical, latin, indie, country, metal, folk | No — skippable |

**Mock:**
```
  Step 3 of 3 — Any genre in mind? (optional)

  [ Rock  ] [ Pop    ] [ Hip-Hop ] [ Elec.  ]
  [ R&B   ] [ Jazz   ] [ Latin   ] [ Indie  ]
  [ Metal ] [ Folk   ] [ Country ] [ Class. ]

  [ Skip ]                 [ Get Recommendations → ]
```

### POST Payload Sent on Submit

```json
{
  "user_id": "joseph",
  "mood": "focus",
  "activity": "study",
  "main_genres": ["indie", "rock"],
  "time_of_day": "afternoon",
  "top_k": 10
}
```

---

## 7. Page 6 — Song Detail (`/song/[track_id]`)

**Purpose:** Full explanation of why a specific song was recommended. This is JukeJam's key differentiator — transparent, explainable recommendations. Reached by clicking "Why this?" on any SongCard. Can render as a full page or a modal.

**What the designer needs to specify:**
- Song header (title, artist, album, tags)
- Audio feature bars (5 continuous features as horizontal fill bars)
- Score breakdown table (tfidf, activity, popularity contributions)
- Vector blend visualization (the 3-layer query vector, as a stacked bar per feature)
- Taxonomy tags (genre, main_genre, mood_bucket, energy_label)

### Song Header Fields

| Field | Type | Example |
|---|---|---|
| `title` | `string` | `"Jimmy Cooks"` |
| `artist_name` | `string` | `"Drake"` |
| `album_name` | `string` | `"Honestly, Nevermind"` |
| `genre` | `string` | `"hip-hop"` (granular, one of 114) |
| `main_genre` | `string` | `"hip-hop"` (broad, one of 12) |
| `mood_bucket` | `string` | `"focus"` |
| `energy_label` | `string` | `"medium"` |
| `popularity` | `int` [0–100] | `91` |

### Audio Feature Bars

Displayed as labeled horizontal fill bars. All values are [0–1] except `tempo` which is BPM (normalize to 0–1 for display: `tempo / 220`).

| Feature | Raw Field | Type | Display |
|---|---|---|---|
| Energy | `energy` | `float` [0–1] | bar fill % |
| Danceability | `danceability` | `float` [0–1] | bar fill % |
| Positiveness (Valence) | `valence` | `float` [0–1] | bar fill % |
| Acousticness | `acousticness` | `float` [0–1] | bar fill % |
| Tempo | `tempo` | `float` BPM (60–200) | normalized bar fill % |

**Mock:**
```
  Audio Features
  ─────────────────────────────────────
  Energy        ████████████░░░░  0.72
  Danceability  ██████████░░░░░░  0.61
  Positiveness  ████░░░░░░░░░░░░  0.24
  Acousticness  ██░░░░░░░░░░░░░░  0.13
  Tempo         █████████████░░░  0.80
```

### Score Breakdown

Shows how the final composite score was computed.

| Field | Type | Example | Why Shown |
|---|---|---|---|
| `score` | `float` (4 decimal places) | `0.8732` | Final ranked score |
| `tfidf_score` | `float` | `0.81` | How well genre/mood/energy labels matched the query |
| `activity_score` | `float \| null` | `0.84` | How well audio features matched the activity profile (null if no activity) |
| `popularity_norm` | `float` | `0.91` | Popularity as [0–1] (`popularity / 100`) |
| `tfidf_weight` | `float` | `0.65` (with activity) or `0.85` (without) | Weight applied in final formula |
| `activity_weight` | `float \| null` | `0.25` | Only shown if activity was provided |
| `popularity_weight` | `float` | `0.10` (with activity) or `0.15` (without) | Weight applied in final formula |

**Mock:**
```
  Score Breakdown
  ────────────────────────────────────────────
  TF-IDF match     0.81  × 0.65  =  0.527
  Activity match   0.84  × 0.25  =  0.210
  Popularity       0.91  × 0.10  =  0.091
  ────────────────────────────────────────────
  Final score                        0.828
```

### Vector Blend Visualization

Shows why this song matched the query at the feature level — breaks down the 3-layer query vector contribution per key feature.

| Field | Type | Example |
|---|---|---|
| Layer 1 weight (explicit) | `float` | `1.0` — from mood/genre/energy chip selections |
| Layer 2 weight (profile) | `float` | `0.5` — from user's stored taste profile |
| Layer 3 weight (time) | `float` | `0.3` — from historical listening at this hour |
| Feature name | `string` | `"genre:indie"` |
| Total combined weight | `float` | `1.8` |

**Mock (for the feature `genre:indie`):**
```
  Why "indie" scored high for you:

  Explicit query  ████████████████████  1.0
  Your profile    ██████████            0.5
  Time context    ██████                0.3
  ──────────────────────────────────────────
  Combined        ████████████████████████  1.8
```

**Designer note:** Show the top 3–5 features that contributed most to the score. The backend already returns the query vector — the frontend just visualizes the top features by combined weight.

---

## 8. Shared Component Specs

### SongCard

Used everywhere a song appears. Two visual states: collapsed (list view) and expanded ("Why this?" inline preview).

| Prop | TypeScript Type | Example |
|---|---|---|
| `track_id` | `string` | `"3F5CgOj3wFlRv51JsHbxhe"` |
| `title` | `string` | `"Jimmy Cooks"` |
| `artist` | `string` | `"Drake"` |
| `genre` | `string` | `"hip-hop"` |
| `main_genre` | `string` | `"hip-hop"` |
| `mood` | `string` | `"focus"` |
| `energy_label` | `string` | `"medium"` |
| `score` | `number` | `0.8732` |
| `popularity` | `number` | `91` |
| `onWhyClick` | `() => void` | Routes to `/song/[track_id]` or opens modal |

**Collapsed mock:**
```
┌──────────────────────────────────────────────────┐
│ ♪  Jimmy Cooks                    score: 0.87   │
│    Drake  ·  hip-hop  ·  focus  ·  medium        │
│    [ Why this? ]                                 │
└──────────────────────────────────────────────────┘
```

---

### FilterChipRow

| Prop | TypeScript Type | Example |
|---|---|---|
| `label` | `string` | `"Mood"` |
| `options` | `string[]` | `["happy", "sad", "chill", "hype", "focus"]` |
| `selected` | `string \| null` | `"focus"` |
| `onSelect` | `(value: string \| null) => void` | Clears selection if same chip is tapped twice |

---

### ContextBanner

| Prop | TypeScript Type | Example |
|---|---|---|
| `time_of_day` | `string` | `"afternoon"` |
| `typical_activity` | `string` | `"study"` |
| `typical_mood` | `string` | `"focus"` |
| `confidence` | `number` | `0.183` |
| `event_count` | `number` | `17085` |

---

### OnboardingProgressBar

| Prop | TypeScript Type | Example |
|---|---|---|
| `currentStep` | `number` | `2` |
| `totalSteps` | `number` | `5` |

---

### MoodPicker / ActivityPicker / GenrePicker

All three share the same shape — a selectable tile grid.

| Prop | TypeScript Type | Notes |
|---|---|---|
| `options` | `{ value: string; label: string; icon?: string }[]` | Icon is optional emoji or SVG |
| `selected` | `string \| string[] \| null` | `string` for single-select, `string[]` for multi |
| `multiSelect` | `boolean` | `false` for Mood and Activity, `true` for Genre |
| `onChange` | `(value: string \| string[]) => void` | Called on every tap |

---

## 9. State Management Reference

These are the state variables the developers need. Designers should not worry about these — this section is a handoff note for dev.

| Variable | TypeScript Type | Lives In | Initial Value |
|---|---|---|---|
| `userId` | `string \| null` | Global context / `localStorage` | `null` |
| `selectedMood` | `string \| null` | Home page | `null` |
| `selectedActivity` | `string \| null` | Home page | `null` |
| `selectedGenres` | `string[]` | Home page | `[]` |
| `selectedEnergy` | `string \| null` | Home page | `null` |
| `searchQuery` | `string` | Home page (debounced 400ms) | `""` |
| `recommendations` | `Song[]` | Home page | `[]` |
| `isLoading` | `boolean` | Home page | `false` |
| `contextProfile` | `TimeContextSlot \| null` | Global — fetched once on load | `null` |
| `isQuizOpen` | `boolean` | Global modal state | `false` |
| `quizStep` | `1 \| 2 \| 3` | Quiz component | `1` |
| `quizMood` | `string \| null` | Quiz component | `null` |
| `quizActivity` | `string \| null` | Quiz component | `null` |
| `quizGenres` | `string[]` | Quiz component | `[]` |

---

## 10. API Contract (what the frontend consumes)

The backend does not change. All endpoints already exist and return JSON. The React frontend replaces the Flutter `api_service.dart` with a JavaScript fetch/axios client.

### Endpoints

| Method | Route | Called From | Purpose |
|---|---|---|---|
| `GET` | `/spotify/login` | Landing page button | Redirects user to Spotify OAuth |
| `GET` | `/spotify/callback` | Handled by backend | Creates Spotify profile, redirects to `/home` |
| `POST` | `/manual/onboard` | Manual onboarding submit | Creates manual profile in USER_PROFILE.csv |
| `GET` | `/recommend/home/{user_id}` | Home page on load | Fetches personalized home feed |
| `POST` | `/recommend/` | Every filter change, quiz submit, search | Fetches filtered recommendations |

### Song Object (what every list and card consumes)

```typescript
type Song = {
  track_id: string;        // "3F5CgOj3wFlRv51JsHbxhe"
  title: string;           // "Jimmy Cooks"
  artist: string;          // "Drake"
  genre: string;           // "hip-hop"
  main_genre: string;      // "hip-hop"
  mood: string;            // "focus"
  energy_label: string;    // "calm" | "medium" | "energetic"
  score: number;           // 0.8732 — 4 decimal places
  popularity: number;      // 91 — int [0–100]
};
```

### TimeContextSlot Object (what ContextBanner consumes)

```typescript
type TimeContextSlot = {
  typical_mood: string;
  mood_distribution: Record<string, number>;
  typical_activity: string;
  activity_distribution: Record<string, number>;
  top_genres: string[];
  event_count: number;
  confidence: number;
};
```

### Recommend Request Body (POST /recommend/)

```typescript
type RecommendRequest = {
  user_id: string;
  mood?: string | null;
  activity?: string | null;
  main_genres?: string[] | null;
  genres?: string[] | null;
  energy?: string | null;
  artist?: string | null;
  title?: string | null;
  time_of_day?: string | null;
  top_k?: number;              // default: 10
};
```

### ManualOnboard Request Body (POST /manual/onboard)

```typescript
type ManualOnboardRequest = {
  user_id: string;
  top_genres: string;          // "pop,indie,rock" — comma-separated
  energy_pref: number;         // [0–1]
  valence_pref: number;        // [0–1]
  danceability_pref: number;   // [0–1]
  acousticness_pref: number;   // [0–1]
  tempo_pref: number;          // [0–1]
  mood_bias: string;           // JSON string: '{"focus":1.0,...}'
  activity_preferences: string; // "study,commute" — comma-separated
  onboarding_source: "manual";
};
```

---

## Summary

| What | Count |
|---|---|
| Pages (routes) | 6 |
| Shared components | 10 |
| API endpoints consumed | 5 |
| Distinct form fields designers must spec | ~20 |
| Data types in use | `string`, `number [0–1]`, `int [0–100]`, `string[]`, `Record<string, number>`, loading / error / empty states |

The backend stays unchanged. Every API endpoint already exists. The frontend is a pure replacement of the Flutter app with React/Next.js components consuming the same FastAPI backend on `localhost:8000`.

---

*JukeJam — CS 125 Next Generation Search Systems, Winter 2026*
