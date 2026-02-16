# services/analysis_service.py

from backend_app.services.ingest_service import ingest_scenes
from backend_app.services.municipality_service import get_municipality_details
from backend_app.utils.geometry_utils import compute_bbox


def run_analysis(
    area: dict,
    index: str,
    from_date: str,
    to_date: str,
    municipality_index
):
    # 1. Resolve AOI
    if area["type"] == "municipality":
        municipality = get_municipality_details(
            area["name"],
            municipality_index
        )[0]
        bbox = municipality["bounding_box"]

    elif area["type"] == "polygon":
        bbox = compute_bbox(area["geometry"])

    # 2. Ingest Sentinel scenes (this already works)
    ingest_result = ingest_scenes(bbox, from_date, to_date)

    # 3. Formula calculation — TEMPORARY PLACEHOLDER
    analysis_result = {
        "status": "pending",
        "message": "Formula calculation not merged yet",
        "requested_index": index
    }
    

    return {
        "bbox": bbox,
        "ingestion": ingest_result,
        "analysis": analysis_result
    }
