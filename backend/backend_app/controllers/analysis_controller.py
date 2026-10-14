from fastapi import APIRouter, Depends, BackgroundTasks
from backend_app.services.analysis_service import run_analysis
from backend_app.repositories.municipality_repository import get_municipality_index
from backend_app.models.analysis_models import AnalysisRequest
from backend_app.security.http.security_dependencies import get_current_principal
from backend_app.security.bundles.security.domain.principal import Principal

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/")
def analyze(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    municipality_index = Depends(get_municipality_index),
    principal: Principal = Depends(get_current_principal),  # 🔐 authentication
):
    """
    High-level analysis endpoint.
    Starts analysis in the background and returns immediately.
    
    Requires: analysis:run permission (ADMIN, FOREST_ANALYST)
    """
    from backend_app.security.http.security_dependencies import security_service
    security_service.assert_permission(principal, "analysis:run")  # 🔐 authorization

    background_tasks.add_task(
        run_analysis,
        request.area.model_dump(),
        request.index,
        str(request.from_date),
        str(request.to_date),
        municipality_index
    )

    return {
        "status": "started",
        "message": "Analysis started. Processing in background.",
        "user": principal.user_id,
    }

