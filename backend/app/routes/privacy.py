import io
import csv
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field

from ..database import (
    get_user_privacy_policy,
    update_user_privacy_policy,
    list_all_raw_memories,
    purge_user_memories,
    get_user_audit_logs,
    log_audit
)
from ..vector_db import vector_service
from ..security import get_current_user_id
from ..config import settings

router = APIRouter(prefix="/api/privacy", tags=["privacy"])

class UpdatePrivacyPolicyRequest(BaseModel):
    default_visibility: str = Field(default="private")
    allowed_collaborators: List[str] = Field(default_factory=list)

class PurgeConfirmationRequest(BaseModel):
    confirmation: str = Field(..., description="Must explicitly be 'DELETE_ALL_MY_DATA'")

@router.get("/policy")
def get_privacy_policy(caller_id: str = Depends(get_current_user_id)):
    """Retrieve user's default memory visibility and trusted collaborator list."""
    policy = get_user_privacy_policy(caller_id)
    return {
        "policy": policy,
        "caller_id": caller_id
    }

@router.put("/policy")
def set_privacy_policy(
    req: UpdatePrivacyPolicyRequest,
    caller_id: str = Depends(get_current_user_id)
):
    """Update user privacy defaults (Private is always the recommended default)."""
    clean_vis = req.default_visibility.lower()
    if clean_vis not in {"private", "selected", "shared"}:
        clean_vis = "private"

    policy = update_user_privacy_policy(caller_id, clean_vis, req.allowed_collaborators)
    return {
        "success": True,
        "policy": policy,
        "message": f"Default visibility updated to '{clean_vis}'."
    }

@router.get("/export")
def export_user_data(
    format: str = Query("json", pattern="^(json|csv)$"),
    caller_id: str = Depends(get_current_user_id)
):
    """
    Export all memories owned by the user.
    Supports complete JSON archive or tabular CSV format.
    """
    user_memories = [m for m in list_all_raw_memories() if m["owner_id"] == caller_id]
    log_audit(caller_id, "EXPORT_USER_DATA", details=f"Exported {len(user_memories)} memories in {format.upper()}")

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id", "owner_id", "title", "content", "summary", "category",
            "visibility", "permitted_user_ids", "tags", "source", "created_at", "updated_at"
        ])
        for m in user_memories:
            writer.writerow([
                m["id"],
                m["owner_id"],
                m["title"],
                m["content"],
                m["summary"],
                m["category"],
                m["visibility"],
                ",".join(m.get("permitted_user_ids", [])),
                ",".join(m.get("tags", [])),
                m.get("source", "chat"),
                m["created_at"],
                m["updated_at"]
            ])
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=memoraguard_export_{caller_id}.csv"}
        )

    # JSON export
    export_payload = {
        "export_metadata": {
            "application": "MemoraGuard AI",
            "tagline": "Your Memory. Your Control.",
            "owner_id": caller_id,
            "export_count": len(user_memories),
            "storage_mode": settings.qdrant_mode
        },
        "privacy_policy": get_user_privacy_policy(caller_id),
        "memories": user_memories
    }
    return Response(
        content=json.dumps(export_payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=memoraguard_export_{caller_id}.json"}
    )

@router.post("/purge")
def purge_all_user_data(
    req: PurgeConfirmationRequest,
    caller_id: str = Depends(get_current_user_id)
):
    """
    Account-level purge: Permanently wipes all memories owned by the caller
    from SQLite database and purges corresponding vector points from Qdrant.
    Requires explicit string confirmation 'DELETE_ALL_MY_DATA'.
    """
    if req.confirmation.strip() != "DELETE_ALL_MY_DATA":
        return {
            "success": False,
            "error": "Confirmation phrase mismatch",
            "message": "To purge all data, you must provide 'DELETE_ALL_MY_DATA'."
        }

    # 1. Purge from Qdrant vector index
    vector_service.purge_by_owner(caller_id)

    # 2. Purge from SQLite source-of-truth
    deleted_count = purge_user_memories(caller_id)

    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Successfully wiped all {deleted_count} memories from local vault and vector storage."
    }

@router.get("/audit-logs")
def view_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    caller_id: str = Depends(get_current_user_id)
):
    """Transparent audit log showing security and access events for the user."""
    logs = get_user_audit_logs(caller_id, limit)
    return {
        "caller_id": caller_id,
        "count": len(logs),
        "audit_logs": logs
    }

@router.get("/disclosure")
def privacy_disclosure_report():
    """
    Full transparency disclosure of storage, models, embeddings, and third-party data routing.
    """
    return {
        "principles": [
            "Your Memory. Your Control.",
            "Zero automatic saving: all memories require explicit user confirmation.",
            "Strict authorization checks on every read, write, search, and export."
        ],
        "storage_mode": {
            "current_mode": settings.qdrant_mode,
            "sqlite_source_of_truth": "Local on-disk file (memoraguard.db)",
            "vector_database": "Local embedded Qdrant" if settings.qdrant_mode == "local" else "Hosted Qdrant cluster",
            "raw_text_location": "Local SQLite database only; vectors with access metadata in Qdrant"
        },
        "embeddings": {
            "engine": "Deterministic Local Semantic Generator (384 dimensions, Cosine distance)",
            "telemetry": "None: 100% processed on-device; embeddings are never sent to external servers."
        },
        "ai_processing": {
            "provider": "Lyzr Agent Studio (v3 inference)",
            "disclosure": (
                "When chatting with the AI assistant, messages are transmitted to Lyzr Agent Studio "
                f"(Agent ID: {settings.lyzr_agent_id}) for response generation. "
                "However, messages are ephemeral and NOT saved to persistent storage unless you click 'Save Memory'."
            ),
            "hosted_limits": (
                "Hosted AI models can process external dialogue. If operating in maximum air-gapped environments, "
                "local demo mode or local LLM adapters should be used."
            )
        },
        "wearable_integration": {
            "omi_status": "Optional sync hook configured; wearable hardware is NOT required."
        }
    }
