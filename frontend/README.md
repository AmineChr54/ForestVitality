# Forest Vitality – Frontend

React + TypeScript dashboard for satellite-based forest health monitoring: select a German municipality or draw a region, compute vegetation indices (NDVI, NDMI, …) from Sentinel-2 imagery, compare two dates side by side, and ask the AI assistant about the results.

The UI itself is in German.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # adjust URLs if needed
npm run dev                         # http://localhost:5173
```

The backend, Keycloak and TiTiler must be running (see the [root README](../README.md)). Log in with one of the development users (e.g. `forestanalyzer` / `forest123`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server on port 5173 (proxies `/titiler` → `localhost:8082`) |
| `npm run build` | Type-check (`tsc -b`) and production build |
| `npm run lint` | ESLint (typescript-eslint, React Hooks rules) |
| `npm test` | Vitest unit tests (jsdom) |
| `npm run preview` | Serve the production build locally |

## Tech stack

- **React 18** + TypeScript, **Vite**
- **React Router** with lazy-loaded pages
- **Leaflet** for maps; TiTiler COG tiles clipped client-side to the selected region on a canvas layer
- **Zustand** for client state (auth session, map selection)
- **Axios** HTTP client with auth and error interceptors
- **Keycloak** (OIDC authorization-code flow) for authentication and role-based UI

## Environment variables

Defined in `.env.local` (template: `.env.local.example`; production template: `.env.production.example`).

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |
| `VITE_APP_BASE_URL` | `http://localhost:5173` | Frontend origin, used for the Keycloak redirect |
| `VITE_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak server |
| `VITE_KEYCLOAK_REALM` | `geo-platform` | Keycloak realm |
| `VITE_KEYCLOAK_CLIENT_ID` | `geo-platform-backend` | Keycloak client |
| `VITE_TITILER_URL` | `http://localhost:8082` | TiTiler tile server |
| `VITE_MAP_TILE_URL` | OpenStreetMap | Base-map tile URL |
| `VITE_DEBUG_MODE` | `false` | Log HTTP requests and env config to the console |

## Project structure

```
src/
├── api/          # Typed API clients (httpClient, ingest SSE stream, municipality, chat, TiTiler stats)
├── components/   # UI: map (MapView, DrawTools, legend), index calculator, region search, AI chat widget
├── config/       # Type-safe environment config
├── constants/    # Routes, map config, band-math expressions
├── hooks/        # useAnalysis (SSE ingestion + results), useRegionSearch, useAuth, …
├── layouts/      # Main layout (sidebar + topbar)
├── pages/        # Region select, index analysis, split comparison, AI insights, login
├── router/       # Route config with Suspense helpers
├── security/     # Keycloak integration: domain model, token service, route guard
├── state/        # Zustand stores (auth, map)
├── types/        # Shared TypeScript types
└── utils/        # Geo helpers, API error mapping, role helpers, SSE client
tests/            # Vitest tests for API clients and utilities
```

## How an analysis runs

1. The user picks a municipality (or draws a polygon) and an index, resolution and date.
2. `useAnalysis` splits MultiPolygons into sub-regions (`utils/geoUtils.splitIntoSubRegions`) and opens a Server-Sent Events stream to `POST /ingest/stream` for each one.
3. The backend downloads the Sentinel-2 bands from Copernicus, stacks them into a Cloud-Optimized GeoTIFF in MinIO and streams progress events.
4. `MapView` renders the index via TiTiler band-math tiles, clipped to the region geometry, and `fetchVitalityStatistics` computes mean/min/max for the region.

## Authentication

`security/` wraps Keycloak's authorization-code flow: the login page redirects to Keycloak, `AuthCallback` exchanges the code for tokens, and `SecurityService` stores and auto-refreshes them. The Axios interceptor attaches the bearer token and redirects to `/login` on `401`. Actions are gated by the user's Keycloak roles (`utils/roleUtils`, e.g. only analysts and admins can run analyses).

## Known limitations

- **AI Insights page** uses a placeholder hook (`useAiInsights`) with canned answers. The live LangChain agent is reached through the floating chat widget (`ChatWidget` → `POST /chat`).
- **Custom regions** drawn by the user are stored in the browser's `localStorage` only.
- The region statistics card is computed on demand via TiTiler; results are not persisted.
