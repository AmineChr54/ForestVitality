# Backend API

The FastAPI backend serves interactive OpenAPI docs at **http://localhost:8000/docs**. This page is a quick overview.

All endpoints except the health checks require a Keycloak bearer token (`Authorization: Bearer <token>`). Each endpoint also checks a permission, which is derived from the user's Keycloak realm roles (see [RBAC_IMPLEMENTATION.md](RBAC_IMPLEMENTATION.md)).

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/health` | public | Liveness check |
| GET | `/os-health` | public | OpenSearch cluster check |
| GET | `/municipality/lookup?name=` | `regions:read` | Find a municipality by name |
| GET | `/municipality/regions?search=&limit=` | `regions:read` | Search the region hierarchy (Bundesland → Bezirk → Kreis) |
| GET | `/municipality/regions/geometry` | `regions:read` | GeoJSON geometry of a region |
| GET | `/sentinel/fetch?bbox=&date_from=&date_to=` | `scenes:read` | Search Sentinel-2 scenes in the Copernicus Data Space STAC catalogue |
| POST | `/ingest/` | `data:ingest` | Download, stack and store scenes for a bbox and date range (synchronous) |
| POST | `/ingest/stream` | `data:ingest` | Same as above, streaming progress as Server-Sent Events |
| POST | `/analysis/` | `analysis:run` | Start a vegetation-index analysis as a background job |
| POST | `/chat` | authenticated; the agent's tools are gated by role | Ask the LangChain AI agent; accepts the current map context |
| GET | `/chat/health` | public | Chat agent configuration check |
| POST | `/save-log` | `logs:create` | Store an analysis or operation log in OpenSearch |
| GET | `/logs/{log_id}` | `logs:read` | Read a stored log |

## Ingestion stream events

`POST /ingest/stream` returns `text/event-stream`. Each `data:` line is a JSON object with a `type` and a `timestamp`:

| `type` | Payload | Meaning |
|--------|---------|---------|
| `start` | `total_tiles`, `tiles` | MGRS tiles covering the bbox |
| `tile_start` / `tile_complete` | `tile_id`, … | Progress per Sentinel-2 tile |
| `scene_start` | `scene_id`, `tile_id` | Processing of a scene began |
| `download_progress` | `scene_bytes`, `total_bytes`, `total_expected` | Band download progress |
| `scene_complete` | `scene_id`, `scene_path` | A stacked COG was stored in MinIO |
| `no_scenes_error` | `suggested_date`, `original_date`, `message` | No imagery for the date; the nearest available date is suggested |
| `error` | `message` | A tile, scene or the whole job failed |
| `complete` | summary | All tiles processed |
| `done` | – | End of stream |
| `keepalive` | – | Sent periodically to keep the connection open |
