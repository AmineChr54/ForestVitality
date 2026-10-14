"""
Ingest Service - Tile-centric Sentinel-2 scene ingestion pipeline.

Handles ingestion of Sentinel-2 scenes from Copernicus API with support for:
- Large bounding boxes spanning multiple MGRS tiles
- Tile-centric processing for scalability
- Smart caching to avoid re-downloading existing data
"""

import logging
from typing import Dict, List, Optional, Tuple, Generator, Any
import threading
import queue
import json
import time

from backend_app.services.copernicus_api import CopernicusAPIClient
from backend_app.services.conversion_service import convert_raw_to_scene_metadata
from backend_app.repositories.scene_repository import SceneRepository
from backend_app.services.band_fetch_service import process_scene_bands
from backend_app.utils.spatial import get_intersecting_mgrs_tiles

logger = logging.getLogger(__name__)


# Required bands for vegetation analysis
REQUIRED_BANDS = ["B02", "B03", "B04", "B8A", "B11"]


def ingest_by_tiles(
    bbox: Tuple[float, float, float, float],
    from_date: str,
    to_date: str,
    mgrs_tiles: Optional[List[str]] = None,
    resolution: int = 20
) -> Dict:
    """
    Main entry point for tile-centric ingestion.
    
    Handles large bounding boxes by splitting into MGRS tiles and processing
    each tile independently. This enables scalable processing and virtual
    mosaicking (files stored separately per tile).
    
    Args:
        bbox: Bounding box as (min_lon, min_lat, max_lon, max_lat)
        from_date: Start date in YYYY-MM-DD format
        to_date: End date in YYYY-MM-DD format
        mgrs_tiles: Optional list of specific MGRS tile IDs to process.
                    If None, auto-calculated from bbox.
    
    Returns:
        Dict with structure:
        {
            "tiles_processed": ["32UMA", "32UMB"],
            "tiles_skipped": ["32UMC"],  # No scenes found
            "scenes_ingested": ["scene_id_1", ...],
            "total_scenes": 5,
            "errors": []
        }
    """
    # Auto-calculate MGRS tiles from bbox if not provided
    if mgrs_tiles is None:
        mgrs_tiles = get_intersecting_mgrs_tiles(bbox)
        logger.info(f"BBox covers tiles: {', '.join(mgrs_tiles)}")
    
    results = {
        "tiles_processed": [],
        "tiles_skipped": [],
        "scenes_ingested": [],
        "total_scenes": 0,
        "errors": []
    }
    
    client = CopernicusAPIClient()
    repository = SceneRepository()
    
    # Process each tile independently
    for tile_id in mgrs_tiles:
        logger.info(f"Starting MGRS tile: {tile_id}")
        
        try:
            tile_result = _ingest_tile(
                client=client,
                repository=repository,
                bbox=bbox,
                from_date=from_date,
                to_date=to_date,
                tile_id=tile_id,
                resolution=resolution
            )
            
            if tile_result["scenes"]:
                results["tiles_processed"].append(tile_id)
                results["scenes_ingested"].extend(tile_result["scenes"])
                results["total_scenes"] += len(tile_result["scenes"])
            else:
                results["tiles_skipped"].append(tile_id)
                logger.info(f"No scenes found for tile {tile_id}")
                
        except Exception as e:
            error_msg = f"Tile {tile_id}: {str(e)}"
            results["errors"].append(error_msg)
            logger.error(error_msg)
    
    # Summary
    logger.info(f"Ingestion complete: {results['total_scenes']} scenes processed across {len(results['tiles_processed'])} tiles.")
    if results["errors"]:
        logger.warning(f"Errors: {len(results['errors'])}")
    if results["tiles_skipped"]:
        logger.info(f"Skipped tiles (no scenes): {', '.join(results['tiles_skipped'])}")
    
    return results


