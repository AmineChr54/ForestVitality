from typing import Dict, Any, Tuple, List
from fastapi import HTTPException

from backend_app.utils.geometry_utils import compute_bbox

def search_municipalities(name: str, municipality_index: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Search for municipalities by name in the provided index.
    Returns a list of tuples containing (real name, geometry).
    """
    search_key = name.lower().strip()
    matches = []

    # 1. Exact match
    if search_key in municipality_index:
        feature = municipality_index[search_key]
        props = feature.get("properties", {})
        real_name = props.get("NAME_3")
        geometry = feature.get("geometry", {})
        return [(real_name, geometry)]

    # 2. Partial match (starts with)
    for key, val in municipality_index.items():
        if key.startswith(search_key):
            props = val.get("properties", {})
            real_name = props.get("NAME_3")
            geometry = val.get("geometry", {})
            matches.append((real_name, geometry))

    if not matches:
        raise HTTPException(status_code=404, detail=f"Municipality '{name}' not found.")

    return matches

def get_municipality_details(name: str, municipality_index: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Search for municipalities by name and return a list of matches with polygon and bounding box.
    """
    # Search using the service
    found_municipalities = search_municipalities(name, municipality_index)
    
    results = []
    for real_name, geometry in found_municipalities:
        # Compute bbox using the service
        bbox = compute_bbox(geometry)
        results.append({
            "municipality_name": real_name,
            "polygon": geometry,
            "bounding_box": bbox
        })

    return results