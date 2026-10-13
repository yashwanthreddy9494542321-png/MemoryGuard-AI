from typing import Dict, Any, List
from fastapi import Header, HTTPException, status
from .config import settings

# Available demo test personas for multi-user isolation testing
DEMO_PERSONAS = [
    {
        "id": "yashwanthreddy9494542321@gmail.com",
        "name": "Yashwanth Reddy (Owner)",
        "role": "Primary User",
        "avatar": "YR"
    },
    {
        "id": "alex.chen@healthguard.io",
        "name": "Alex Chen (Physician)",
        "role": "Selected Collaborator",
        "avatar": "AC"
    },
    {
        "id": "sarah.miller@familytrust.org",
        "name": "Sarah Miller (Partner)",
        "role": "Selected Collaborator",
        "avatar": "SM"
    },
    {
        "id": "external.auditor@untrusted.net",
        "name": "External Auditor (Untrusted)",
        "role": "Guest / Third Party",
        "avatar": "EA"
    }
]

def get_current_user_id(
    x_user_id: str = Header(default="yashwanthreddy9494542321@gmail.com", alias="X-User-Id")
) -> str:
    """
    Development authentication abstraction.
    NOTE: In production, this would validate signed JWT / OIDC session cookies.
    For this local privacy prototype, the caller identity is passed via X-User-Id
    allowing real-time multi-user authorization and access control validation.
    """
    clean_id = x_user_id.strip() if x_user_id else settings.lyzr_default_user_id
    return clean_id

def verify_memory_read_access(memory: Dict[str, Any], caller_id: str) -> bool:
    """
    Enforce memory read/search visibility rules:
    - private: Accessible only to authenticated owner.
    - selected: Accessible to authenticated owner OR explicitly authorized user IDs.
    - shared: Accessible to all authenticated users within workspace scope.
    """
    owner_id = memory.get("owner_id")
    visibility = memory.get("visibility", "private")
    permitted_users = memory.get("permitted_user_ids") or []

    if caller_id == owner_id:
        return True

    if visibility == "shared":
        return True

    if visibility == "selected" and caller_id in permitted_users:
        return True

    return False

def verify_memory_write_access(memory: Dict[str, Any], caller_id: str) -> bool:
    """
    Enforce memory write/update/delete rules:
    ONLY the authenticated owner may edit, delete, or change permissions on a memory.
    """
    owner_id = memory.get("owner_id")
    return caller_id == owner_id

def enforce_read_access(memory: Dict[str, Any], caller_id: str):
    if not verify_memory_read_access(memory, caller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Access Denied: Visibility Violation",
                "reason": f"Memory '{memory.get('id')}' is set to '{memory.get('visibility')}' and not accessible to '{caller_id}'",
                "visibility": memory.get("visibility"),
                "caller_id": caller_id
            }
        )

def enforce_write_access(memory: Dict[str, Any], caller_id: str):
    if not verify_memory_write_access(memory, caller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Access Denied: Ownership Violation",
                "reason": f"Only the memory owner ({memory.get('owner_id')}) can modify or delete this memory.",
                "caller_id": caller_id
            }
        )
