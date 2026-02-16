"""
Band Name Cleaning Service
==========================
Utility service to normalize satellite band names for AI and User display.
Strips technical suffixes like resolution (_10m) and file extensions.

Usage:
    from backend_app.services.band_name_service import clean_band_name, get_readable_bands
    
    clean_name = clean_band_name("T32UMC_20230715_B04_10m.jp2") 
    # Returns "B04"
"""

import re

# Mapping of standard Sentinel-2 band names to descriptions
BAND_DESCRIPTIONS = {
    "B01": "Coastal Aerosol (60m)",
    "B02": "Blue (10m)",
    "B03": "Green (10m)",
    "B04": "Red (10m)",
    "B05": "Vegetation Red Edge 1 (20m)",
    "B06": "Vegetation Red Edge 2 (20m)",
    "B07": "Vegetation Red Edge 3 (20m)",
    "B08": "NIR (10m)",
    "B8A": "Narrow NIR (20m)",
    "B09": "Water Vapor (60m)",
    "B11": "SWIR 1 (20m)",
    "B12": "SWIR 2 (20m)"
}

def clean_band_name(raw_name: str) -> str:
    """
    Extract the standard band identifier (e.g., 'B04') from a filename or technical string.
    
    Examples:
    - "B04_10m.jp2" -> "B04"
    - "T32UMC_20230715_B8A.jp2" -> "B8A"
    - "B02" -> "B02"
    """
    if not raw_name:
        return "Unknown"
        
    # Pattern to find B01-B12 or B8A
    # Looks for 'B' followed by 1-2 digits or '8A'
    match = re.search(r"(B[0-9]{2}|B8A)", raw_name)
    
    if match:
        return match.group(1)
        
    return raw_name

def get_band_description(band_id: str) -> str:
    """Get the human-readable description for a band ID."""
    clean_id = clean_band_name(band_id)
    return BAND_DESCRIPTIONS.get(clean_id, "Unknown Band")

def normalize_scene_bands(bands_list: list) -> list:
    """
    Process a list of band dictionaries and add a 'clean_name' field to each.
    Useful for preprocessing scene data before sending to frontend/AI.
    """
    result = []
    for band in bands_list:
        new_band = band.copy()
        clean_name = clean_band_name(band.get("name", ""))
        new_band["clean_name"] = clean_name
        new_band["description"] = get_band_description(clean_name)
        result.append(new_band)
    return result
