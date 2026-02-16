from typing import Any, Dict, List


def compute_bbox(geometry: Dict[str, Any]) -> List[float]:
    coords = geometry.get("coordinates", [])
    
    all_points = []

    def extract_points(c):
        if not c:
            return
        if isinstance(c[0], (float, int)):
            all_points.append(c)
        else:
            for child in c:
                extract_points(child)

    extract_points(coords)

    if not all_points:
        return [0.0, 0.0, 0.0, 0.0]

    lons = [pt[0] for pt in all_points]
    lats = [pt[1] for pt in all_points]

    return [min(lons), min(lats), max(lons), max(lats)]