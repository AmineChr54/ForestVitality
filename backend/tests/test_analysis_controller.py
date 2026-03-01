import backend_app.controllers.analysis_controller as analysis_controller
import backend_app.security.http.security_dependencies as security_dependencies
from backend_app.security.bundles.security.domain.exceptions import AuthorizationError


ANALYSIS_PAYLOAD = {
    "area": {
        "type": "polygon",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[8.6, 49.8], [8.8, 49.8], [8.8, 50.0], [8.6, 50.0], [8.6, 49.8]]],
        },
    },
    "index": "NDVI",
    "from_date": "2025-01-01",
    "to_date": "2025-01-31",
}


def test_analysis_endpoint_starts_background_job(auth_client, monkeypatch):
    seen = {}

    def fake_assert_permission(principal, permission):
        seen["permission"] = permission
        seen["user"] = principal.user_id

    monkeypatch.setattr(security_dependencies.security_service, "assert_permission", fake_assert_permission)
    monkeypatch.setattr(analysis_controller, "run_analysis", lambda *args, **kwargs: None)

    response = auth_client.post("/analysis/", json=ANALYSIS_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "started"
    assert body["user"] == "test-user-1"
    assert seen["permission"] == "analysis:run"


def test_analysis_endpoint_returns_403_without_permission(auth_client, monkeypatch):
    monkeypatch.setattr(
        security_dependencies.security_service,
        "assert_permission",
        lambda *_: (_ for _ in ()).throw(AuthorizationError("Forbidden")),
    )

    response = auth_client.post("/analysis/", json=ANALYSIS_PAYLOAD)

    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


def test_analysis_endpoint_validates_payload(auth_client, monkeypatch):
    monkeypatch.setattr(security_dependencies.security_service, "assert_permission", lambda *_: None)

    response = auth_client.post(
        "/analysis/",
        json={
            "area": {"type": "polygon"},
            "index": "INVALID_INDEX",
            "from_date": "2025-01-01",
            "to_date": "2025-01-31",
        },
    )

    assert response.status_code == 422
