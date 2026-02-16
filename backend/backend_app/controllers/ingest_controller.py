
from fastapi import APIRouter, Query, Depends
from fastapi.responses import StreamingResponse
from backend_app.services.ingest_service import ingest_scenes, ingest_scenes_stream
from typing import List, Optional
from datetime import date
from backend_app.security.http.security_dependencies import get_current_principal
from backend_app.security.bundles.security.domain.principal import Principal

router = APIRouter(
    prefix="/ingest",
    tags=["Ingestion"]
)

@router.post("/")
def ingest(
    bbox: List[float] = Query(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]"),
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    resolution: int = Query(20, description="Band resolution in meters (10 or 20)"),
    principal: Principal = Depends(get_current_principal),  # 🔐 authentication
):
    """
    High-level ingestion endpoint (synchronous).
    Delegates: Fetch → Convert → Validate → Store.
    Requires: data:ingest permission (ADMIN, DATA_MANAGER)
    """
    from backend_app.security.http.security_dependencies import security_service
    security_service.assert_permission(principal, "data:ingest")  # 🔐 authorization
    result = ingest_scenes(bbox, str(from_date), str(to_date), resolution=resolution)
    result["ingested_by"] = principal.user_id
    return result
    
@router.post("/stream")
def ingest_stream(
    bbox: List[float] = Query(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]"),
    from_date: date = Query(..., description="Start date YYYY-MM-DD"),
    to_date: date = Query(..., description="End date YYYY-MM-DD"),
    resolution: int = Query(20, description="Band resolution in meters (10 or 20)"),
    principal: Principal = Depends(get_current_principal),  # 🔐 authentication
):
    """
    Streaming ingestion endpoint with real-time progress updates via Server-Sent Events (SSE).
    
    ⚠️ AUTH TEMPORARILY DISABLED FOR TESTING
    
    Connect to this endpoint to receive live progress updates during ingestion:
    
    **Event Types:**
    - `start`: Initial info with total tiles to process
    - `tile_start`: When processing of a tile begins
    - `scene_start`: When processing of a scene begins
    - `download_progress`: Bytes downloaded (emitted every ~100KB)
    - `scene_complete`: When a scene finishes with stats
    - `tile_complete`: When a tile finishes
    - `complete`: Final summary with total bytes, scenes, and timing
    - `error`: Any errors encountered
    """
    from backend_app.security.http.security_dependencies import security_service
    security_service.assert_permission(principal, "data:ingest")  # 🔐 authorization
    return StreamingResponse(
        ingest_scenes_stream(tuple(bbox), str(from_date), str(to_date), resolution=resolution),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
