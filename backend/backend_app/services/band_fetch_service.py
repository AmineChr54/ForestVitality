"""
Band Fetch Service - Cloud-native Sentinel-2 band processing pipeline.

Downloads JP2 bands from Copernicus, converts to Cloud-Optimized GeoTIFF (COG),
and uploads to MinIO with Hive-partitioned storage structure.

NEW: Stacks bands into single multi-band COG for TiTiler index calculations.
Band order: [B02, B03, B04, B8A, B11] for NDVI, NDWI, EVI, NDMI
"""

import os
import re
import requests
import boto3
import rasterio
import numpy as np
from rasterio.io import MemoryFile
from rasterio.enums import Resampling
from concurrent.futures import ThreadPoolExecutor
from botocore.client import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from typing import Dict, Optional, Tuple, List

load_dotenv()

# MinIO Configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
BUCKET_NAME = os.getenv("MINIO_BUCKET")

# Band order for multi-band COG (indices 1-5 in TiTiler)
# B02=Blue, B03=Green, B04=Red, B8A=NIR, B11=SWIR
BAND_ORDER = ["B02", "B03", "B04", "B8A", "B11"]


def get_s3_client():
    """Create and return a configured S3 client for MinIO."""
    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def generate_scene_path(scene_id: str) -> str:
    """
    Generate Hive-partitioned S3 path for multi-band scene COG.
    
    Args:
        scene_id: Sentinel-2 scene identifier
        
    Returns:
        Hive-partitioned path: "{TILE}/{YEAR}/{MONTH}/{DAY}/scene.tif"
    """
    try:
        # Extract date from scene ID
        date_match = re.search(r'_(\d{4})(\d{2})(\d{2})T\d{6}_', scene_id)
        if not date_match:
            raise ValueError(f"Cannot parse date from scene ID: {scene_id}")
        
        year, month, day = date_match.groups()
        
        # Extract MGRS tile ID
        tile_match = re.search(r'_T(\d{2}[A-Z]{3})_', scene_id)
        if not tile_match:
            raise ValueError(f"Cannot parse MGRS tile from scene ID: {scene_id}")
        
        tile_id = tile_match.group(1)
        
        return f"{tile_id}/{year}/{month}/{day}/scene.tif"
        
    except Exception as e:
        print(f"[WARN] Non-standard scene ID format, using fallback path: {e}")
        return f"misc/{scene_id}/scene.tif"


def check_scene_exists(s3_client, bucket: str, key: str) -> bool:
    """Check if scene COG already exists in MinIO."""
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            return False
        raise


def download_band(band_name: str, url: str, token: str, progress_callback=None) -> Tuple[str, Optional[bytes]]:
    """
    Download a single band from Copernicus API.
    
    Returns:
        Tuple of (band_name, raw_bytes) or (band_name, None) on failure
    """
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, stream=True, timeout=300)
        response.raise_for_status()
        
        content_chunks = []
        total_size = 0
        content_length = int(response.headers.get("content-length", 0))
        
        # Initial callback with total size info (chunk_size=0, total=content_length)
        if progress_callback and content_length > 0:
            progress_callback(0, content_length)
        
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                content_chunks.append(chunk)
                chunk_size = len(chunk)
                total_size += chunk_size
                if progress_callback:
                    progress_callback(chunk_size, 0)
                    
        content = b"".join(content_chunks)
        print(f"       ↓ {band_name}: {total_size / (1024*1024):.1f} MB")
        return (band_name, content)
        
    except Exception as e:
        print(f"[ERROR] Failed to download {band_name}: {e}")
        return (band_name, None)


