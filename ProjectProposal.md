CS 125 – Next Generation Search Systems
Project Proposal

Version: V.011425
Team Name: Juke Jam

Team Members

April Wong (craigw2) – Lead

Joseph Anh-Quoc Nguyen (Josepan1)

Allyson A Lopez (allysal1)

1. Project Overview

Important: This proposal is exploratory and will evolve throughout the quarter.
You are not expected to have all details finalized.

1.1 Project Title

Personalized Music Engine Providing Context-Aware Recommendations for Active Listeners

1.2 Problem Statement

Music streaming users face many challenges when discovering new content that aligns with their evolving music taste. Current platforms typically do not provide users with new content, but instead repeatedly suggest similar artists without any meaningful exploration. Users may waste time skipping songs or manually creating curated playlists for specific situations.

Music tastes also change throughout the day, meaning different moods or activities require different listening experiences. Additionally, there is a disconnect between listening habits and live music opportunities, causing fans to miss performances they may have enjoyed but were unaware of. These issues lead to stagnant playlists, missed discoveries, and frustration with repetitive suggestions.

This problem is further exacerbated for users who actively explore music but lack tools that learn from both explicit preferences (liked songs, playlists) and implicit signals (skips, replays, listening duration).

1.3 Target Users

The intended users are active music listeners who use streaming platforms such as Spotify or Apple Music. These users are typically daily listeners who want to expand their musical taste. This includes students seeking study playlists, individuals looking for workout mixes, users interested in discovering underground artists, and listeners who want more personalized recommendations. Users usually have established listening patterns but may feel limited by current platform features.

2. System Concept
2.1 High-Level System Description

This system is a context-aware music recommendation engine that goes beyond traditional collaborative filtering. The engine builds a comprehensive personal model using multiple signals such as liked or disliked songs, skip patterns, listening duration, replay frequency, and search history.

The system analyzes audio features such as tempo, genre, mood, and energy level to generate diverse recommendations. User context is also considered, including time of day, session length, device type, and listening environment. Unlike existing platforms, skipped songs are treated as meaningful negative signals and weighted appropriately.

The system maintains a dynamic user profile that evolves over time, allowing recommendations to adapt as listening habits change.

2.2 User Need → System Response

When a user opens their music app or finishes a song, the system automatically evaluates their current context, including time of day, recent listening behavior, and activity type. For morning commutes, the system may queue upbeat tracks from frequently listened artists. During study sessions, it may recommend instrumental or low-energy music to reduce distraction. If a user skips multiple songs in a row, the system dynamically shifts its recommendations toward different moods or genres to better match the user’s needs.

3. Data and Information Sources
3.1 Data Sources

User interaction data (liked songs, saved playlists, skip history, replay counts)

Listening patterns (session duration, time of day, listening frequency per artist or song)

Audio metadata (genre, tempo/BPM, key, energy level, danceability, acousticness)

User search history (artist searches, genre exploration)

External context (location data for concert recommendations)

Music catalog data (artist discographies, album release dates, similar artist networks)

Concert and event APIs (e.g., Ticketmaster API)

3.2 Data Collection Strategy

User preferences and interaction data are logged automatically during app usage. Each like, skip, and replay is timestamped and stored. Audio metadata is retrieved through music platform APIs such as Spotify or from static datasets. Concert information is fetched from event APIs and updated weekly.

Users initially connect their streaming accounts and may optionally import existing playlists. Data collection is continuous after setup. For prototyping, simulated listening histories or publicly available datasets may be used.

4. Personal Model and Context
4.1 Personal Model

The personal model captures each user’s unique music identity through multiple factors. Genre preferences are represented using weighted distributions with decay for older preferences. Artist similarity is modeled through ranked lists based on listening frequency and engagement.

Audio feature profiles track preferred tempo, energy, and acousticness derived from liked songs. Skip patterns help the system avoid disliked characteristics. Contextual preference mappings associate listening behavior with time of day, activity, and location, enabling the system to dynamically adapt recommendations to the user’s current situation.

4.2 Contextual Factors

Key contextual signals include time of day (morning, afternoon, night), session type (short listening bursts vs. long playlists), and recent skip rates, which may indicate a mismatch in mood. User location helps determine nearby concerts or events. The sequence of played songs also matters: early tracks may establish a mood, while later tracks influence shifts in musical direction.

5. Search / Recommendation Logic
5.1 Search or Recommendation Task

The system recommends songs, artists, albums, and live events. During listening sessions, it performs next-track recommendations and artist discovery suggestions. It also generates discovery mixes that balance familiar content with new material. Concert notifications alert users when artists they enjoy are performing nearby. Items are ranked based on engagement, contextual relevance, and diversity.

5.2 Matching and Ranking (Conceptual)

Songs rank higher when they align with the user’s audio feature profile, such as similar tempo, energy, and mood. Contextual relevance plays a major role, including time of day and session type. Artists with high engagement and low skip rates score higher, while recency affects weighting. Rankings balance similarity, novelty, and context fit. Concerts are ranked based on artist interest and proximity.

6. System Architecture (Conceptual)
6.1 Major Components

Data ingestion module (connects to music APIs and imports user history)

Personal model builder (creates and updates user profiles)

Context processor (detects time, device, session patterns, skip behavior)

Recommendation engine (generates song, artist, and concert suggestions)

Ranking module (orders recommendations by relevance, novelty, and context)

User interface (displays recommendations and collects feedback)

Concert integration module (fetches live event data)

6.2 User Interface and Presentation

Recommendations are presented through a web-based dashboard. The interface includes a user profile section showing current music taste, a “Now Playing Queue” suggesting 5–8 tracks with explanations, and an “Upcoming Shows” section highlighting relevant concerts. Immediate feedback is collected when users like or skip songs.

7. Project Scope and Feasibility
7.1 What Will Be Implemented

This project will deliver a functional prototype that generates song recommendations based on user preferences and contextual signals. The system will use user input data and music metadata APIs. Location-based concert recommendations will be included to enhance discovery. The prototype focuses on active music listeners who want to expand their musical tastes and discover live events.

7.2 What Is Out of Scope

Generating full playlists based on detailed constraints (time, genre, artist combinations) is out of scope. Multi-user collaborative playlist generation is also excluded. Advanced query interfaces such as searching for songs by humming or minimal input are considered future work due to time constraints.

8. Team Plan
8.1 Team Roles and Responsibilities

The team will collaboratively decide on datasets and required information. One member will focus on frontend UI development, another on data cleaning and formatting, and another on extracting insights from data. All team members will contribute to refining the recommendation logic.

8.2 Anticipated Challenges

A major challenge is finding high-quality datasets with sufficient coverage. Music data can be messy and limited in size. Ensuring recommendations align with subjective user preferences is also difficult, as musical taste varies widely and may change unpredictably.

9. Summary

This project proposes a context-aware music recommendation system that helps active listeners discover new songs, artists, and concerts by learning from listening habits, skip patterns, and contextual signals. By combining personal modeling with real-time context awareness, the system aims to move beyond repetitive recommendations and improve music discovery.
