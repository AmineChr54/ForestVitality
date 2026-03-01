import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Make backend_app importable when running pytest from different working dirs
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from backend_app.main import app
from backend_app.security.bundles.security.domain.principal import Principal
from backend_app.security.http.security_dependencies import get_current_principal


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def test_principal() -> Principal:
    return Principal(
        user_id="test-user-1",
        username="testuser",
        roles={"FOREST_ANALYST"},
        permissions={"scenes:read", "regions:read", "logs:read", "logs:create"},
        metadata={"email": "test@example.com"},
    )


@pytest.fixture
def auth_client(client, test_principal):
    app.dependency_overrides[get_current_principal] = lambda: test_principal
    try:
        yield client
    finally:
        app.dependency_overrides.pop(get_current_principal, None)
