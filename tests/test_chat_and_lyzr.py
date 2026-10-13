import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_chat_interaction_and_ephemeral_buffer(client):
    import uuid
    user_id = f"test.chat.{uuid.uuid4().hex[:6]}@memoraguard.io"
    
    # Send message to assistant
    chat_resp = client.post(
        "/api/chat",
        headers={"X-User-Id": user_id},
        json={"message": "Remember that my favourite coffee is Ethiopian Yirgacheffe pour-over."}
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "reply" in data
    assert "candidate_memories" in data
    assert "ephemeral_notice" in data
    assert len(data["candidate_memories"]) > 0

    # Verify that sending a chat message DID NOT automatically save into Memory Vault!
    list_resp = client.get("/api/memories", headers={"X-User-Id": user_id})
    user_memories = [m for m in list_resp.json()["memories"] if m["owner_id"] == user_id]
    assert len(user_memories) == 0

    # Now simulate explicit user confirmation to save the proposed memory
    candidate = data["candidate_memories"][0]
    save_resp = client.post(
        "/api/chat/save-candidate",
        headers={"X-User-Id": user_id},
        json={
            "title": candidate["proposed_title"],
            "content": candidate["proposed_content"],
            "category": candidate["proposed_category"],
            "visibility": "private"
        }
    )
    assert save_resp.status_code == 201
    saved_data = save_resp.json()
    assert saved_data["success"] is True
    assert saved_data["memory"]["visibility"] == "private"

    # Now verify the memory is in the user's vault
    list_after = client.get("/api/memories", headers={"X-User-Id": user_id})
    user_memories_after = [m for m in list_after.json()["memories"] if m["owner_id"] == user_id]
    assert len(user_memories_after) == 1
    assert "Ethiopian Yirgacheffe" in user_memories_after[0]["content"]

def test_lyzr_connection_status(client):
    res = client.get("/api/status/lyzr")
    assert res.status_code == 200
    data = res.json()
    assert "connected" in data
    # When online, connected is True and latency_ms is recorded
    if data["connected"]:
        assert data["status"] == "online"
        assert data["http_code"] == 200
