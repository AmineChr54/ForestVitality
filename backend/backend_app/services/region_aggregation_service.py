"""
Region Aggregation Service
==========================
Aggregates regions by Bundesland and Bezirk with combined bounding boxes.
Provides hierarchical search across all region levels.
"""

from typing import Any, Dict, List, Optional, Tuple
from functools import lru_cache


def calculate_bbox(features: List[Dict[str, Any]]) -> Optional[Tuple[float, float, float, float]]:
    """
    Calculate combined bounding box for multiple GeoJSON features.
    Returns (min_lon, min_lat, max_lon, max_lat) or None if no valid geometries.
    """
    min_lon, min_lat = float('inf'), float('inf')
    max_lon, max_lat = float('-inf'), float('-inf')
    
    has_valid = False
    
    for feature in features:
        geometry = feature.get("geometry", {})
        geom_type = geometry.get("type", "")
        coords = geometry.get("coordinates", [])
        
        # Extract all coordinate pairs from polygon/multipolygon
        all_points = []
        if geom_type == "Polygon":
            for ring in coords:
                all_points.extend(ring)
        elif geom_type == "MultiPolygon":
            for polygon in coords:
                for ring in polygon:
                    all_points.extend(ring)
        
        for point in all_points:
            if len(point) >= 2:
                lon, lat = point[0], point[1]
                min_lon = min(min_lon, lon)
                min_lat = min(min_lat, lat)
                max_lon = max(max_lon, lon)
                max_lat = max(max_lat, lat)
                has_valid = True
    
    if not has_valid:
        return None
    
    return (min_lon, min_lat, max_lon, max_lat)


def get_feature_bbox(feature: Dict[str, Any]) -> Optional[Tuple[float, float, float, float]]:
    """Get bounding box for a single feature."""
    return calculate_bbox([feature])


def aggregate_regions(municipality_index: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggregate all regions by Bundesland and Bezirk.
    Returns structured data for the searchbox.
    """
    # Group features by Bundesland and Bezirk
    bundeslaender: Dict[str, List[Dict[str, Any]]] = {}
    bezirke: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}  # bundesland -> bezirk -> features
    
    for key, feature in municipality_index.items():
        props = feature.get("properties", {})
        bundesland = props.get("NAME_1", "")
        bezirk = props.get("NAME_2", "")
        
        if not bundesland:
            continue
            
        # Group by Bundesland
        if bundesland not in bundeslaender:
            bundeslaender[bundesland] = []
        bundeslaender[bundesland].append(feature)
        
        # Group by Bezirk within Bundesland
        if bezirk:
            if bundesland not in bezirke:
                bezirke[bundesland] = {}
            if bezirk not in bezirke[bundesland]:
                bezirke[bundesland][bezirk] = []
            bezirke[bundesland][bezirk].append(feature)
    
    # Build result structure
    result = {
        "bundeslaender": [],
        "bezirke": [],
        "kreise": []
    }
    
    # Aggregate Bundesländer
    for name, features in sorted(bundeslaender.items()):
        bbox = calculate_bbox(features)
        result["bundeslaender"].append({
            "name": name,
            "count": len(features),
            "bbox": list(bbox) if bbox else None,
            "type": "bundesland"
        })
    
    # Aggregate Bezirke
    for bundesland, bezirk_map in sorted(bezirke.items()):
        for bezirk_name, features in sorted(bezirk_map.items()):
            bbox = calculate_bbox(features)
            result["bezirke"].append({
                "name": bezirk_name,
                "bundesland": bundesland,
                "count": len(features),
                "bbox": list(bbox) if bbox else None,
                "type": "bezirk"
            })
    
    # Add individual Kreise
    for key, feature in municipality_index.items():
        props = feature.get("properties", {})
        name = props.get("NAME_3", "")
        bundesland = props.get("NAME_1", "")
        bezirk = props.get("NAME_2", "")
        kreis_type = props.get("TYPE_3", "")
        
        if name:
            bbox = get_feature_bbox(feature)
            result["kreise"].append({
                "name": name,
                "bundesland": bundesland,
                "bezirk": bezirk,
                "kreis_type": kreis_type,
                "bbox": list(bbox) if bbox else None,
                "type": "kreis"
            })
    
    # Sort kreise by name
    result["kreise"].sort(key=lambda x: x["name"])
    
    return result


def search_regions(
    municipality_index: Dict[str, Any],
    query: str,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Search regions across all levels (Bundesland, Bezirk, Kreis).
    Returns matching results grouped by type.
    """
    if not query or len(query) < 1:
        # Return all aggregated data (limited)
        aggregated = aggregate_regions(municipality_index)
        return {
            "bundeslaender": aggregated["bundeslaender"][:limit],
            "bezirke": aggregated["bezirke"][:limit],
            "kreise": aggregated["kreise"][:limit]
        }
    
    query_lower = query.lower().strip()
    aggregated = aggregate_regions(municipality_index)
    
    # Filter by search query
    result = {
        "bundeslaender": [
            b for b in aggregated["bundeslaender"]
            if query_lower in b["name"].lower()
        ][:limit],
        "bezirke": [
            b for b in aggregated["bezirke"]
            if query_lower in b["name"].lower() or query_lower in b["bundesland"].lower()
        ][:limit],
        "kreise": [
            k for k in aggregated["kreise"]
            if query_lower in k["name"].lower()
        ][:limit]
    }
    
    return result


def get_region_geometry(
    municipality_index: Dict[str, Any],
    region_type: str,
    region_name: str,
    bundesland: Optional[str] = None,
    bezirk: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Get the geometry for a specific region.
    For Bundesland/Bezirk, combines all child geometries into a FeatureCollection.
    """
    if region_type == "kreis":
        # Find single kreis
        for key, feature in municipality_index.items():
            props = feature.get("properties", {})
            if props.get("NAME_3", "").lower() == region_name.lower():
                if bundesland and props.get("NAME_1", "") != bundesland:
                    continue
                return feature.get("geometry")
        return None
    
    elif region_type == "bezirk":
        # Combine all kreise in this bezirk
        features = []
        for key, feature in municipality_index.items():
            props = feature.get("properties", {})
            if props.get("NAME_2", "").lower() == region_name.lower():
                if bundesland and props.get("NAME_1", "") != bundesland:
                    continue
                features.append(feature)
        
        if not features:
            return None
        
        # Return as GeometryCollection
        return {
            "type": "GeometryCollection",
            "geometries": [f.get("geometry") for f in features if f.get("geometry")]
        }
    
    elif region_type == "bundesland":
        # Combine all kreise in this bundesland
        features = []
        for key, feature in municipality_index.items():
            props = feature.get("properties", {})
            if props.get("NAME_1", "").lower() == region_name.lower():
                features.append(feature)
        
        if not features:
            return None
        
        # Return as GeometryCollection
        return {
            "type": "GeometryCollection",
            "geometries": [f.get("geometry") for f in features if f.get("geometry")]
        }
    
    return None
