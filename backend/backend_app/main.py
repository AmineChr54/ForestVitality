import logging
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend_app.controllers.ingest_controller import router as ingest_router
from backend_app.controllers.save_log_controller import router as save_log_router
from backend_app.controllers.sentinel_controller import router as sentinel_router
from backend_app.controllers.municipality_controller import router as municipality_router
from backend_app.controllers.analysis_controller import router as analysis_router
from backend_app.controllers.chat_controller import router as chat_router
from backend_app.repositories.opensearch_repository import get_client
from backend_app.security.bundles.security.domain.exceptions import (
    AuthenticationError,
    AuthorizationError,
)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Forest Vitality API",
    description="Satellite-based forest health monitoring (Sentinel-2 vegetation indices).",
)

# Configure CORS
_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8000,http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routers
app.include_router(ingest_router)
app.include_router(save_log_router)
app.include_router(sentinel_router)
app.include_router(municipality_router)
app.include_router(analysis_router)
app.include_router(chat_router)



@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/os-health")
def os_health():
    client = get_client()
    info = client.info()
    return {"cluster_name": info["cluster_name"]}

@app.exception_handler(AuthenticationError)
async def authentication_exception_handler(
    request: Request, exc: AuthenticationError
):
    logger.warning("Authentication error: %s", exc)
    return JSONResponse(
        status_code=401,
        content={"detail": str(exc)},
    )

@app.exception_handler(AuthorizationError)
async def authorization_exception_handler(
    request: Request, exc: AuthorizationError
):
    return JSONResponse(
        status_code=403,
        content={"detail": str(exc)},
    )