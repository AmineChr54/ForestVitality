import backend_app.controllers.sentinel_controller as sentinel_controller
from backend_app.security.bundles.security.domain.exceptions import AuthorizationError


def test_fetch_sentinel_data_happy_path(auth_client, monkeypatch):
    class FakeCopernicusClient:
        def search_scenes(self, bbox, date_from, date_to):
            return {
                "type": "FeatureCollection",
                "features": [{"id": "scene-1"}],
                "bbox": bbox,
                "date_from": date_from,
                "date_to": date_to,
            }

    seen = {}

    def fake_assert_permission(principal, permission):
        seen["permission"] = permission
        seen["principal"] = principal.username

    monkeypatch.setattr(sentinel_controller, "CopernicusAPIClient", FakeCopernicusClient)
    monkeypatch.setattr(sentinel_controller.security_service, "assert_permission", fake_assert_permission)

    response = auth_client.get(
        "/sentinel/fetch",
        params={
            "bbox": [8.6, 49.8, 8.8, 50.0],
            "date_from": "2025-01-01",
            "date_to": "2025-01-31",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) == 1
    assert seen["permission"] == "scenes:read"
    assert seen["principal"] == "testuser"


def test_fetch_sentinel_data_returns_error_when_no_result(auth_client, monkeypatch):
    class FakeCopernicusClient:
        def search_scenes(self, bbox, date_from, date_to):
            return None

    monkeypatch.setattr(sentinel_controller, "CopernicusAPIClient", FakeCopernicusClient)
    monkeypatch.setattr(sentinel_controller.security_service, "assert_permission", lambda *_: None)

    response = auth_client.get(
        "/sentinel/fetch",
        params={
            "bbox": [8.6, 49.8, 8.8, 50.0],
            "date_from": "2025-01-01",
            "date_to": "2025-01-31",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"error": "No data returned from Copernicus Dataspace"}


def test_fetch_sentinel_data_returns_403_without_permission(auth_client, monkeypatch):
    monkeypatch.setattr(
        sentinel_controller.security_service,
        "assert_permission",
        lambda *_: (_ for _ in ()).throw(AuthorizationError("Forbidden")),
    )

    response = auth_client.get(
        "/sentinel/fetch",
        params={
            "bbox": [8.6, 49.8, 8.8, 50.0],
            "date_from": "2025-01-01",
            "date_to": "2025-01-31",
        },
    )

    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]
