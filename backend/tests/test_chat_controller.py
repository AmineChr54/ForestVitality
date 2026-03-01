import backend_app.controllers.chat_controller as chat_controller


def test_chat_endpoint_injects_permissions_and_returns_reply(auth_client, monkeypatch):
    seen = {}

    class FakeChatService:
        def chat(self, request):
            seen["message"] = request.message
            seen["permissions"] = sorted(request.permissions)
            seen["geo_context_type"] = type(request.geo_context).__name__
            seen["geo_context_bbox"] = request.geo_context.get("bbox")
            return {"reply": "Hello from fake agent"}

    monkeypatch.setattr(chat_controller, "get_chat_service", lambda: FakeChatService())

    response = auth_client.post(
        "/chat",
        json={
            "message": "Hi assistant",
            "history": [{"role": "user", "content": "hello"}],
            "geo_context": {
                "bbox": [8.6, 49.8, 8.8, 50.0],
                "center": [8.7, 49.9],
                "zoom": 11,
            },
        },
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "Hello from fake agent"}
    assert seen["message"] == "Hi assistant"
    assert "logs:read" in seen["permissions"]
    assert seen["geo_context_type"] == "dict"
    assert seen["geo_context_bbox"] == [8.6, 49.8, 8.8, 50.0]


def test_chat_endpoint_returns_user_friendly_error_message(auth_client, monkeypatch):
    class FailingChatService:
        def chat(self, request):
            raise RuntimeError("LLM backend unavailable")

    monkeypatch.setattr(chat_controller, "get_chat_service", lambda: FailingChatService())

    response = auth_client.post(
        "/chat",
        json={
            "message": "Run analysis",
            "history": [],
        },
    )

    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "Analysis Connection Error" in reply
    assert "LLM backend unavailable" in reply


def test_chat_health_endpoint_returns_status(client):
    chat_controller.chat_service = None

    response = client.get("/chat/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "chat_agent"
    assert "tools_loaded" in body
