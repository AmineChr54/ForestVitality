import backend_app.main as main_module


def test_health_endpoint_is_public(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_os_health_returns_cluster_name(client, monkeypatch):
    class FakeOpenSearchClient:
        def info(self):
            return {"cluster_name": "forest-vitality-test"}

    monkeypatch.setattr(main_module, "get_client", lambda: FakeOpenSearchClient())

    response = client.get("/os-health")

    assert response.status_code == 200
    assert response.json() == {"cluster_name": "forest-vitality-test"}


def test_protected_endpoint_rejects_unauthenticated_requests(client):
    response = client.get(
        "/sentinel/fetch",
        params={
            "bbox": [8.6, 49.8, 8.8, 50.0],
            "date_from": "2025-01-01",
            "date_to": "2025-01-31",
        },
    )

    assert response.status_code in (401, 403)
