from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..database import (
    create_memory,
    get_memory,
    update_memory,
    delete_memory,
    list_all_raw_memories,
    log_audit
)
from ..vector_db import vector_service
from ..embeddings import embedding_service
from ..security import (
    get_current_user_id,
    verify_memory_read_access,
    enforce_read_access,
    enforce_write_access
)

router = APIRouter(prefix="/api/memories", tags=["memories"])

class MemoryCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    summary: Optional[str] = None
    category: str = Field(default="general")
    visibility: str = Field(default="private")  # 'private', 'selected', 'shared'
    permitted_user_ids: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    source: str = Field(default="manual")

class MemoryUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[str] = None
    permitted_user_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None

@router.get("")
def list_memories(
    category: Optional[str] = Query(None, description="Filter by category"),
    visibility: Optional[str] = Query(None, description="Filter by visibility level"),
    caller_id: str = Depends(get_current_user_id)
):
    """
    List memories accessible to the caller.
    Enforces backend authorization: returns memories owned by caller OR
    shared with caller. Never leaks private memories of other users.
    """
    all_records = list_all_raw_memories()
    accessible = []

    for mem in all_records:
        if not verify_memory_read_access(mem, caller_id):
            continue

        if category and category.lower() != "all" and mem.get("category") != category:
            continue

        if visibility and visibility.lower() != "all" and mem.get("visibility") != visibility:
            continue

        accessible.append(mem)

    log_audit(caller_id, "LIST_MEMORIES", details=f"Returned {len(accessible)} items")
    return {
        "memories": accessible,
        "total": len(accessible),
        "caller_id": caller_id
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_new_memory(
    req: MemoryCreateRequest,
    caller_id: str = Depends(get_current_user_id)
):
    """
    Save memory explicitly to persistent database and synchronize embedding to Qdrant.
    Private by default unless user explicitly chose selected/shared.
    """
    # Sanitize visibility
    allowed_vis = {"private", "selected", "shared"}
    clean_visibility = req.visibility.lower() if req.visibility.lower() in allowed_vis else "private"

    # Compute deterministic local embedding
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
        "source": req.source,
        "vector_synced": False
    }

    # 1. Save to SQLite Source-of-Truth
    created = create_memory(memory_dict)

    # 2. Synchronize to Qdrant Vector DB
    qdrant_synced = vector_service.upsert_memory(created, vector)
    if qdrant_synced:
        created = update_memory(created["id"], {"vector_synced": True}, caller_id)

    return {
        "success": True,
        "memory": created,
        "qdrant_synced": qdrant_synced,
        "message": "Memory securely stored with granular access control."
    }

@router.get("/search")
def search_memories(
    q: str = Query(..., min_length=1, description="Semantic and text search query"),
    category: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=50),
    caller_id: str = Depends(get_current_user_id)
):
    """
    Semantic vector search via Qdrant combined with SQLite source-of-truth.
    Enforces authorization checks on every match.
    """
    query_vector = embedding_service.embed_text(q)
    
    # 1. Vector similarity search through Qdrant with authorization filtering
    vector_results = vector_service.search_memories(
        query_vector=query_vector,
        caller_id=caller_id,
        limit=limit,
        category=category
    )
    vector_id_scores = {hit["id"]: hit.get("score", 0.0) for hit in vector_results}

    # 2. Retrieve source-of-truth records from database and verify access
    results = []
    seen_ids = set()

    for mem_id, score in vector_id_scores.items():
        mem = get_memory(mem_id)
        if mem and verify_memory_read_access(mem, caller_id):
            mem_copy = dict(mem)
            mem_copy["similarity_score"] = score
            results.append(mem_copy)
            seen_ids.add(mem_id)

    # 3. Also include keyword matches from caller's accessible memories
    all_accessible = [
        m for m in list_all_raw_memories()
        if verify_memory_read_access(m, caller_id) and m["id"] not in seen_ids
    ]
    query_lower = q.lower()
    for mem in all_accessible:
        if (
            query_lower in mem["title"].lower()
            or query_lower in mem["content"].lower()
            or any(query_lower in t.lower() for t in mem.get("tags", []))
        ):
            if category and category.lower() != "all" and mem.get("category") != category:
                continue
            mem_copy = dict(mem)
            mem_copy["similarity_score"] = 0.5  # Base lexical match score
            results.append(mem_copy)
            seen_ids.add(mem["id"])

    # Sort results by similarity score descending
    results.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)
    capped_results = results[:limit]

    log_audit(caller_id, "SEARCH_MEMORIES", details=f"Query: '{q[:30]}...', Found: {len(capped_results)}")

    return {
        "query": q,
        "caller_id": caller_id,
        "total": len(capped_results),
        "results": capped_results
    }

