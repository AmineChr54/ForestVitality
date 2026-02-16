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

## Remaining Tasks

### Frontend Team

| Task                    | Priority | Description                                     |
| ----------------------- | -------- | ----------------------------------------------- |
| Add TiTiler tile layer  | HIGH     | Integrate TiTiler tiles into Leaflet map        |
| Index selector dropdown | HIGH     | Allow user to switch between NDVI/NDWI/EVI/NDMI |
| Opacity slider          | MEDIUM   | Control overlay transparency                    |
| Legend component        | MEDIUM   | Show colormap scale (-1 to 1)                   |

**Example Leaflet Integration:**

```javascript
const expressions = {
  NDVI: "(b4-b3)/(b4+b3)",
  NDWI: "(b2-b4)/(b2+b4)", 
  EVI:  "2.5*(b4-b3)/(b4+6*b3-7.5*b1+1)",
  NDMI: "(b4-b5)/(b4+b5)"
};

const tileUrl = `http://localhost:8082/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png` +
  `?url=${scenePath}&expression=${expressions.NDVI}&rescale=-1,1&colormap_name=rdylgn`;

L.tileLayer(tileUrl, { opacity: 0.7 }).addTo(map);
```

---

### Backend Team

| Task                         | Priority | Description                                                               |
| ---------------------------- | -------- | ------------------------------------------------------------------------- |
| API endpoint for scene paths | MEDIUM   | Return scene COG paths for frontend tile URL construction                 |
| Filter L2A products          | LOW      | Optionally exclude L2A during search (they have different band structure) |

**Example endpoint needed:**

```
GET /api/scenes/{tile_id}/{date}/cog
Response: { "scene_path": "s3://sentinel-bands/32UMA/2025/10/10/scene.tif" }
```

---

### Security Team

| Task                   | Priority | Description                                                           |
| ---------------------- | -------- | --------------------------------------------------------------------- |
| TiTiler authentication | LOW      | Consider adding auth proxy in front of TiTiler if needed              |
| MinIO bucket policy    | LOW      | Currently public within Docker network, review if exposing externally |

> **Note:** TiTiler currently has no authentication. If the service will be exposed publicly, consider placing it behind an auth proxy or using TiTiler's FastAPI middleware.

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
