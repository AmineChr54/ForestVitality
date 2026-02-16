"""
Spatial utilities for MGRS tile calculations.

This module provides functions for working with Military Grid Reference System (MGRS)
tiles, used for organizing Sentinel-2 data in a Hive-partitioned structure.
"""

import mgrs
from typing import List, Tuple
import math


def get_intersecting_mgrs_tiles(bbox: Tuple[float, float, float, float]) -> List[str]:
    """
    Calculate which MGRS grid tiles intersect a bounding box.
    
    Creates a grid of sample points within the bbox and converts each to an MGRS
    tile identifier. Returns unique 5-character tile IDs (e.g., "32UMA").
    
    Args:
        bbox: Tuple of (min_lon, min_lat, max_lon, max_lat) in WGS84 coordinates
    
    Returns:
        List of unique MGRS tile IDs that intersect the bounding box
        
    Example:
        >>> get_intersecting_mgrs_tiles([8.5, 49.8, 8.8, 50.0])
        ['32UMA', '32UMB']
    """
    min_lon, min_lat, max_lon, max_lat = bbox
    
    # MGRS tiles are approximately 100km x 100km
    # Sample at ~10km intervals to catch all intersecting tiles
    step_deg = 0.1  # ~11km at mid-latitudes
    
    m = mgrs.MGRS()
    tiles = set()
    
    # Create grid of sample points
    lat = min_lat
    while lat <= max_lat:
        lon = min_lon
        while lon <= max_lon:
            try:
                # Convert lat/lon to MGRS (returns full precision string)
                mgrs_string = m.toMGRS(lat, lon, MGRSPrecision=0)
                # Extract 5-character tile ID (e.g., "32UMA" from "32UMA0000000000")
                tile_id = mgrs_string[:5]
                tiles.add(tile_id)
            except Exception as e:
                # Skip points that can't be converted (e.g., polar regions)
                pass
            lon += step_deg
        lat += step_deg
    
    # Also sample the corners and edges to ensure coverage
    corner_points = [
        (min_lat, min_lon),
        (min_lat, max_lon),
        (max_lat, min_lon),
        (max_lat, max_lon),
        ((min_lat + max_lat) / 2, min_lon),
        ((min_lat + max_lat) / 2, max_lon),
        (min_lat, (min_lon + max_lon) / 2),
        (max_lat, (min_lon + max_lon) / 2),
    ]
    
    for lat, lon in corner_points:
        try:
            mgrs_string = m.toMGRS(lat, lon, MGRSPrecision=0)
            tile_id = mgrs_string[:5]
            tiles.add(tile_id)
        except Exception:
            pass
    
    return sorted(list(tiles))
