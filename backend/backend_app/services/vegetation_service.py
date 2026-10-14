import logging
import os
import re
import boto3
import rasterio
import numpy as np
from rasterio.session import AWSSession
from rasterio.enums import Resampling
from typing import Dict, Any, Optional, List

from backend_app.repositories.scene_repository import SceneRepository, get_scene_by_id
from backend_app.services.band_name_service import clean_band_name
from backend_app.services.band_fetch_service import get_s3_client, BUCKET_NAME, generate_scene_path
from backend_app.formulas.vegetation_formulas import (
    calculate_ndvi,
    calculate_evi,
    calculate_ndwi,
    calculate_ndmi,
)

logger = logging.getLogger(__name__)

# Robust mapping with fallbacks
BAND_MAP = {
    "red": ["B04"],
    "green": ["B03"],
    "blue": ["B02"],
    "nir": ["B8A", "B08"],  # Try B8A (narrow NIR) first, fallback to B08 (standard NIR)
    "swir": ["B11"]
}

def get_raster_path(band_info: dict) -> str:
    """Determine the correct path for Rasterio (Local or S3 VSI)."""
    if band_info.get("local_path") and os.path.exists(band_info["local_path"]):
        return band_info["local_path"]
    
    s3_path = band_info.get("s3_path")
    if s3_path:
        if s3_path.startswith("/vsis3/"):
            return s3_path
        if s3_path.startswith("s3://"):
             return s3_path.replace("s3://", "/vsis3/")
        bucket = os.getenv("MINIO_BUCKET", "forest-vitality")
        return f"/vsis3/{bucket}/{s3_path}"
    
    return None

def discover_bands_in_minio(scene_id: str) -> Dict[str, str]:
    """
    Heuristically search MinIO for bands if metadata is missing.
    Matches Hive structure: {TILE}/{YEAR}/{MONTH}/{DAY}/...
    """
    s3 = get_s3_client()
    found_paths = {}
    
    # 1. Predict base directory from scene ID
    try:
        # T32UNC_20260120T102341 -> 32UNC/2026/01/20/
        date_match = re.search(r'_(\d{4})(\d{2})(\d{2})T', scene_id)
        tile_match = re.search(r'_T(\d{2}[A-Z]{3})_', scene_id)
        
        if not date_match or not tile_match:
            return {}
            
        year, month, day = date_match.groups()
        tile_id = tile_match.group(1)
        base_prefix = f"{tile_id}/{year}/{month}/" # Scan entire month for date mismatches
        
        logger.debug(f"Scanning MinIO month folder: {base_prefix}")
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=base_prefix)
        
        if 'Contents' not in response:
            return {}

        # Look for multi-band COG first
        for obj in response['Contents']:
            key = obj['Key']
            if key.endswith("scene.tif"):
                logger.debug(f"Found self-healing COG: {key}")
                return {"_cog": key}
        
        # Look for individual bands
        for obj in response['Contents']:
            key = obj['Key']
            filename = os.path.basename(key)
            # Match B01.tif, B02.jp2, etc.
            match = re.search(r'(B[0-9]{2}|B8A)\.(tif|jp2|tiff)', filename, re.IGNORECASE)
            if match:
                band_name = match.group(1).upper()
                # Check for day match in path to avoid mixing scenes
                if f"/{day}/" in key or f"/{int(day)}/" in key:
                    found_paths[band_name] = key
                elif not found_paths.get(band_name): # Fallback to any folder in month if day missing
                    found_paths[band_name] = key

    except Exception as e:
        logger.warning(f"MinIO discovery failed: {e}")
        
    return found_paths

