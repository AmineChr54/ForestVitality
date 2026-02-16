from fastapi import APIRouter, Query, Depends
from backend_app.services.copernicus_api import CopernicusAPIClient
from backend_app.security.http.security_dependencies import get_current_principal, security_service
from backend_app.security.bundles.security.domain.principal import Principal

router = APIRouter(prefix="/sentinel", tags=["Sentinel"])

@router.get("/fetch")
def fetch_sentinel_data(
    bbox: list[float] = Query(...),
    date_from: str = Query(...),
    date_to: str = Query(...),
    principal: Principal = Depends(get_current_principal),  # 🔐 authentication
):
    """
    Fetch Sentinel-2 satellite data from Copernicus Dataspace.
    
    Requires: scenes:read permission (ADMIN, DATA_MANAGER, FOREST_ANALYST)
    """
    security_service.assert_permission(principal, "scenes:read")  # 🔐 authorization
    
    client = CopernicusAPIClient()
    result = client.search_scenes(bbox, date_from, date_to)

    if not result:
        return {"error": "No data returned from Copernicus Dataspace"}

    return result
