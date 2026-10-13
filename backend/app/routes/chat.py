from typing import Optional, List
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from ..lyzr_client import lyzr_client
from ..database import create_memory, log_audit, update_memory
from ..vector_db import vector_service
from ..embeddings import embedding_service
from ..security import get_current_user_id

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None

class SaveMemoryFromChatRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    summary: Optional[str] = None
    category: str = Field(default="general")
    visibility: str = Field(default="private")
    permitted_user_ids: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

@router.post("")
def chat_with_assistant(
    req: ChatMessageRequest,
    caller_id: str = Depends(get_current_user_id)
):
    """
    Interact with MemoraGuard AI assistant.
    - Proxies message to Lyzr Agent Studio.
    - Identifies candidate memory facts in the dialogue.
    - CRITICAL: Messages remain ephemeral in memory buffer.
      Nothing is persisted to vault until the user explicitly triggers save and confirms!
    """
    chat_result = lyzr_client.chat(
        user_id=caller_id,
        message=req.message,
        session_id=req.session_id
    )

    log_audit(caller_id, "CHAT_INTERACTION", details=f"Mode: {chat_result.get('mode')}")

    return {
        "reply": chat_result.get("reply"),
        "mode": chat_result.get("mode"),
        "session_id": chat_result.get("session_id"),
        "candidate_memories": chat_result.get("candidate_memories", []),
        "ephemeral_notice": "This message is temporary and NOT stored in your Memory Vault until explicitly saved.",
        "caller_id": caller_id
    }

@router.post("/save-candidate", status_code=status.HTTP_201_CREATED)
def save_chat_memory_explicitly(
    req: SaveMemoryFromChatRequest,
    caller_id: str = Depends(get_current_user_id)
):
    """
    Explicit confirmation action: commits an approved memory item from the chat
    into the persistent database and Qdrant vector index.
    """
    allowed_vis = {"private", "selected", "shared"}
    clean_visibility = req.visibility.lower() if req.visibility.lower() in allowed_vis else "private"

    full_text = f"{req.title}. {req.content}"
    vector = embedding_service.embed_text(full_text)

    memory_dict = {
        "owner_id": caller_id,
        "title": req.title.strip(),
        "content": req.content.strip(),
        "summary": req.summary.strip() if req.summary else req.content[:150],
        "category": req.category.lower().strip() or "general",
        "visibility": clean_visibility,
        "permitted_user_ids": req.permitted_user_ids if clean_visibility == "selected" else [],
        "tags": req.tags,
        "source": "chat",
        "vector_synced": False
    }

    created = create_memory(memory_dict)
    qdrant_synced = vector_service.upsert_memory(created, vector)
    if qdrant_synced:
        created = update_memory(created["id"], {"vector_synced": True}, caller_id)

    log_audit(caller_id, "EXPLICIT_CHAT_MEMORY_SAVE", created["id"], f"Visibility: {clean_visibility}")

    return {
        "success": True,
        "memory": created,
        "qdrant_synced": qdrant_synced,
        "message": "Memory explicitly confirmed and saved to your secure vault."
    }
