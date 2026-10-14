import logging
import json
from typing import Any, Dict
from pathlib import Path
from functools import lru_cache

logger = logging.getLogger(__name__)

# Define paths
BASE_DIR = Path(__file__).resolve().parent.parent
GEOJSON_PATH = BASE_DIR / "data" / "german_municipalities.geo.json"

@lru_cache(maxsize=1)
def get_municipality_index() -> Dict[str, Any]:
    """
    Loads the GeoJSON file into an in-memory dictionary for O(1) lookups.
    Cached via lru_cache so it's only loaded once.
    """
    municipality_index = {}

    try:
        logger.info(f"Loading municipality data from {GEOJSON_PATH}...")
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        count = 0
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            # Attempt to find the name property (case-insensitive match could be added if needed)
            # Common keys: "name", "NAME", "NAME_3" (from GADM), "gen" (from VG250)
            name = props.get("name") or props.get("NAME") or props.get("NAME_3") or props.get("gen")
            
            if name:
                # Store in index with lowercase key for case-insensitive search
                municipality_index[name.lower().strip()] = feature
                count += 1
        
        logger.info(f"Successfully loaded {count} municipalities into memory.")
        
    except Exception as e:
        logger.error(f"Error loading municipality data: {e}")
        
    return municipality_index