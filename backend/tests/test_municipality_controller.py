import backend_app.controllers.municipality_controller as municipality_controller
from backend_app.security.bundles.security.domain.exceptions import AuthorizationError


def test_lookup_returns_municipality_details(auth_client, monkeypatch):
    monkeypatch.setattr(municipality_controller.security_service, "assert_permission", lambda *_: None)
    monkeypatch.setattr(
        municipality_controller,
        "get_municipality_details",
        lambda name, _index: {"name": name, "bundesland": "Hessen"},
    )

    response = auth_client.get("/municipality/lookup", params={"name": "Darmstadt"})

    assert response.status_code == 200
    assert response.json() == {"name": "Darmstadt", "bundesland": "Hessen"}


def test_regions_search_returns_grouped_result(auth_client, monkeypatch):
    monkeypatch.setattr(municipality_controller.security_service, "assert_permission", lambda *_: None)
    monkeypatch.setattr(
        municipality_controller,
        "search_regions",
        lambda _index, search, limit: {
            "search": search,
            "limit": limit,
            "bundesland": [{"name": "Hessen"}],
            "bezirk": [],
            "kreis": [],
        },
    )

    response = auth_client.get("/municipality/regions", params={"search": "hes", "limit": 20})

    assert response.status_code == 200
    body = response.json()
    assert body["search"] == "hes"
    assert body["limit"] == 20
    assert body["bundesland"][0]["name"] == "Hessen"


def test_region_geometry_returns_404_when_not_found(auth_client, monkeypatch):
    monkeypatch.setattr(municipality_controller.security_service, "assert_permission", lambda *_: None)
    monkeypatch.setattr(municipality_controller, "get_region_geometry", lambda *_: None)

    response = auth_client.get(
        "/municipality/regions/geometry",
        params={"region_type": "bundesland", "name": "Unknown"},
    )

    assert response.status_code == 404
    assert "Region not found" in response.json()["detail"]


def test_lookup_returns_403_without_permission(auth_client, monkeypatch):
    monkeypatch.setattr(
        municipality_controller.security_service,
        "assert_permission",
        lambda *_: (_ for _ in ()).throw(AuthorizationError("Forbidden")),
    )

    response = auth_client.get("/municipality/lookup", params={"name": "Darmstadt"})

    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]