def _ingest_tile(
    client: CopernicusAPIClient,
    repository: SceneRepository,
    bbox: Tuple[float, float, float, float],
    from_date: str,
    to_date: str,
    tile_id: str,
    resolution: int = 20
) -> Dict:
    """
    Ingest scenes for a specific MGRS tile.
    
    Args:
        client: Authenticated Copernicus API client
        repository: Scene repository for storage
        bbox: Original bounding box
        from_date: Start date
        to_date: End date
        tile_id: MGRS tile ID to filter for
        
    Returns:
        Dict with {"scenes": [list of scene IDs], "errors": []}
    """
    result = {"scenes": [], "errors": []}
    
    # Search for scenes in the bbox/date range
    raw = client.search_scenes(bbox, from_date, to_date)
    
    if not raw or "features" not in raw:
        return result
    
    # token = client.token  <-- REMOVED (will access inside loop)
    
    for feature in raw["features"]:
        try:
            # Convert STAC → internal model
            scene = convert_raw_to_scene_metadata(feature)
            
            # Filter: Only process scenes matching this tile
            if scene.tile_id != tile_id:
                continue
            
            # Ensure product_id exists
            if not hasattr(scene, "product_id") or not scene.product_id:
                raise ValueError("Missing product_id in SceneMetadata")
            
            logger.info(f"Processing scene: {scene.id}")
            
            # Store scene metadata
            repository.store_scene(scene)
            
            # Extract required bands
            band_urls = {
                band.name: band.href
                for band in scene.bands
                if band.name in REQUIRED_BANDS
            }
            
            # Process bands into multi-band COG
            cog_result = process_scene_bands(
                band_urls=band_urls,
                token=client.token,  # Get fresh token for each scene
                scene_id=scene.id,
                resolution=resolution
            )
            
            # Save scene COG path to repository
            if cog_result.get("scene_path"):
                repository.update_scene_cog_path(scene.id, cog_result["scene_path"])
                status = "cached" if cog_result.get("cached") else "downloaded"
                logger.info(f"Processed {scene.id} ({status})")
            else:
                logger.warning(f"No scene COG created for {scene.id}: {cog_result.get('error')}")
                result["errors"].append(f"No COG for {scene.id}")
            
            result["scenes"].append(scene.id)
            
        except Exception as e:
            error_msg = f"Scene processing failed: {e}"
            result["errors"].append(error_msg)
            logger.error(error_msg)
    
    return result


def ingest_scenes(
    bbox: Tuple[float, float, float, float],
    from_date: str,
    to_date: str,
    resolution: int = 20
) -> Dict:
    """
    Legacy entry point for backwards compatibility.
    
    Delegates to ingest_by_tiles for tile-centric processing.
    
    Args:
        bbox: Bounding box as (min_lon, min_lat, max_lon, max_lat)
        from_date: Start date in YYYY-MM-DD format
        to_date: End date in YYYY-MM-DD format
        
    Returns:
        Dict with ingestion results (compatible with legacy format)
    """
    result = ingest_by_tiles(bbox, from_date, to_date, resolution=resolution)
    
    # Return legacy-compatible format
    return {
        "ingested": result["scenes_ingested"],
        "count": result["total_scenes"]
    }


