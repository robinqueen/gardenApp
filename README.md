# GardenApp

A personal garden planning and tracking app. Plan your beds, schedule your seeds,
and track daily tasks — all driven by your local frost dates.

## Structure

```
GardenApp/
  client/   React + Vite + TypeScript PWA (mobile-first)
  api/      ASP.NET Core Minimal API + EF Core + SQLite (optional backend)
```

## Quick Start

### Client only (no backend needed)

```bash
cd client
npm install
npm run dev
```

### With backend (multi-device sync)

```bash
# Terminal 1
cd api
dotnet run

# Terminal 2
cd client
cp .env.example .env        # set VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

The client auto-detects the API on startup. If reachable it uses remote storage,
otherwise falls back to IndexedDB. No manual toggle needed.

## Storage modes

| Mode   | Activates when                          | Data lives in      |
|--------|-----------------------------------------|--------------------|
| Local  | No API URL configured, or unreachable   | Browser IndexedDB  |
| Remote | VITE_API_BASE_URL set and API responds  | SQLite via EF Core |

## Year-over-year

Export your season as JSON from Settings. Import next spring to pre-fill beds
and seed list. Adjust what changed and go.
