from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Dict, Any, Optional

from backend_app.services.municipality_service import get_municipality_details
from backend_app.services.region_aggregation_service import search_regions, get_region_geometry
from backend_app.repositories.municipality_repository import get_municipality_index

from backend_app.security.http.security_dependencies import get_current_principal, security_service
from backend_app.security.bundles.security.domain.principal import Principal

router = APIRouter(prefix="/municipality", tags=["municipality"])


@router.get("/lookup")
def find_municipality(
    name: str = Query(..., description="Name of the municipality to search for"),
    municipality_index: Dict[str, Any] = Depends(get_municipality_index),
    principal: Principal = Depends(get_current_principal),  # 🔐 authentication
):
    """
    Find municipality by name.
    
    Requires: regions:read permission (All authenticated users)
    """
    security_service.assert_permission(principal, "regions:read")  # 🔐 authorization

    return get_municipality_details(name, municipality_index)


# ===========================================================================
# PUBLIC ENDPOINTS (no authentication required)
# These serve static geographic data for region selection
# ===========================================================================

@router.get("/regions")
def list_regions(
    search: Optional[str] = Query(None, description="Search query for filtering regions"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results per category"),
    municipality_index: Dict[str, Any] = Depends(get_municipality_index),
    principal: Principal = Depends(get_current_principal),
):
    """
    List and search regions hierarchically (Bundesland, Bezirk, Kreis).
    
    Returns regions grouped by type with aggregated bounding boxes.
    
    Requires: regions:read permission (All authenticated users)
    """
    security_service.assert_permission(principal, "regions:read")
    return search_regions(municipality_index, search or "", limit)


@router.get("/regions/geometry")
def get_geometry(
    region_type: str = Query(..., description="Type: bundesland, bezirk, or kreis"),
    name: str = Query(..., description="Name of the region"),
    bundesland: Optional[str] = Query(None, description="Parent Bundesland (for disambiguation)"),
    bezirk: Optional[str] = Query(None, description="Parent Bezirk (for disambiguation)"),
    municipality_index: Dict[str, Any] = Depends(get_municipality_index),
    principal: Principal = Depends(get_current_principal),
):
    """
    Get the geometry (polygon) for a specific region.
    
    For Bundesland/Bezirk, returns a GeometryCollection of all child regions.
    
    Requires: regions:read permission (All authenticated users)
    """
    security_service.assert_permission(principal, "regions:read")
    geometry = get_region_geometry(
        municipality_index, 
        region_type.lower(), 
        name,
        bundesland,
        bezirk
    )
    
    if not geometry:
        raise HTTPException(status_code=404, detail=f"Region not found: {name}")
    
    return {"geometry": geometry}