def ingest_scenes_stream(
    bbox: Tuple[float, float, float, float],
    from_date: str,
    to_date: str,
    resolution: int = 20
) -> Generator[str, None, None]:
    """
    Streaming ingestion endpoint with real-time progress updates via SSE.
    
    Yields Server-Sent Events (SSE) formatted messages with progress details:
    - start: Initial info with total tiles
    - tile_start: When processing a tile begins
    - scene_start: When processing a scene begins
    - download_progress: Bytes downloaded (emitted frequently)
    - scene_complete: When a scene finishes
    - tile_complete: When a tile finishes
    - complete: Final summary with all stats
    - error: Any errors encountered
    
    Args:
        bbox: Bounding box as (min_lon, min_lat, max_lon, max_lat)
        from_date: Start date in YYYY-MM-DD format
        to_date: End date in YYYY-MM-DD format
        
    Yields:
        SSE-formatted strings: "data: {...json...}\\n\\n"
    """
    event_queue: queue.Queue = queue.Queue()
    
    def emit(event_type: str, **data):
        """Put an event into the queue."""
        event_queue.put({
            "type": event_type,
            "timestamp": time.time(),
            **data
        })
    
    def run_ingestion():
        """Background thread that performs ingestion and emits events."""
        try:
            # Get MGRS tiles
            mgrs_tiles = get_intersecting_mgrs_tiles(bbox)
            emit("start", total_tiles=len(mgrs_tiles), tiles=mgrs_tiles)
            
            client = CopernicusAPIClient()
            repository = SceneRepository()
            
            total_bytes = 0
            total_expected_bytes = 0  # New: Track total expected size
            total_scenes = 0
            scenes_ingested = []
            errors = []

             # Check if any scenes exist for the requested date across ALL tiles
            # This prevents us from processing tiles one by one if the date itself has no data
            initial_check = client.search_scenes(bbox, from_date, to_date)
            
            if not initial_check or not initial_check.get("features"):
                # No scenes found for the requested date range
                logger.info(f"No scenes found for date range {from_date} to {to_date}. Searching for nearest...")
                
                # Expand search window (+/- 30 days)
                from datetime import datetime, timedelta
                start_dt = datetime.strptime(from_date, "%Y-%m-%d")
                
                # Search up to 1 month before and after
                search_start = (start_dt - timedelta(days=30)).strftime("%Y-%m-%d")
                search_end = (start_dt + timedelta(days=30)).strftime("%Y-%m-%d")
                
                expanded_search = client.search_scenes(bbox, search_start, search_end)
                
                suggested_date = None
                
                if expanded_search and expanded_search.get("features"):
                    # Find closest scene
                    features = expanded_search["features"]
                    closest_diff = float('inf')
                    
                    for feat in features:
                        # Parse scene date (e.g., "2023-01-01T10:00:00Z")
                        if "properties" in feat and "datetime" in feat["properties"]:
                            scene_date_str = feat["properties"]["datetime"]
                            scene_dt = datetime.strptime(scene_date_str.split("T")[0], "%Y-%m-%d")
                            
                            # Calculate difference in days
                            diff = abs((scene_dt - start_dt).days)
                            
                            if diff < closest_diff:
                                closest_diff = diff
                                suggested_date = scene_dt.strftime("%Y-%m-%d")
                
                if suggested_date:
                    msg = f"Keine Aufnahmen für den {from_date} gefunden."
                    emit("no_scenes_error", 
                         message=msg, 
                         suggested_date=suggested_date,
                         original_date=from_date)
                else:
                    emit("error", message=f"Keine Sentinel-2 Daten für diesen Zeitraum gefunden (auch nicht +/- 30 Tage).")
                
                emit("done")
                return

            
            for tile_idx, tile_id in enumerate(mgrs_tiles):
                emit("tile_start", tile_id=tile_id, tile_index=tile_idx + 1, total_tiles=len(mgrs_tiles))
                
                try:
                    # Search for scenes
                    raw = client.search_scenes(bbox, from_date, to_date)
                    
                    if not raw or "features" not in raw:
                        emit("tile_complete", tile_id=tile_id, scenes_processed=0)
                        continue
                    
                    # token = client.token <-- REMOVED
                    scenes_in_tile = 0
                    
                    for feature in raw["features"]:
                        try:
                            scene = convert_raw_to_scene_metadata(feature)
                            
                            if scene.tile_id != tile_id:
                                continue
                            
                            if not hasattr(scene, "product_id") or not scene.product_id:
                                continue
                            
                            emit("scene_start", scene_id=scene.id, tile_id=tile_id)
                            
                            # Store scene metadata
                            repository.store_scene(scene)
                            
                            # Extract required bands
                            band_urls = {
                                band.name: band.href
                                for band in scene.bands
                                if band.name in REQUIRED_BANDS
                            }
                            
                            scene_bytes = 0
                            
                            scene_bytes = 0
                            
                            def progress_callback(chunk_bytes: int, total_increment: int):
                                nonlocal total_bytes, scene_bytes, total_expected_bytes
                                total_bytes += chunk_bytes
                                scene_bytes += chunk_bytes
                                total_expected_bytes += total_increment
                                
                                # Emit progress every ~100KB to avoid flooding
                                if scene_bytes % 102400 < 8192:
                                    emit("download_progress", 
                                         scene_id=scene.id,
                                         scene_bytes=scene_bytes,
                                         total_bytes=total_bytes,
                                         total_expected=total_expected_bytes)
                            
                            # Process bands into multi-band COG
                            cog_result = process_scene_bands(
                                band_urls=band_urls,
                                token=client.token,  # get fresh token
                                scene_id=scene.id,
                                progress_callback=progress_callback,
                                resolution=resolution
                            )
                            
                            # Save scene COG path
                            if cog_result.get("scene_path"):
                                repository.update_scene_cog_path(scene.id, cog_result["scene_path"])
                            
                            scenes_ingested.append(scene.id)
                            scenes_in_tile += 1
                            total_scenes += 1
                            
                            scene_path = cog_result.get("scene_path")
                            logger.info(f"Emitting scene_complete for {scene.id} -> {scene_path}")

                            emit("scene_complete", 
                                 scene_id=scene.id,
                                 scene_path=scene_path,
                                 cached=cog_result.get("cached", False),
                                 scene_bytes=scene_bytes,
                                 total_bytes=total_bytes,
                                 total_scenes=total_scenes)
                            
                        except Exception as e:
                            error_msg = f"Scene error: {str(e)}"
                            errors.append(error_msg)
                            emit("error", message=error_msg, scene_id=getattr(scene, 'id', 'unknown'))
                    
                    emit("tile_complete", tile_id=tile_id, scenes_processed=scenes_in_tile)
                    
                except Exception as e:
                    error_msg = f"Tile {tile_id} error: {str(e)}"
                    errors.append(error_msg)
                    emit("error", message=error_msg, tile_id=tile_id)
            
            # Final summary
            emit("complete",
                 total_scenes=total_scenes,
                 total_bytes=total_bytes,
                 total_mb=round(total_bytes / (1024 * 1024), 2),
                 scenes_ingested=scenes_ingested,
                 errors=errors)
            
        except Exception as e:
            emit("error", message=f"Fatal error: {str(e)}")
        finally:
            emit("done")  # Signal to stop iteration
    
    # Start background thread
    thread = threading.Thread(target=run_ingestion, daemon=True)
    thread.start()
    
    # Yield events as SSE format
    while True:
        try:
            event = event_queue.get(timeout=300)  # 5 min timeout
            if event.get("type") == "done":
                break
            yield f"data: {json.dumps(event)}\n\n"
        except queue.Empty:
            # Timeout - send keepalive
            yield f"data: {json.dumps({'type': 'keepalive'})}\n\n"