@router.get("/categories/stats")
def get_category_stats(caller_id: str = Depends(get_current_user_id)):
    """Aggregate memory statistics by category for the authenticated caller."""
    memories = [m for m in list_all_raw_memories() if verify_memory_read_access(m, caller_id)]
    categories = {}
    visibility_counts = {"private": 0, "selected": 0, "shared": 0}

    for m in memories:
        cat = m.get("category") or "general"
        categories[cat] = categories.get(cat, 0) + 1
        vis = m.get("visibility") or "private"
        visibility_counts[vis] = visibility_counts.get(vis, 0) + 1

    return {
        "total_memories": len(memories),
        "categories": categories,
        "visibility": visibility_counts,
        "caller_id": caller_id
    }

@router.get("/{memory_id}")
def inspect_memory(
    memory_id: str,
    caller_id: str = Depends(get_current_user_id)
):
    """Inspect original raw text and vector status of a selected memory with authorization check."""
    mem = get_memory(memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    enforce_read_access(mem, caller_id)
    log_audit(caller_id, "READ_MEMORY_DETAILS", memory_id)
    return {
        "memory": mem,
        "caller_id": caller_id,
        "is_owner": mem["owner_id"] == caller_id
    }

@router.put("/{memory_id}")
def update_existing_memory(
    memory_id: str,
    req: MemoryUpdateRequest,
    caller_id: str = Depends(get_current_user_id)
):
    """Edit memory content, category, or visibility scope. Only the owner is permitted."""
    mem = get_memory(memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    enforce_write_access(mem, caller_id)

    updates = {}
    if req.title is not None:
        updates["title"] = req.title.strip()
    if req.content is not None:
        updates["content"] = req.content.strip()
    if req.summary is not None:
        updates["summary"] = req.summary.strip()
    if req.category is not None:
        updates["category"] = req.category.lower().strip()
    if req.visibility is not None:
        clean_vis = req.visibility.lower()
        if clean_vis in {"private", "selected", "shared"}:
            updates["visibility"] = clean_vis
    if req.permitted_user_ids is not None:
        updates["permitted_user_ids"] = req.permitted_user_ids
    if req.tags is not None:
        updates["tags"] = req.tags

    updated = update_memory(memory_id, updates, caller_id)

    # Re-embed if text changed
    if "title" in updates or "content" in updates or "visibility" in updates or "permitted_user_ids" in updates:
        full_text = f"{updated['title']}. {updated['content']}"
        new_vec = embedding_service.embed_text(full_text)
        vector_service.upsert_memory(updated, new_vec)

    return {
        "success": True,
        "memory": updated,
        "message": "Memory updated successfully."
    }

@router.delete("/{memory_id}")
def delete_existing_memory(
    memory_id: str,
    caller_id: str = Depends(get_current_user_id)
):
    """
    Permanently delete memory from both SQLite and Qdrant vector index.
    Only the owner is authorized to delete.
    """
    mem = get_memory(memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    enforce_write_access(mem, caller_id)

    # 1. Remove vector from Qdrant
    qdrant_deleted = vector_service.delete_memory(memory_id)

    # 2. Remove record from SQLite source-of-truth
    db_deleted = delete_memory(memory_id, caller_id)

    return {
        "success": db_deleted,
        "memory_id": memory_id,
        "qdrant_vector_removed": qdrant_deleted,
        "message": "Memory permanently deleted from vault and vector index."
    }
