# AI-Based Traffic Congestion Prediction System

**Complete project report + hackathon presentation playbook**

Use this document as your single source of truth for documentation, demo rehearsal, and pitch preparation.

---

## Table of contents

1. [How to use this guide to maximize your score](#1-how-to-use-this-guide-to-maximize-your-score)
2. [Executive summary](#2-executive-summary)
3. [Full technical report](#3-full-technical-report)
4. [API reference](#4-api-reference)
5. [Machine learning (accurate to this repository)](#5-machine-learning-accurate-to-this-repository)
6. [Honest limitations & judge-proof framing](#6-honest-limitations--judge-proof-framing)
7. [Implementation roadmap (post-hackathon)](#7-implementation-roadmap-post-hackathon)
8. [Hackathon winning strategy](#8-hackathon-winning-strategy)
9. [Full slide deck (copy into Google Slides / PowerPoint / Canva)](#9-full-slide-deck-copy-into-google-slides--powerpoint--canva)
10. [Speaker notes & timed scripts](#10-speaker-notes--timed-scripts)
11. [Live demo runbook](#11-live-demo-runbook)
12. [Backup plan if something breaks](#12-backup-plan-if-something-breaks)
13. [Extended Q&A bank](#13-extended-qa-bank)
14. [Elevator pitches & one-liners](#14-elevator-pitches--one-liners)
15. [Pre-pitch checklist](#15-pre-pitch-checklist)
16. [Appendix: run commands & environment variables](#appendix-run-commands--environment-variables)

---

## 1. How to use this guide to maximize your score

Most hackathons score roughly on: **problem fit**, **technical depth**, **working demo**, **innovation**, **clarity**, **impact**, and sometimes **business viability**. This playbook maps each section to those criteria.

| Criterion | Where this doc helps |
|-----------|----------------------|
| Working demo | [Section 11](#11-live-demo-runbook), [12](#12-backup-plan-if-something-breaks) |
| Technical depth | [Sections 3–5](#3-full-technical-report), [6](#6-honest-limitations--judge-proof-framing) (honesty builds trust) |
| Story & clarity | [Sections 9–10](#9-full-slide-deck-copy-into-google-slides--powerpoint--canva) |
| Impact & scale | Slides 10–12, [Section 8](#8-hackathon-winning-strategy) |
| Q&A defense | [Section 13](#13-extended-qa-bank) |

**Practice rule:** Run the full demo three times end-to-end the night before. Time yourself. Record a 90-second backup video.

---

## 2. Executive summary

The **AI-Based Traffic Congestion Prediction System** is a full-stack application that combines:

- A **React (Vite)** frontend with **Leaflet** maps, charts, and mobile-style navigation.
- A **Flask** backend that exposes REST APIs for **congestion prediction**, **weather**, **traffic flow**, **incidents**, **route optimization** (Dijkstra on a defined road graph), and a **simulated camera analysis** endpoint.
- **Machine learning** via a trained **scikit-learn** model (`model.pkl`) with metadata in `model_metadata.json`.
- **OpenWeatherMap** for current conditions and forecast (with a built-in fallback if the API is unavailable).
- **TomTom** for live flow segments and incident details where API keys are configured (with **TTL caching** and **heuristic fallback** for flow when live data is unavailable).

**Positioning for judges:** This is an **integrated traffic intelligence prototype**—prediction plus visualization plus APIs—suitable as a foundation for municipal dashboards, logistics tooling, or research extensions (real road networks, live cameras, signal systems).

---

## 3. Full technical report

### 3.1 Problem statement

Urban congestion wastes time, increases emissions, and reduces quality of life. Consumer maps are strong at **turn-by-turn** navigation but cities and operators often need **aggregated** views: how severe is congestion, how does **weather** affect roads, where are **incidents**, and how can algorithms support **routing suggestions** or planning workflows.

### 3.2 Solution overview

The system provides:

1. **Congestion classification** (Low / Medium / High) from temporal, weather, and road-type signals.
2. **Situational awareness** on a map: traffic flow per network node, optional incident markers, TomTom traffic tiles on the map view when keys are present.
3. **Shortest-path routing** over a **small explicit graph** using Dijkstra’s algorithm.
4. **Weather-aware narrative**: OpenWeatherMap conditions are mapped to internal traffic-impact categories.
5. **Resilience**: Cached API responses and deterministic heuristics so demos keep working under rate limits or network issues.

### 3.3 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                        │
│  Routes: /home /map /routes /optimizer /alerts /analytics   │
│          /weather /camera /profile                         │
│  Libraries: react-router-dom, react-leaflet, chart.js, etc.  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (default: localhost:5000)
┌──────────────────────────▼──────────────────────────────────┐
│                    Flask (app.py)                           │
│  Cache: in-memory TTL                                      │
│  ML: joblib-loaded model.pkl                               │
│  Graph: nodes A–F, weighted edges, Dijkstra                │
└──────────┬───────────────────────────────┬─────────────────┘
           │                               │
    ┌──────▼──────┐                 ┌───────▼───────┐
    │ OpenWeather │                 │    TomTom     │
    │    Map      │                 │ Traffic APIs  │
    └─────────────┘                 └───────────────┘
```

### 3.4 Frontend structure

| Path | Component | Primary APIs used |
|------|-------------|-------------------|
| `/home` | HomePage | `/api/weather` |
| `/map` | MapArea | `/api/traffic-flow`, `/api/incidents`, `/api/route`, `/api/predict`, TomTom tiles |
| `/routes` | RoutesPage | UI for routes narrative |
| `/optimizer` | RouteOptimizerPage | `/api/route?start=&end=` |
| `/alerts` | AlertsPage | Incident/alert UX |
| `/analytics` | AnalyticsPage | `/api/analytics` |
| `/weather` | WeatherPage | `/api/weather?lat=&lon=` |
| `/camera` | CameraPage | `POST /api/analyze-camera` |
| `/profile` | ProfilePage | Profile placeholder |

**Note:** API base URL is currently hardcoded to `http://localhost:5000` in components; for deployment, use an environment variable (see Appendix).

### 3.5 Backend structure (runtime)

The runnable server is **`backend/app.py`** (see Appendix for start command). It includes:

- **TTL cache** helpers to reduce duplicate external API calls.
- **Weather mapping** from OpenWeather condition codes to internal labels and traffic-impact tiers.
- **TomTom** helpers for `flowSegmentData` and `incidentDetails`.
- **Road graph** `NODES` and `EDGES`, `build_graph()`, `dijkstra()`.
- **REST endpoints** listed in [Section 4](#4-api-reference).

**Repository note:** Additional modules exist under `backend/routes/`, `backend/ml/predictor.py`, `database.py`, etc. They reflect a **modular refactor path**; the entrypoint you run for the demo is **`app.py`** unless you wire a factory app yourself. When speaking to judges, describe what **actually runs** in your demo to avoid contradictions.

### 3.6 Algorithms

**Dijkstra’s algorithm:** Single-source shortest paths on a weighted graph implemented with a min-heap (`heapq`). The graph is built from fixed edges with base distance and congestion-related weight terms and jitter for variability in the monolithic `app.py` route handler.

**Heuristic traffic flow:** When TomTom is unavailable, per-node speed ratios are derived from **time-of-day buckets** and a **stable pseudo-random seed** (hash of node id) so values look plausible and repeat predictably within a session—ideal for hackathon demos.

### 3.7 External services

| Service | Purpose in this project |
|---------|-------------------------|
| OpenWeatherMap | Current weather + forecast; mapped to traffic-impact semantics |
| TomTom | Flow segment speeds at coordinates; incident feed in bounding box; optional map raster tiles in the frontend |

### 3.8 Security & keys (critical for submissions)

- Store API keys in **environment variables** (e.g. `OWM_API_KEY`, `TOMTOM_API_KEY`), not in public repos.
- If keys were ever committed, **rotate them** in the provider dashboards before sharing GitHub links or recordings.
- Never paste live keys into slides or this markdown when publishing.

---

## 4. API reference

Base URL (local): `http://localhost:5000`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Status, version, flags for model loaded and whether keys look configured |
| POST | `/api/predict` | JSON body: `time_of_day`, `day_of_week`, `weather`, `road_type`, optional `lat`/`lon` (weather cache may override weather) → `congestion_level` |
| GET | `/api/route` | Query: `start`, `end` (node ids A–F) → path, nodes, edges, estimated time, distance |
| GET | `/api/weather` | Query: optional `lat`, `lon` → current, hourly slice, forecast, source |
| GET | `/api/traffic-flow` | Optional `lat`, `lon` → per-node flow levels; TomTom or heuristic |
| GET | `/api/incidents` | Query: `lat`, `lon` (bbox derived) → incident list from TomTom or empty if no key |
| POST | `/api/analyze-camera` | Simulated congestion analysis and text recommendations |
| GET | `/api/analytics` | Dashboard-style series (demo-oriented) |

---

## 5. Machine learning (accurate to this repository)

### 5.1 Training pipeline

- Entry: `backend/train_model.py` → `ml/trainer.py`.
- Artifacts: `model.pkl`, `model_metadata.json`.

### 5.2 What the metadata says

Open `backend/model_metadata.json` before every pitch. As of the project snapshot, it documents:

- Algorithm: **GradientBoostingClassifier** (not “Random Forest”—say the correct name on stage unless you retrain with RF).
- Example metrics: test accuracy and CV mean/std (quote **exact numbers from your file** on demo day).
- Rich feature set: cyclic hour encoding, rush-hour flags, weather severity, road capacity, interactions.

### 5.3 Inference path in `app.py`

The live `/api/predict` handler loads the model with `joblib` and, when the model exists, calls prediction with a **compact feature vector** `[hour, day_of_week, weather, road_type]`. If the on-disk `model.pkl` was saved in the **dictionary format** expected by `ml/predictor.py` (model + label encoder), this path may not match—**verify before the event** by hitting `/api/predict` after a fresh train.

**Winning move if you have time:** unify inference through `TrafficPredictor` and return **probabilities and confidence**—judges love calibrated outputs.

---

## 6. Honest limitations & judge-proof framing

| Limitation | How to say it confidently |
|------------|---------------------------|
| Small toy graph (six nodes) | “We use an explicit graph to **prove** the optimization layer; swapping in OpenStreetMap edges is an engineering step, not a science risk.” |
| Simulated camera endpoint | “This is a **pluggable interface** for future CV; today we validate the UX and API contract.” |
| Demo analytics endpoint | “Analytics are **wired**; we can back them with real logged predictions post-event.” |
| Geographic labels vs coordinates | Align your **story city** with map center and node names before judging. |

Judges respect **clarity** more than hype. Pair every limitation with a **credible next step**.

---

## 7. Implementation roadmap (post-hackathon)

1. Single inference service using `ml/predictor.py` + probabilities in API responses.
2. Weight Dijkstra edges using **live** `speed_ratio` from `/api/traffic-flow`.
3. Environment-based `VITE_API_URL` for frontend; Docker Compose for one-command demo.
4. Log predictions and routes to SQLite/Postgres; drive `/api/analytics` from real aggregates.
5. Optional: YOLO or cloud vision API behind `/api/analyze-camera` for real frames.
6. OSM graph extraction + contraction or use a routing engine as a backend service.

---

## 8. Hackathon winning strategy

### 8.1 What judges remember

- **First 20 seconds:** problem + why it matters.
- **Next 2 minutes:** **working** product, not slides.
- **Last minute:** impact, who benefits, what you would build in 90 days with funding or mentorship.

### 8.2 Differentiation angles (pick two and own them)

1. **Fusion:** ML prediction + live APIs + map + incidents in **one** cohesive UI.
2. **Resilience:** TTL cache + heuristic fallback = **demo-safe** under Wi-Fi issues.
3. **Extensibility:** REST API surface for logistics or city integrations.
4. **Explainability:** congestion **classes** and weather impact labels non-technical users understand.

### 8.3 Delivery tips

- Speak **slowly**; adrenaline speeds you up.
- One speaker drives the demo; another handles Q&A if allowed.
- **Mouse paths rehearsed:** know exactly which tab you open next.
- End on a **concrete ask** (mentor, pilot city, job, prize category).

---

## 9. Full slide deck (copy into Google Slides / PowerPoint / Canva)

**Visual style suggestion:** Dark background, one accent color (teal or amber), large screenshots, minimal text (6 words per bullet max on screen; you speak the rest).

### Slide 1 — Title

- **Title:** AI-Based Traffic Congestion Prediction System  
- **Subtitle:** Predict · Map · Route · Act  
- **Footer:** Team name, hackathon name, date  

**Speaker notes:** State team names and roles in one breath. Smile, pause.

---

### Slide 2 — The problem

- **Headline:** Congestion costs cities and people every day.  
- **Bullets:** Lost time · Fuel & emissions · Emergency delays · Reactive tools only  

**Speaker notes:** One relatable example (school pickup, ambulance, delivery SLA). Do not read statistics unless you verified them.

---

### Slide 3 — Who suffers (personas)

- **Drivers & commuters**  
- **City traffic operations**  
- **Logistics / fleets**  

**Speaker notes:** “We built for all three layers, starting with a prototype that proves the core loop.”

---

### Slide 4 — Insight / thesis

- **Headline:** Maps show traffic. We **classify risk** and **unify signals**.  
- **Bullets:** Time + weather + road context · Live flow & incidents · API-first design  

---

### Slide 5 — Solution overview (screenshot)

- Full-width screenshot of **Home** or **Map**.

**Speaker notes:** “This is the actual product running locally / deployed at [URL].”

---

### Slide 6 — Live architecture diagram

- Reuse the ASCII architecture from Section 3.3 or redraw cleanly.

**Speaker notes:** Name each box in under 15 seconds.

---

### Slide 7 — Machine learning

- **Input:** time, day, weather category, road type (+ extended features in training per metadata).  
- **Output:** Low / Medium / High congestion.  
- **Model:** State true algorithm from `model_metadata.json`.  
- **Metric:** Quote test accuracy from metadata.

**Speaker notes:** If data is synthetic, say: “Synthetic baseline to validate the pipeline; next step is public/historical speed data.”

---

### Slide 8 — Weather intelligence

- Screenshot of **Weather** page.  
- Bullet: OWM → traffic-impact label.

---

### Slide 9 — Live traffic & incidents

- Screenshot of **Map** with layers.  
- Bullets: TomTom flow · Incidents bbox · Fallback heuristics  

---

### Slide 10 — Routing engine

- Screenshot of **Route Optimizer**.  
- Bullets: Graph nodes · Dijkstra shortest path · Est. time & distance  

**Speaker notes:** Be precise: “prototype graph,” not “entire city mesh” unless you implemented that.

---

### Slide 11 — Camera / smart city hook

- Screenshot of **Camera** page.  
- Bullets: API for future CV · Recommendations today are simulated  

---

### Slide 12 — Demo agenda slide (optional on screen)

- “1. Weather  2. Map  3. Predict  4. Route  5. Incidents”

Keeps you on rails during finals.

---

### Slide 13 — Impact

- **Cities:** planning & incident awareness.  
- **Logistics:** API-driven routing context.  
- **Environment:** fewer stop-and-go miles when combined with better decisions.  

---

### Slide 14 — Traction & validation (even if early)

- What you built this weekend · Tests you ran · User quote from teammate play-test  

If nothing exists: “Functional integration tests: health endpoint, predict, route, weather.”

---

### Slide 15 — Roadmap (90 days)

- OSM graph or external router integration.  
- Real camera inference.  
- Historical model retraining.  
- Pilot with campus or municipal open data.  

---

### Slide 16 — Business model (optional 1 slide)

- B2G SaaS dashboard · B2B API usage · Open-core community edition  

Keep it light unless the hackathon is business-heavy.

---

### Slide 17 — Team

- Photos, roles, relevant skills (ML, maps, full-stack, design).  

---

### Slide 18 — Thank you / Q&A

- GitHub (if safe) · Demo link · Contact email · **One sentence ask**  

---

## 10. Speaker notes & timed scripts

### 10.1 Three-minute script (≈ 360 words spoken at calm pace)

**0:00–0:25 — Hook**  
“Congestion is not just annoying—it burns fuel, delays emergencies, and makes cities noisy and polluted. Most apps show a red line on a map. We asked: can we **classify** how bad it will be and **combine** weather, live flow, and incidents in one place?”

**0:25–0:50 — Solution**  
“We built the AI-Based Traffic Congestion Prediction System: a React dashboard on a Flask backend. A trained sklearn model outputs Low, Medium, or High congestion from time, day, weather, and road context. We layer OpenWeatherMap and TomTom data, with caching and smart fallbacks so the demo survives bad Wi-Fi.”

**0:50–2:35 — Demo** (while clicking)  
“Here is live weather and impact labels. On the map we pull traffic flow per node and incidents in the region. We hit predict to show the model’s class. In the optimizer we compute a Dijkstra shortest path across our road graph with clear time and distance. The camera view shows how we’d plug real computer vision later—today it proves the API and UX.”

**2:35–3:00 — Close**  
“Our edge is **fusion plus resilience**: prediction, live APIs, routing, and a path to city-scale data. We’d love mentorship on graph scale-up and pilot data. Thank you—questions?”

---

### 10.2 Five-minute script (expand demo + impact)

Add after the 3-minute solution paragraph:

**Extra 0:45 — Technical depth**  
“Training metadata is versioned in `model_metadata.json` so we can audit the algorithm and accuracy. The backend exposes clean REST endpoints—easy for a logistics stack or a municipal dashboard to consume.”

**Extra 0:45 — Impact & roadmap**  
“In ninety days we’d connect a real road network, log predictions against ground truth, and upgrade the camera endpoint to real inference. Cities get operations visibility; fleets get programmable context beyond a single vendor map.”

Use the remaining time for **slower demo** and one **breath** between sections.

---

### 10.3 Eight-minute script (finals / deep dive)

Structure:

| Block | Time |
|-------|------|
| Problem + personas | 1:00 |
| Architecture + ML | 2:00 |
| Live demo (slow, narrate each API) | 4:00 |
| Impact, roadmap, business | 0:45 |
| Q&A buffer | 0:15 |

Add a **live** `curl` or browser network tab mention only if you are fluent: “Here’s `/api/health` proving model load and key configuration.”

---

## 11. Live demo runbook

**Before you enter the room**

1. Laptop charged; **hotspot** tested.  
2. Terminal 1: from `backend` folder, activate venv, run `python app.py` (see Appendix).  
3. Terminal 2: from `frontend` folder, `npm run dev`.  
4. Browser: open Map and Optimizer tabs **in advance**.  
5. Zoom browser to **125%** if judges sit far away.

**Demo sequence (recommended)**

1. **Home** — loads; mention weather strip if visible.  
2. **Weather** — show current + forecast; tie to traffic impact.  
3. **Map** — pan slightly; show flow markers or tiles; mention incidents if present.  
4. **Optimizer** — choose two nodes (e.g. A to F); compute route; read time and distance.  
5. **Camera** — submit once; show recommendations.  
6. **Analytics** — quick glance as “dashboard module.”

**Total clicks:** aim for under 25 clicks for a 5-minute pitch.

---

## 12. Backup plan if something breaks

| Failure | What you say | What you do |
|---------|--------------|-------------|
| TomTom rate limit / error | “We’re hitting cached or heuristic mode by design.” | Show Map still rendering; `/api/traffic-flow` still returns nodes. |
| OpenWeather down | “Fallback weather profile keeps the UI and story alive.” | Open Weather page anyway. |
| Frontend port conflict | “One-line config fix.” | Know your Vite port from terminal output. |
| Total network loss | “Our stack runs locally with offline fallbacks.” | Use localhost only; disable VPN. |

**Golden rule:** Never argue with the demo machine in front of judges. Speak calmly, switch to backup narrative.

---

## 13. Extended Q&A bank

**ML / data**

- **Q:** What data trained the model?  
  **A:** Synthetic generated dataset for pipeline validation; next step is pairing TomTom or open speed archives with our labels.

- **Q:** How do you measure accuracy?  
  **A:** Hold-out test accuracy and cross-validation in `model_metadata.json`; we’d add per-class precision/recall with real data.

- **Q:** Why not deep learning?  
  **A:** Tabular signals and speed of iteration; sklearn is deployable everywhere; we can swap estimators without UI changes.

**Systems**

- **Q:** How do you handle API limits?  
  **A:** TTL in-memory cache; serve last good payload; degrade to heuristics for flow.

- **Q:** Is it real-time?  
  **A:** Weather and flow refresh on TTL; predict is milliseconds on CPU.

**Product**

- **Q:** Google Maps already does this?  
  **A:** Consumer routing is not the same as an **operations** API plus **explainable** congestion class and custom graph policies for cities or fleets.

**Ethics**

- **Q:** Privacy?  
  **A:** No individual tracking in this prototype; production would aggregate and comply with local regulation; camera path needs strict governance.

**Scale**

- **Q:** Whole city graph?  
  **A:** Not yet—proof on six nodes; scale via OSM import or external routing engine.

Add **three** questions **your** team struggles with and write answers in your own words.

---

## 14. Elevator pitches & one-liners

**15 seconds:** “We predict traffic congestion classes and fuse weather, live flow, and incidents on one map—with APIs cities and fleets can actually plug into.”

**30 seconds:** Add “Flask + React, sklearn model versioned with metadata, TomTom and OpenWeather with caching and fallbacks so demos never die.”

**One-liner for slide footer:** “Predict congestion. See the city. Route smarter.”

---

## 15. Pre-pitch checklist

- [ ] `GET /api/health` returns OK with expected flags  
- [ ] `/api/predict` returns a label without error  
- [ ] `/api/route` returns a path for your chosen start/end  
- [ ] Slides use **true** model name from metadata  
- [ ] No secrets on slides or public repo  
- [ ] Backup screen recording < 2 minutes, on desktop  
- [ ] Team agrees who speaks which section  
- [ ] Water bottle; deep breath before walking on stage  

---

## Appendix: run commands & environment variables

### Run backend

```bash
cd backend
# activate your virtual environment, then:
python app.py
```

Server listens on `http://0.0.0.0:5000` (access via `http://localhost:5000`).

### Run frontend

```bash
cd frontend
npm install   # first time
npm run dev
```

### Environment variables (recommended)

| Variable | Purpose |
|----------|---------|
| `OWM_API_KEY` | OpenWeatherMap API key |
| `TOMTOM_API_KEY` | TomTom developer key |
| `SECRET_KEY` | Flask secret (if you extend sessions/auth) |

Configure these in your OS or a `.env` file **not** committed to git.

### Dependencies (reference)

- Backend: see `backend/requirements.txt` (Flask, flask-cors, scikit-learn, pandas, numpy, joblib, requests, etc.).  
- Frontend: see `frontend/package.json` (React 19, Vite, Leaflet, Chart.js, etc.).

---

**End of document.** Good luck at the hackathon—preparation and a calm demo beat buzzwords every time.
