from fastapi import FastAPI
from fastapi import Request, Body
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from pathlib import Path

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



app = FastAPI()

# Pydantic model for token generation request
class TokenRequest(BaseModel):
    username: str
    password: str

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


@app.get("/token-generator", response_class=HTMLResponse)
async def token_generator():
    """Serve the token generator HTML page"""
    try:
        html_path = Path(__file__).parent.parent / "token_generator.html"
        if html_path.exists():
            return html_path.read_text(encoding='utf-8')
        return f"<h1>Token generator not found</h1><p>Looking for: {html_path}</p>"
    except Exception as e:
        return f"<h1>Error loading token generator</h1><p>{str(e)}</p>"


@app.post("/api/generate-token")
async def generate_token(request: TokenRequest):
    """Proxy endpoint to generate Keycloak tokens"""
    _kc_url = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
    _kc_realm = os.getenv("KEYCLOAK_REALM", "geo-platform")
    _kc_client_id = os.getenv("KEYCLOAK_CLIENT_ID", "geo-platform-backend")
    _token_url = f"{_kc_url}/realms/{_kc_realm}/protocol/openid-connect/token"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                _token_url,
                data={
                    "grant_type": "password",
                    "client_id": _kc_client_id,
                    "username": request.username,
                    "password": request.password,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            
            if response.status_code != 200:
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": "Authentication failed"},
                )
            
            return response.json()
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )


@app.get("/os-health")
def os_health():
    client = get_client()
    info = client.info()
    return {"cluster_name": info["cluster_name"]}

@app.exception_handler(AuthenticationError)
async def authentication_exception_handler(
    request: Request, exc: AuthenticationError
):
    print(f"❌ AUTHENTICATION ERROR: {str(exc)}")
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