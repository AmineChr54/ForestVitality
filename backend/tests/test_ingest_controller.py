import backend_app.controllers.ingest_controller as ingest_controller
import backend_app.security.http.security_dependencies as security_dependencies
from backend_app.security.bundles.security.domain.exceptions import AuthorizationError


INGEST_PARAMS = {
    "bbox": [8.6, 49.8, 8.8, 50.0],
    "from_date": "2025-01-01",
    "to_date": "2025-01-31",
    "resolution": 20,
}


def test_ingest_endpoint_returns_ingestion_summary(auth_client, monkeypatch):
    seen = {}

    def fake_assert_permission(principal, permission):
        seen["permission"] = permission
        seen["user"] = principal.user_id

    def fake_ingest_scenes(bbox, from_date, to_date, resolution=20):
        return {
            "status": "success",
            "scenes_processed": 3,
            "bbox": bbox,
            "from_date": from_date,
            "to_date": to_date,
            "resolution": resolution,
        }

    monkeypatch.setattr(security_dependencies.security_service, "assert_permission", fake_assert_permission)
    monkeypatch.setattr(ingest_controller, "ingest_scenes", fake_ingest_scenes)

    response = auth_client.post("/ingest/", params=INGEST_PARAMS)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["scenes_processed"] == 3
    assert body["ingested_by"] == "test-user-1"
    assert seen["permission"] == "data:ingest"


def test_ingest_endpoint_returns_403_without_permission(auth_client, monkeypatch):
    monkeypatch.setattr(
        security_dependencies.security_service,
        "assert_permission",
        lambda *_: (_ for _ in ()).throw(AuthorizationError("Forbidden")),
    )

    response = auth_client.post("/ingest/", params=INGEST_PARAMS)

    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


def test_ingest_stream_endpoint_returns_sse_response(auth_client, monkeypatch):
    monkeypatch.setattr(security_dependencies.security_service, "assert_permission", lambda *_: None)

    def fake_stream(*_args, **_kwargs):
        yield "event: start\ndata: {\"status\":\"started\"}\n\n"
        yield "event: complete\ndata: {\"status\":\"done\"}\n\n"

    monkeypatch.setattr(ingest_controller, "ingest_scenes_stream", fake_stream)

    with auth_client.stream("POST", "/ingest/stream", params=INGEST_PARAMS) as response:
        chunks = list(response.iter_text())
        joined = "".join(chunks)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "event: start" in joined
    assert "event: complete" in joined
