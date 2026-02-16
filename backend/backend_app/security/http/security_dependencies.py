from backend_app.security.bundles.security.application.security_application_service import (
    SecurityApplicationService,
)
from backend_app.security.bundles.security.infrastructure.keycloak.keycloak_jwks_client import (
    KeycloakJwksClient,
)
from backend_app.security.bundles.security.infrastructure.keycloak.keycloak_token_validator import (
    KeycloakTokenValidator,
)
from backend_app.security.api.components.role_mapper import RoleMapper
from backend_app.security.api.components.permission_mapper import PermissionMapper
from backend_app.security.api.components.user_mapper import UserMapper
from backend_app.security.api.components.keycloak_token_mapper import KeycloakTokenMapper
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


import os

# --- CONFIG ---
_kc_url = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
_kc_realm = os.getenv("KEYCLOAK_REALM", "geo-platform")

ISSUER = os.getenv("KEYCLOAK_ISSUER", f"{_kc_url}/realms/{_kc_realm}")
CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "geo-platform-backend")
JWKS_URL = os.getenv(
    "KEYCLOAK_JWKS_URL",
    f"{_kc_url}/realms/{_kc_realm}/protocol/openid-connect/certs"
)

# --- Build security graph ONCE ---
jwks_client = KeycloakJwksClient(JWKS_URL)
token_validator = KeycloakTokenValidator(jwks_client, ISSUER, CLIENT_ID)

token_mapper = KeycloakTokenMapper(
    RoleMapper(),
    PermissionMapper(),
    UserMapper(),
)

security_service = SecurityApplicationService(
    token_validator=token_validator,
    token_mapper=token_mapper,
)

# Expose an HTTP Bearer scheme so OpenAPI/Swagger UI can use the Authorize button
bearer_scheme = HTTPBearer()


def get_current_principal(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    # HTTPBearer provides the token (without the "Bearer " prefix) in credentials.credentials
    token = credentials.credentials
    return security_service.authenticate(token)