# --- Class Wrapper for compatibility with ChatAgentService ---

class IngestService:
    """
    Class wrapper for ingestion functions.
    Used by ChatAgentService to provide a consistent interface.
    """
    
    def __init__(self):
        self.client = CopernicusAPIClient()
        self.repository = SceneRepository()
    
    def ingest_by_product_id(self, product_id: str) -> Dict[str, Any]:
        """
        Ingest a specific scene by its Copernicus product ID.
        """
        try:
            # Get the scene from Copernicus using correct method
            result = self.client.search_by_id(product_id)
            
            if not result or not result.get("features"):
                return {"status": "error", "message": f"Product {product_id} not found in Copernicus"}
            
            # Use the first match
            feature = result["features"][0]
            
            # Convert and process
            scene = convert_raw_to_scene_metadata(feature)
            
            # Ensure it's stored
            self.repository.store_scene(scene)
            
            # Extract band URLs for processing
            band_urls = {
                band.name: band.href
                for band in scene.bands
                if band.name in REQUIRED_BANDS
            }
            
            # Process bands correctly using band_urls and token
            result = process_scene_bands(
                band_urls=band_urls,
                token=self.client.token,
                scene_id=scene.id
            )
            
            if result.get("error"):
                return {"status": "error", "message": result["error"]}
                
            # PERSIST the COG path in repository so analysis can find it
            cog_path = result.get("scene_path")
            if cog_path:
                # Remove s3://bucket/ prefix for repository storage consistency if needed
                # However, SceneRepository usage expects relative or full path?
                # Let's check SceneRepository.update_scene_cog_path
                self.repository.update_scene_cog_path(scene.id, cog_path)
            
            return {"status": "success", "scene_id": scene.id}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def ingest_by_bbox(
        self, 
        bbox: Tuple[float, float, float, float],
        from_date: str,
        to_date: str
    ) -> Dict[str, Any]:
        """Wrapper for the tile-centric ingestion."""
        return ingest_by_tiles(bbox, from_date, to_date)
