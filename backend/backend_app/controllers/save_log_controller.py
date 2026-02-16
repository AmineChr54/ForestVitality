from fastapi import APIRouter, HTTPException, Depends
from backend_app.models.log_model import LogModel
from backend_app.repositories.opensearch_repository import get_client
from backend_app.security.http.security_dependencies import get_current_principal, security_service
from backend_app.security.bundles.security.domain.principal import Principal

router = APIRouter()

@router.post("/save-log")
def save_log(
    log: LogModel,
    principal: Principal = Depends(get_current_principal),  # 🔐 authentication
):
    """
    Save analysis or operation log.
    
    Requires: logs:create permission (ADMIN, FOREST_ANALYST, DATA_MANAGER)
    """
    security_service.assert_permission(principal, "logs:create")  # 🔐 authorization
    
    client = get_client()
    index_name = "logs"

    if not client.indices.exists(index=index_name):
        client.indices.create(index=index_name)

    # Add user info to log
    log_data = log.model_dump()
    log_data["created_by"] = principal.user_id
    log_data["username"] = principal.username
    
    response = client.index(index=index_name, body=log_data)

    return {"result": "saved", "id": response["_id"]}


@router.get("/logs/{log_id}")
def get_log(
    log_id: str,
    principal: Principal = Depends(get_current_principal),  # 🔐 authentication
):
    """
    Retrieve a specific log by ID.
    
    Requires: logs:read permission (ADMIN, FOREST_ANALYST, DATA_MANAGER)
    """
    security_service.assert_permission(principal, "logs:read")  # 🔐 authorization
    
    client = get_client()
    response = client.get(index="logs", id=log_id, ignore=[404])

    if not response.get("found"):
        raise HTTPException(status_code=404, detail="Log not found")

    return response["_source"]
