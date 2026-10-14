TiTiler Integration - Task Summary

## Completed Tasks ✅

### Infrastructure

- [X] Added TiTiler to `docker-compose.yml` on port 8082
- [X] Configured TiTiler with MinIO S3 credentials
- [X] Updated `Taskfile.yml` with TiTiler URL

### Backend (Ingestion Pipeline)

- [X] Modified `band_fetch_service.py` to stack bands into multi-band COG
- [X] Band order: `[B02, B03, B04, B8A, B11]` (indices 1-5 in TiTiler)
- [X] Updated `ingest_service.py` for new scene-based return format
- [X] Added `update_scene_cog_path()` to `scene_repository.py`
- [X] Cleaned up logging (removed raw JSON, cleaner output)

### Verified Working

- [X] TiTiler reads COG from MinIO
- [X] NDVI expression: `(b4-b3)/(b4+b3)`
- [X] NDWI expression: `(b2-b4)/(b2+b4)`
- [X] EVI expression: `2.5*(b4-b3)/(b4+6*b3-7.5*b1+1)`
- [X] NDMI expression: `(b4-b5)/(b4+b5)`
- [X] Colormap rendering (rdylgn, blues)

---

## Open points

| Area | Item |
| ---- | ---- |
| Security | TiTiler has no authentication; put it behind an auth proxy (or FastAPI middleware) before exposing it publicly. |
| Security | MinIO bucket is only reachable inside the Docker network; review the bucket policy before exposing it. |
| Backend | Optionally exclude L2A products during search (different band structure). |

The frontend builds the tile URL in `frontend/src/components/map/MapView.tsx` using the band-math expressions from `frontend/src/constants/map.ts`, and clips tiles to the selected region on a canvas layer.

---

## Architecture Reference

```
Frontend → TiTiler (8082) → MinIO (9000)
              ↓
    Expression Engine (NDVI, EVI, NDWI, NDMI)
              ↓
    Colormap Renderer (rdylgn, viridis, blues)
              ↓
    PNG Tile Response
```
