# GardenApp

A personal garden planning and tracking companion. Design your beds, manage your seed inventory, generate a frost-aware planting schedule, and keep a running activity log — all in a mobile-first PWA that works entirely in your browser with no backend required.

## Features

### Setup Wizard
First launch walks you through a 3-step setup: enter your US zip code to auto-derive frost dates, optionally override them with your local averages, then add your garden beds before landing in the planner.

### Garden Planner
Three views of your garden:
- **Plot** — overhead 2D layout of all your beds
- **Beds** — 1 sq ft grid for each bed; place plants by selecting from the seed catalog, resize blocks to match spacing, and add succession plantings with a week offset
- **3D** — a three-dimensional view of your garden

Each bed tracks its type (raised, in-ground, or container), sun exposure (full/partial/shade), and which edge faces north. The app uses the north orientation to warn when tall plants are placed where they'd cast shade over shorter neighbors.

### Schedule & Timeline
Two views driven by your frost dates and planting plan:
- **Schedule** — month-by-month task list auto-generated from your plantings (start indoors, direct sow, transplant, harvest). Add custom tasks to any date.
- **Timeline** — a Gantt chart of every crop from sow to harvest, color-coded by plant family, with frost date markers and a "today" indicator showing what's currently in the ground.

A frost countdown banner shows days until your last spring frost and first fall frost, plus a growing season progress bar once you're in season.

### Seeds
Browse the built-in seed catalog filtered by name or plant family. Each seed's detail view shows spacing, days to maturity, start method (indoors vs. direct sow), indoor start timing relative to frost, companion plants, and antagonists. Mark seeds as owned to build your personal inventory; add notes to each (variety, source, purchase year).

### Activity Log
Log what you did each day: watered, fertilized, seeded, transplanted, trimmed, observed, or harvested. Optionally tie an entry to a specific bed. Entries are grouped by date and roll up into each season's archive.

### Season History
At the end of the season, archive a snapshot of your garden — bed layout, plant placements, and the full activity log — with optional notes. Archived seasons can be reviewed in detail (layout, plant list, activity log with type counts) and compared against the current year. Import any past season's bed layout as a starting point for the new year.

### Backup & Restore
Export your entire garden to a single JSON file (beds, plants, tasks, activity logs, season history) from Settings. Import any prior export to restore on a new device or browser.

---

## Storage

By default the app stores everything in **browser IndexedDB** via Dexie. Nothing needs to be installed or configured — open the app, run setup, and start planning. Data lives in the browser and persists across sessions.

If you want to sync across devices, you can optionally run the included ASP.NET Core backend. The client auto-detects it on startup by pinging `/health`. If the API responds, it switches to remote storage; if not, it falls back to IndexedDB. No manual toggle is needed.

| Mode   | When active                                       | Data lives in      |
|--------|---------------------------------------------------|--------------------|
| Local  | No API URL set, or API unreachable                | Browser IndexedDB  |
| Remote | `VITE_API_BASE_URL` set and API responds on load  | SQLite via EF Core |

---

## Running the app

### Client only (no backend)

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. All data is stored locally in the browser.

### With the optional backend

The backend enables multi-device sync. Run both:

```bash
# Terminal 1 — API
cd api
dotnet run
# Starts on http://localhost:5000

# Terminal 2 — Client
cd client
cp .env.example .env
# Edit .env: set VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

The client will detect the API on startup and switch to remote storage automatically.

### Docker (both together)

```bash
docker compose up --build
```

---

## Project structure

```
GardenApp/
  client/       React + Vite + TypeScript PWA
    src/
      adapters/   StorageAdapter interface, LocalAdapter (Dexie), RemoteAdapter (REST)
      catalog/    Built-in seed catalog and US frost date lookup by zip code
      components/ BedGrid, GardenPlot, Garden3DView, PlantPicker, Nav, TaskCard
      pages/      Planner, Calendar, Seeds, ActivityLog, Seasons, Settings, Setup
      store/      Zustand store (useGardenStore) — all business logic lives here
      utils/      Planting schedule generator, spacing calculator, sun/shade warnings
  api/          ASP.NET Core Minimal API + EF Core + SQLite
```

## Tech stack

- **Client:** React 18, TypeScript, Vite, Zustand, Dexie (IndexedDB), React Router
- **API:** ASP.NET Core 8 Minimal API, Entity Framework Core, SQLite
- **Deploy:** Dockerfile + nginx for serving the built client alongside the API