def stack_bands_to_cog(band_data: Dict[str, bytes], target_resolution: int = 20) -> bytes:
    """
    Stack multiple bands into a single multi-band Cloud-Optimized GeoTIFF.
    
    Args:
        band_data: Dict of {band_name: raw_jp2_bytes}
        target_resolution: Target resolution in meters (20m for B8A/B11 native)
        
    Returns:
        Bytes of the stacked multi-band COG
    """
    print(f"       📦 Stacking bands...")
    
    # First pass: determine target shape based on requested resolution
    reference_band = None
    reference_profile = None
    
    # Select reference band based on target resolution
    if target_resolution == 10:
        # Use a 10m band (B02, B03, B04) as reference
        ref_candidates = ["B02", "B03", "B04"]
    else:
        # Use a 20m band (B8A, B11) as reference
        ref_candidates = ["B8A", "B11"]
    
    for band_name in ref_candidates:
        if band_name in band_data and band_data[band_name]:
            with MemoryFile(band_data[band_name]) as memfile:
                with memfile.open() as src:
                    reference_band = band_name
                    reference_profile = src.profile.copy()
                    target_height = src.height
                    target_width = src.width
                    break
    
    # Fallback: if preferred reference band not found, use any available band
    if reference_profile is None:
        for band_name in BAND_ORDER:
            if band_name in band_data and band_data[band_name]:
                with MemoryFile(band_data[band_name]) as memfile:
                    with memfile.open() as src:
                        reference_profile = src.profile.copy()
                        native_res = src.res[0]  # meters per pixel
                        if target_resolution == 10 and native_res > 10:
                            # 20m band used as ref but we need 10m → double the size
                            target_height = src.height * 2
                            target_width = src.width * 2
                        elif target_resolution == 20 and native_res <= 10:
                            # 10m band used as ref but we need 20m → halve the size
                            target_height = src.height // 2
                            target_width = src.width // 2
                        else:
                            target_height = src.height
                            target_width = src.width
                        break
    
    if reference_profile is None:
        raise ValueError("No valid band data to stack")
    
    # Read and resample all bands to target resolution
    stacked_data = []
    
    for band_name in BAND_ORDER:
        if band_name not in band_data or band_data[band_name] is None:
            print(f"[WARN] Missing band {band_name}, using zeros")
            stacked_data.append(np.zeros((target_height, target_width), dtype=np.uint16))
            continue
            
        with MemoryFile(band_data[band_name]) as memfile:
            with memfile.open() as src:
                # Check if resampling needed (10m -> 20m)
                if src.height != target_height or src.width != target_width:
                    data = src.read(
                        1,
                        out_shape=(target_height, target_width),
                        resampling=Resampling.bilinear
                    )
                else:
                    data = src.read(1)
                    
                stacked_data.append(data)
    
    # Update profile for multi-band COG
    reference_profile.update(
        driver="GTiff",
        count=len(BAND_ORDER),
        height=target_height,
        width=target_width,
        compress="deflate",
        tiled=True,
        blockxsize=256,
        blockysize=256,
        # Add band descriptions for TiTiler
    )
    
    # Write stacked COG to memory
    with MemoryFile() as dst_memfile:
        with dst_memfile.open(**reference_profile) as dst:
            for i, data in enumerate(stacked_data, start=1):
                dst.write(data, i)
                dst.set_band_description(i, BAND_ORDER[i-1])
            
            # Build overviews for efficient tile serving at multiple zoom levels
            overview_levels = [2, 4, 8, 16]
            dst.build_overviews(overview_levels, Resampling.nearest)
            dst.update_tags(ns='rio_overview', resampling='nearest')
            
        dst_memfile.seek(0)
        cog_bytes = dst_memfile.read()
        
    print(f"       ✅ Stacked {len(BAND_ORDER)} bands @ {target_resolution}m → {len(cog_bytes) / (1024*1024):.1f} MB COG")
    return cog_bytes


def process_scene_bands(band_urls: dict, token: str, scene_id: str, progress_callback=None, resolution: int = 20) -> dict:
    """
    Download bands and stack into single multi-band COG.
    
    Args:
        band_urls: Dict of {band_name: url}
        token: Bearer token for Copernicus API
        scene_id: Scene identifier for path generation
        
    Returns:
        Dict with scene S3 path and band order info
    """
    s3_client = get_s3_client()
    
    # Ensure bucket exists
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=BUCKET_NAME)
            print(f"[INFO] Created bucket: {BUCKET_NAME}")
        except Exception as e:
            print(f"[WARN] Could not ensure bucket exists: {e}")

    # Check if scene already exists
    scene_path = generate_scene_path(scene_id)
    s3_path = f"s3://{BUCKET_NAME}/{scene_path}"
    
    if check_scene_exists(s3_client, BUCKET_NAME, scene_path):
        print(f"       💾 Cached")
        return {
            "scene_path": s3_path,
            "bands": BAND_ORDER,
            "cached": True
        }
    
    # Filter to only download bands we need
    needed_bands = {b: url for b, url in band_urls.items() if b in BAND_ORDER}
    
    if len(needed_bands) == 0:
        print(f"       [ERROR] No matching bands found in provided URLs.")
        return {"scene_path": None, "bands": [], "error": "No compatible Sentinel-2 bands found (B02, B03, B04, B8A, B11 required)"}
    
    if len(needed_bands) < len(BAND_ORDER):
        missing = set(BAND_ORDER) - set(needed_bands.keys())
        print(f"       ⚠️  Missing bands: {', '.join(sorted(missing))}")
    
    print(f"       📥 Downloading {len(needed_bands)} bands...")
    
    # Download bands in parallel
    band_data = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(download_band, band, url, token, progress_callback): band
            for band, url in needed_bands.items()
        }
        
        for future in futures:
            band_name, content = future.result()
            if content:
                band_data[band_name] = content
    
    if not band_data:
        print(f"[ERROR] No bands downloaded for scene {scene_id}")
        return {"scene_path": None, "bands": [], "error": "No bands downloaded"}
    
    # Stack bands into multi-band COG
    try:
        cog_bytes = stack_bands_to_cog(band_data, target_resolution=resolution)
    except Exception as e:
        print(f"[ERROR] Failed to stack bands: {e}")
        return {"scene_path": None, "bands": [], "error": str(e)}
    
    # Upload to MinIO
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=scene_path,
            Body=cog_bytes,
            ContentType="image/tiff"
        )
        print(f"       ☁️  Uploaded → {scene_path}")
    except Exception as e:
        print(f"       ❌ Upload failed: {e}")
        return {"scene_path": None, "bands": [], "error": str(e)}
    
    return {
        "scene_path": s3_path,
        "bands": BAND_ORDER,
        "cached": False
    }
