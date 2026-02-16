# VitalityForest Frontend 🌲

Waldgesundheits-Monitoring Dashboard mit Vegetationsindex-Analyse und KI-Insights.

## Quick Start

```bash
# Dependencies installieren
npm install

# Environment Datei erstellen
cp .env.example .env.local

# Dev Server starten
npm run dev

# Build für Production
npm run build
```

Öffne http://localhost:5173 und logge dich mit beliebiger E-Mail + 4+ Zeichen Passwort ein.

---

## Environment Variables

### Configuration

Create a `.env.local` file in the `frontend/` directory (copy from `.env.example`):

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Map Configuration (OpenStreetMap default)
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

# Sentinel API (optional - backend handles auth)
VITE_SENTINEL_API_KEY=

# Debug mode (enables console logging)
VITE_DEBUG_MODE=true
```

### Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000` | Backend API base URL |
| `VITE_MAP_TILE_URL` | No | OpenStreetMap tiles | Map tile provider URL |
| `VITE_SENTINEL_API_KEY` | No | (empty) | Sentinel Hub API key (if needed) |
| `VITE_DEBUG_MODE` | No | `false` | Enable debug logging |

### Environment-Specific Files

- `.env.example` - Template with documentation (committed to git)
- `.env.local` - Local development (gitignored)
- `.env.production.local` - Production overrides (gitignored)

---

## Tech Stack

- **React 19** + TypeScript
- **Vite** für schnelles Development
- **React Router** mit Lazy Loading
- **Leaflet** für Karten
- **React Query** für Server State
- **Zustand** für Client State
- **Axios** für HTTP Requests

---

## Projektstruktur

```
src/
├── api/                 # API Layer
│   ├── httpClient.ts    # Axios configuration with auth & error handling
│   ├── healthApi.ts     # Health check endpoints
│   ├── ingestApi.ts     # Data ingestion endpoints
│   ├── sentinelApi.ts   # Sentinel satellite data endpoints
│   └── municipalityApi.ts # Municipality lookup endpoints
│
├── components/          # Reusable UI components
│   ├── ai/              # AiChatPanel, InsightCard
│   ├── indexCalculator/ # IndexSelector, RunAnalysisButton
│   ├── layout/          # Sidebar, Topbar
│   └── map/             # MapView, DrawTools, IndexLegend
│
├── config/              # Configuration
│   └── env.ts           # Type-safe environment variables
│
├── constants/           # App-wide constants
│   ├── api.ts           # API endpoint definitions
│   ├── routes.ts        # Route path definitions
│   └── map.ts           # Map configuration
│
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Authentication logic
│   ├── useAnalysis.ts   # Analysis operations
│   └── ...
│
├── layouts/             # Page layout wrappers
├── pages/               # Page components (routes)
├── router/              # React Router Config
├── state/               # State management
│   └── authStore.ts     # Zustand auth store
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
    └── apiErrors.ts     # Error handling utilities
```

---

## HTTP Client & API Layer

### Basic Usage

```typescript
import { httpClient } from '@/api/httpClient';
import { checkHealth, ingestScenes } from '@/api';

// Direct httpClient usage
const response = await httpClient.get('/some-endpoint');

// Using typed API functions
const health = await checkHealth();
const result = await ingestScenes({
  bbox: [8.0, 49.0, 9.0, 50.0],
  from_date: '2024-01-01',
  to_date: '2024-01-31'
});
```

### Features

- **Auto Auth Token**: Tokens are automatically attached to requests
- **401 Handling**: Automatic redirect to login on authentication failure
- **Error Transformation**: Consistent error format across all API calls
- **Type Safety**: Full TypeScript support for requests and responses

### Error Handling

```typescript
import { parseApiError, getUserFriendlyMessage } from '@/utils/apiErrors';

try {
  await someApiCall();
} catch (error) {
  const appError = parseApiError(error);
  
  if (appError.requiresAuth) {
    // User will be redirected to login automatically
    return;
  }
  
  // Show user-friendly message
  showToast(appError.message);
  
  // Or get just the message
  const message = getUserFriendlyMessage(error);
}
```

### Error Codes

| Status | Code | Default Message (DE) |
|--------|------|---------------------|
| 400 | `BAD_REQUEST` | Die Anfrage war ungültig |
| 401 | `UNAUTHORIZED` | Ihre Sitzung ist abgelaufen |
| 403 | `FORBIDDEN` | Keine Berechtigung |
| 404 | `NOT_FOUND` | Ressource nicht gefunden |
| 500 | `SERVER_ERROR` | Serverfehler aufgetreten |
| - | `NETWORK_ERROR` | Keine Verbindung zum Server |

---

## Authentication

Authentication state is managed via Zustand with localStorage persistence.

```typescript
import { useAuthStore } from '@/state/authStore';

// In React components
const { token, isAuthenticated, setToken, logout } = useAuthStore();

// Outside React (e.g., in httpClient)
import { getAuthToken, clearAuth } from '@/state/authStore';
const token = getAuthToken();
```

### Auth Flow

1. User logs in → token stored in Zustand → persisted to localStorage
2. On app start → token rehydrated from localStorage
3. On 401 response → auth cleared → redirect to `/login`
4. On logout → auth cleared → localStorage cleaned

---

## Für F2: Hooks ersetzen

Die aktuellen Hooks in `src/hooks/` sind **Mocks** für UI-Entwicklung. Ersetze sie mit React Query:

| Mock Hook | Zu ersetzen mit |
|-----------|-----------------| 
| `useAuth` | Keep mock or integrate with backend auth |
| `useRegions` | `useQuery` / `useMutation` für `/api/regions` |
| `useAnalysis` | `useQuery` / `useMutation` für `/api/analysis` |
| `useSentinelImages` | `useQuery` mit `sentinelApi.ts` |
| `useAiInsights` | `useMutation` für `/api/ai/insights` |

**Interface beibehalten!** Die Pages erwarten diese Rückgabewerte:
```typescript
// useRegions soll zurückgeben:
{ regions, isLoading, selectedRegion, selectRegion, createRegion, deleteRegion }

// useAnalysis soll zurückgeben:
{ results, currentJob, isLoading, runAnalysis, getResultsByRegion }
```

---

## Scripts

| Command | Beschreibung |
|---------|-------------|
| `npm run dev` | Dev Server auf port 5173 |
| `npm run build` | Production Build |
| `npm run lint` | ESLint prüfen |
| `npm run preview` | Production Build lokal testen |

---

## Backend Integration

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/os-health` | GET | OpenSearch health |
| `/ingest/` | POST | Ingest satellite data |
| `/sentinel/fetch` | GET | Fetch Sentinel scenes |
| `/municipality/lookup` | GET | Look up municipality |
| `/save-log` | POST | Save log entry |
| `/logs/{id}` | GET | Get log by ID |

### CORS

The backend must allow CORS from the frontend origin. In development:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

---

## Bekannte Limitierungen

- **DrawTools**: Demo-Modus - generiert Mock-Polygone. Für echtes Zeichnen → `leaflet-draw` Plugin integrieren
- **Analysis Overlay**: Kein echtes Raster-Overlay, nur Indikator. Braucht GeoTIFF-Rendering
- **Auth**: localStorage Mock - Production braucht echte JWT-Auth mit Backend

---

## Lizenz

Internes Projekt - VitalityForest Team
