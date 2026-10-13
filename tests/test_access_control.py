import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app
from app.database import init_db, get_connection

@pytest.fixture(scope="module", autouse=True)
def setup_test_environment():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check_endpoint(client):
    res = client.get("/api/status/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "MemoraGuard AI" in data["service"]

def test_qdrant_status_endpoint(client):
    res = client.get("/api/status/qdrant")
    assert res.status_code == 200
    data = res.json()
    assert "connected" in data
    assert "collection" in data

def test_private_memory_cannot_be_accessed_by_another_user(client):
    owner_id = "user.alpha@domain.com"
    stranger_id = "user.beta@domain.com"

    # 1. Owner creates a strictly private memory
    create_resp = client.post(
        "/api/memories",
        headers={"X-User-Id": owner_id},
        json={
            "title": "Alpha Private Diary",
            "content": "Secret cryptographic seeds and personal reflections.",
            "category": "personal",
            "visibility": "private"
        }
    )
    assert create_resp.status_code == 201
    memory = create_resp.json()["memory"]
    memory_id = memory["id"]

    # 2. Owner can read their own private memory
    owner_read = client.get(f"/api/memories/{memory_id}", headers={"X-User-Id": owner_id})
    assert owner_read.status_code == 200
    assert owner_read.json()["memory"]["id"] == memory_id

    # 3. Stranger tries to inspect the private memory -> MUST BE FORBIDDEN (403)
    stranger_read = client.get(f"/api/memories/{memory_id}", headers={"X-User-Id": stranger_id})
    assert stranger_read.status_code == 403
    assert "Access Denied" in str(stranger_read.json())

    # 4. Stranger lists memories -> MUST NOT include the private memory
    stranger_list = client.get("/api/memories", headers={"X-User-Id": stranger_id})
    assert stranger_list.status_code == 200
    mem_ids = [m["id"] for m in stranger_list.json()["memories"]]
    assert memory_id not in mem_ids

    # 5. Stranger searches memories -> MUST NOT return the private memory
    search_resp = client.get("/api/memories/search?q=cryptographic", headers={"X-User-Id": stranger_id})
    assert search_resp.status_code == 200
    search_ids = [m["id"] for m in search_resp.json()["results"]]
    assert memory_id not in search_ids

def test_selected_visibility_allows_only_explicit_users(client):
    owner_id = "patient.smith@health.io"
    authorized_doctor = "dr.chen@clinic.org"
    unauthorized_nurse = "nurse.jones@clinic.org"

    # Owner creates memory with 'selected' visibility
    create_resp = client.post(
        "/api/memories",
        headers={"X-User-Id": owner_id},
        json={
            "title": "Confidential Cardiac Report",
            "content": "Echocardiogram indicates mild sinus tachycardia.",
            "category": "medical",
            "visibility": "selected",
            "permitted_user_ids": [authorized_doctor]
        }
    )
    assert create_resp.status_code == 201
    memory_id = create_resp.json()["memory"]["id"]

    # Authorized doctor CAN read
    doc_read = client.get(f"/api/memories/{memory_id}", headers={"X-User-Id": authorized_doctor})
    assert doc_read.status_code == 200
    assert doc_read.json()["memory"]["id"] == memory_id

    # Unauthorized nurse CANNOT read (403)
    nurse_read = client.get(f"/api/memories/{memory_id}", headers={"X-User-Id": unauthorized_nurse})
    assert nurse_read.status_code == 403

def test_only_owner_can_modify_or_delete_memory(client):
    owner_id = "developer.alice@corp.com"
    collaborator_id = "developer.bob@corp.com"

    # Create shared memory
    create_resp = client.post(
        "/api/memories",
        headers={"X-User-Id": owner_id},
        json={
            "title": "API Gateway Blueprint",
            "content": "Rate limits set to 100 req/sec per token.",
            "category": "work",
            "visibility": "shared"
        }
    )
    memory_id = create_resp.json()["memory"]["id"]

    # Bob can read because it is shared
    bob_read = client.get(f"/api/memories/{memory_id}", headers={"X-User-Id": collaborator_id})
    assert bob_read.status_code == 200

    # Bob tries to UPDATE the memory -> MUST BE FORBIDDEN (403)
    bob_update = client.put(
        f"/api/memories/{memory_id}",
        headers={"X-User-Id": collaborator_id},
        json={"title": "Hacked Title"}
    )
    assert bob_update.status_code == 403

    # Bob tries to DELETE the memory -> MUST BE FORBIDDEN (403)
    bob_delete = client.delete(f"/api/memories/{memory_id}", headers={"X-User-Id": collaborator_id})
    assert bob_delete.status_code == 403

    # Owner Alice CAN delete the memory
    alice_delete = client.delete(f"/api/memories/{memory_id}", headers={"X-User-Id": owner_id})
    assert alice_delete.status_code == 200

    # Verify memory is completely gone (404)
    after_delete = client.get(f"/api/memories/{memory_id}", headers={"X-User-Id": owner_id})
    assert after_delete.status_code == 404

def test_data_export_and_purge_workflow(client):
    user_id = "transient.user@privacy.org"

    # Create two memories
    client.post(
        "/api/memories",
        headers={"X-User-Id": user_id},
        json={"title": "Note 1", "content": "Alpha item", "visibility": "private"}
    )
    client.post(
        "/api/memories",
        headers={"X-User-Id": user_id},
        json={"title": "Note 2", "content": "Beta item", "visibility": "private"}
    )

    # 1. Export as JSON
    export_resp = client.get("/api/privacy/export?format=json", headers={"X-User-Id": user_id})
    assert export_resp.status_code == 200
    export_data = export_resp.json()
    assert export_data["export_metadata"]["owner_id"] == user_id
    assert export_data["export_metadata"]["export_count"] >= 2

    # 2. Purge without correct confirmation phrase fails
    bad_purge = client.post(
        "/api/privacy/purge",
        headers={"X-User-Id": user_id},
        json={"confirmation": "please delete"}
    )
    assert bad_purge.json()["success"] is False

    # 3. Purge with exact confirmation phrase succeeds
    good_purge = client.post(
        "/api/privacy/purge",
        headers={"X-User-Id": user_id},
        json={"confirmation": "DELETE_ALL_MY_DATA"}
    )
    assert good_purge.json()["success"] is True
    assert good_purge.json()["deleted_count"] >= 2

    # 4. Verify memories count owned by user is now 0
    list_after = client.get("/api/memories", headers={"X-User-Id": user_id})
    owned_memories = [m for m in list_after.json()["memories"] if m["owner_id"] == user_id]
    assert len(owned_memories) == 0