def load_band(path, target_shape=None, band_idx=1):
    """Load a specific band from a local or virtual path with optional resampling."""
    if not path:
        raise ValueError("Band path is missing")
    
    # Configure environment
    os.environ['AWS_S3_ENDPOINT'] = os.getenv("MINIO_ENDPOINT", "localhost:9000").replace("http://", "")
    os.environ['AWS_HTTPS'] = 'NO'
    os.environ['AWS_VIRTUAL_HOSTING'] = 'FALSE'
    os.environ['AWS_ACCESS_KEY_ID'] = os.getenv("MINIO_ACCESS_KEY")
    os.environ['AWS_SECRET_ACCESS_KEY'] = os.getenv("MINIO_SECRET_KEY")
    
    session = AWSSession(
        aws_access_key_id=os.getenv("MINIO_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("MINIO_SECRET_KEY"),
        endpoint_url=os.getenv("MINIO_ENDPOINT"),
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    )
    
    with rasterio.Env(session):
        with rasterio.open(path) as src:
            if target_shape:
                new_height, new_width = target_shape
            else:
                upscale_factor = 0.1 # 1/10 for speed
                new_height = int(src.height * upscale_factor)
                new_width = int(src.width * upscale_factor)
            
            data = src.read(
                band_idx,
                out_shape=(new_height, new_width),
                resampling=Resampling.bilinear
            ).astype(float)
            
            data = data / 10000.0
            data = np.clip(data, 0, 1)
            return data

def get_vegetation_index(scene_id: str):
    scene = get_scene_by_id(scene_id)
    if not scene:
        return {"error": "Scene not found"}

    repo = SceneRepository()
    
    try:
        # 1. Resolve paths (Try OpenSearch first, then Heuristic Sync)
        found_cog = scene.get("scene_cog_path")
        band_paths = {}
        
        # Check if we need to sync
        needs_sync = found_cog is None
        if not needs_sync:
            # Check if bands have paths
            existing_bands = {clean_band_name(b["name"]): b.get("s3_path") for b in scene["bands"]}
            if not any(existing_bands.values()):
                needs_sync = True

        if needs_sync:
            logger.info(f"Metadata out of sync for {scene_id}. Probing MinIO...")
            discovery = discover_bands_in_minio(scene_id)
            
            if "_cog" in discovery:
                found_cog = discovery["_cog"]
                repo.update_scene_cog_path(scene_id, found_cog)
            elif discovery:
                # Update OpenSearch for future calls
                for b_name, s3_key in discovery.items():
                    repo.update_band_s3_path(scene_id, b_name, s3_key)
                # Refresh scene data
                scene = get_scene_by_id(scene_id)
            else:
                return {"error": "No data found in MinIO for this scene. Please ingest it first."}

        # 2. Loading Phase
        if found_cog:
            path = get_raster_path({"s3_path": found_cog})
            # Multi-band COG indices: B02=1, B03=2, B04=3, B8A=4, B11=5
            blue = load_band(path, band_idx=1)
            target_shape = blue.shape
            green = load_band(path, target_shape=target_shape, band_idx=2)
            red = load_band(path, target_shape=target_shape, band_idx=3)
            nir = load_band(path, target_shape=target_shape, band_idx=4)
            swir = load_band(path, target_shape=target_shape, band_idx=5)
        else:
            band_data = {clean_band_name(b["name"]): b for b in scene["bands"]}
            paths = {}
            for label, codes in BAND_MAP.items():
                # Try codes in order (e.g., B8A then B08)
                for code in codes:
                    if code in band_data and band_data[code].get("s3_path"):
                        paths[label] = get_raster_path(band_data[code])
                        break
                if not paths.get(label):
                    return {"error": f"Required band for {label} (tried {codes}) missing in MinIO."}

            red = load_band(paths["red"])
            target_shape = red.shape
            nir = load_band(paths["nir"], target_shape=target_shape)
            blue = load_band(paths["blue"], target_shape=target_shape)
            green = load_band(paths["green"], target_shape=target_shape)
            swir = load_band(paths["swir"], target_shape=target_shape)

        return {
            "ndvi": calculate_ndvi(nir, red),
            "evi": calculate_evi(nir, red, blue),
            "ndwi": calculate_ndwi(nir, green),
            "ndmi": calculate_ndmi(swir, nir),
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Raster processing error: {str(e)}"}

