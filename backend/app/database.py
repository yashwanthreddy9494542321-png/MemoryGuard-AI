import sqlite3
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
from .config import settings

DB_PATH = settings.data_dir / "memoraguard.db"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize SQLite tables for persistent memory storage, audit trails, and policies."""
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Primary memory source-of-truth table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                summary TEXT,
                category TEXT DEFAULT 'general',
                visibility TEXT DEFAULT 'private',
                permitted_user_ids TEXT DEFAULT '[]',
                tags TEXT DEFAULT '[]',
                source TEXT DEFAULT 'chat',
                vector_synced INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Audit log table for transparent privacy tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                action TEXT NOT NULL,
                resource_id TEXT,
                details TEXT,
                success INTEGER DEFAULT 1
            )
        """)
        
        # User privacy preferences and policies
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_privacy_policies (
                user_id TEXT PRIMARY KEY,
                default_visibility TEXT DEFAULT 'private',
                allowed_collaborators TEXT DEFAULT '[]',
                auto_expire_days INTEGER DEFAULT 0,
                updated_at TEXT NOT NULL
            )
        """)

        # Indices for efficient retrieval & authorization filters
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_owner ON memories(owner_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_visibility ON memories(visibility)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id)")
        conn.commit()

def log_audit(actor_id: str, action: str, resource_id: Optional[str] = None, details: str = "", success: bool = True):
    """Record an audit trail event without exposing raw memory content unnecessarily."""
    try:
        now = datetime.now(timezone.utc).isoformat()
        log_id = str(uuid.uuid4())
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO audit_logs (id, timestamp, actor_id, action, resource_id, details, success)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (log_id, now, actor_id, action, resource_id, details, 1 if success else 0)
            )
            conn.commit()
    except Exception as e:
        print(f"[Audit Log Error] Failed to log {action}: {e}")

def create_memory(data: Dict[str, Any]) -> Dict[str, Any]:
    memory_id = data.get("id") or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    permitted_users = data.get("permitted_user_ids", [])
    if isinstance(permitted_users, list):
        permitted_json = json.dumps(permitted_users)
    else:
        permitted_json = "[]"

    tags = data.get("tags", [])
    if isinstance(tags, list):
        tags_json = json.dumps(tags)
    else:
        tags_json = "[]"

    row = (
        memory_id,
        data["owner_id"],
        data.get("title") or "Untitled Memory",
        data["content"],
        data.get("summary") or data["content"][:120],
        data.get("category", "general"),
        data.get("visibility", "private"),
        permitted_json,
        tags_json,
        data.get("source", "chat"),
        1 if data.get("vector_synced", False) else 0,
        now,
        now
    )
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO memories (
                id, owner_id, title, content, summary, category, visibility,
                permitted_user_ids, tags, source, vector_synced, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, row)
        conn.commit()
    
    log_audit(data["owner_id"], "CREATE_MEMORY", memory_id, f"Category: {data.get('category')}, Visibility: {data.get('visibility')}")
    return get_memory(memory_id)

def get_memory(memory_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return _row_to_dict(row)

def update_memory(memory_id: str, updates: Dict[str, Any], actor_id: str) -> Optional[Dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    fields = []
    values = []

    if "title" in updates:
        fields.append("title = ?")
        values.append(updates["title"])
    if "content" in updates:
        fields.append("content = ?")
        values.append(updates["content"])
    if "summary" in updates:
        fields.append("summary = ?")
        values.append(updates["summary"])
    if "category" in updates:
        fields.append("category = ?")
        values.append(updates["category"])
    if "visibility" in updates:
        fields.append("visibility = ?")
        values.append(updates["visibility"])
    if "permitted_user_ids" in updates:
        fields.append("permitted_user_ids = ?")
        values.append(json.dumps(updates["permitted_user_ids"]))
    if "tags" in updates:
        fields.append("tags = ?")
        values.append(json.dumps(updates["tags"]))
    if "vector_synced" in updates:
        fields.append("vector_synced = ?")
        values.append(1 if updates["vector_synced"] else 0)

    if not fields:
        return get_memory(memory_id)

    fields.append("updated_at = ?")
    values.append(now)
    values.append(memory_id)

    with get_connection() as conn:
        conn.execute(f"UPDATE memories SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()

    log_audit(actor_id, "UPDATE_MEMORY", memory_id, f"Fields updated: {list(updates.keys())}")
    return get_memory(memory_id)

def delete_memory(memory_id: str, actor_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
    if deleted:
        log_audit(actor_id, "DELETE_MEMORY", memory_id, "Memory permanently removed from database")
    return deleted

def list_all_raw_memories() -> List[Dict[str, Any]]:
    """Helper for testing and migrations."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM memories ORDER BY created_at DESC")
        return [_row_to_dict(r) for r in cursor.fetchall()]

def purge_user_memories(user_id: str) -> int:
    """Account-level purge: delete all memories owned by the user."""
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM memories WHERE owner_id = ?", (user_id,))
        count = cursor.rowcount
        conn.commit()
    log_audit(user_id, "PURGE_ACCOUNT_DATA", None, f"Deleted {count} memories")
    return count

def get_user_audit_logs(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM audit_logs WHERE actor_id = ? ORDER BY timestamp DESC LIMIT ?",
            (user_id, limit)
        )
        return [dict(r) for r in cursor.fetchall()]

def get_user_privacy_policy(user_id: str) -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_privacy_policies WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            d = dict(row)
            d["allowed_collaborators"] = json.loads(d.get("allowed_collaborators") or "[]")
            return d
        
        # Create default policy
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO user_privacy_policies (user_id, default_visibility, allowed_collaborators, auto_expire_days, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, "private", "[]", 0, now)
        )
        conn.commit()
        return {
            "user_id": user_id,
            "default_visibility": "private",
            "allowed_collaborators": [],
            "auto_expire_days": 0,
            "updated_at": now
        }

def update_user_privacy_policy(user_id: str, default_visibility: str, allowed_collaborators: List[str]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO user_privacy_policies (user_id, default_visibility, allowed_collaborators, auto_expire_days, updated_at)
            VALUES (?, ?, ?, 0, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                default_visibility = excluded.default_visibility,
                allowed_collaborators = excluded.allowed_collaborators,
                updated_at = excluded.updated_at
            """,
            (user_id, default_visibility, json.dumps(allowed_collaborators), now)
        )
        conn.commit()
    log_audit(user_id, "UPDATE_PRIVACY_POLICY", None, f"Default visibility set to {default_visibility}")
    return get_user_privacy_policy(user_id)

def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["permitted_user_ids"] = json.loads(d.get("permitted_user_ids") or "[]")
    d["tags"] = json.loads(d.get("tags") or "[]")
    d["vector_synced"] = bool(d.get("vector_synced"))
    return d
