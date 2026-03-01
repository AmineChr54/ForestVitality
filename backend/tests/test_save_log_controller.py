import backend_app.controllers.save_log_controller as save_log_controller
from backend_app.security.bundles.security.domain.exceptions import AuthorizationError


class FakeIndices:
    def __init__(self):
        self.created = False

    def exists(self, index):
        return self.created

    def create(self, index):
        self.created = True
        return {"acknowledged": True, "index": index}


class FakeOpenSearchClient:
    def __init__(self):
        self.indices = FakeIndices()
        self.storage = {}

    def index(self, index, body):
        doc_id = str(len(self.storage) + 1)
        self.storage[doc_id] = body
        return {"_id": doc_id}

    def get(self, index, id, ignore=None):
        if id not in self.storage:
            return {"found": False}
        return {"found": True, "_source": self.storage[id]}


def test_save_log_creates_index_and_persists_user_metadata(auth_client, monkeypatch):
    fake_client = FakeOpenSearchClient()
    monkeypatch.setattr(save_log_controller, "get_client", lambda: fake_client)
    monkeypatch.setattr(save_log_controller.security_service, "assert_permission", lambda *_: None)

    response = auth_client.post(
        "/save-log",
        json={"message": "Analysis started", "level": "info", "timestamp": "2026-03-01T10:00:00Z"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["result"] == "saved"
    assert body["id"] == "1"

    saved = fake_client.storage["1"]
    assert saved["created_by"] == "test-user-1"
    assert saved["username"] == "testuser"


def test_get_log_returns_saved_document(auth_client, monkeypatch):
    fake_client = FakeOpenSearchClient()
    fake_client.indices.created = True
    fake_client.storage["abc"] = {
        "message": "Done",
        "level": "info",
        "created_by": "test-user-1",
        "username": "testuser",
    }

    monkeypatch.setattr(save_log_controller, "get_client", lambda: fake_client)
    monkeypatch.setattr(save_log_controller.security_service, "assert_permission", lambda *_: None)

    response = auth_client.get("/logs/abc")

    assert response.status_code == 200
    assert response.json()["message"] == "Done"


def test_get_log_returns_404_when_missing(auth_client, monkeypatch):
    fake_client = FakeOpenSearchClient()
    fake_client.indices.created = True
    monkeypatch.setattr(save_log_controller, "get_client", lambda: fake_client)
    monkeypatch.setattr(save_log_controller.security_service, "assert_permission", lambda *_: None)

    response = auth_client.get("/logs/missing")

    assert response.status_code == 404
    assert response.json()["detail"] == "Log not found"


def test_save_log_returns_403_without_permission(auth_client, monkeypatch):
    monkeypatch.setattr(
        save_log_controller.security_service,
        "assert_permission",
        lambda *_: (_ for _ in ()).throw(AuthorizationError("Forbidden")),
    )

    response = auth_client.post(
        "/save-log",
        json={"message": "Should fail", "level": "info"},
    )

    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]
