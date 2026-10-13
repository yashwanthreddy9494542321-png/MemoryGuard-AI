import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.database import init_db, create_memory, list_all_raw_memories
from app.vector_db import vector_service
from app.embeddings import embedding_service
from app.config import settings

SAMPLE_MEMORIES = [
    {
        "owner_id": "yashwanthreddy9494542321@gmail.com",
        "title": "Severe Penicillin Allergy Note",
        "content": "Allergic to penicillin and amoxicillin. Causes severe hives and anaphylactic reaction. Prescribed epinephrine auto-injector.",
        "summary": "Severe penicillin and amoxicillin allergy alert with epinephrine prescription.",
        "category": "medical",
        "visibility": "selected",
        "permitted_user_ids": ["alex.chen@healthguard.io"],
        "tags": ["allergy", "medical-emergency", "prescriptions"],
        "source": "manual"
    },
    {
        "owner_id": "yashwanthreddy9494542321@gmail.com",
        "title": "Family Safe Combination & Vault Code",
        "content": "Master home fireproof vault combination is 42-18-99. Backup mechanical keys are in the safety deposit box at First Horizon Bank.",
        "summary": "Master fireproof safe combination and bank safety deposit box key location.",
        "category": "finance",
        "visibility": "private",  # Strictly private! No other user can access
        "permitted_user_ids": [],
        "tags": ["vault", "keys", "confidential"],
        "source": "manual"
    },
    {
        "owner_id": "yashwanthreddy9494542321@gmail.com",
        "title": "MemoraGuard AI Architectural Principles",
        "content": "Privacy-first architecture: text chat works completely without wearables. Explicit confirmation required before saving. Strict server-side authorization checks.",
        "summary": "Core architectural principles of MemoraGuard AI memory system.",
        "category": "work",
        "visibility": "shared",  # Shared across all authenticated collaborators
        "permitted_user_ids": [],
        "tags": ["architecture", "privacy", "specifications"],
        "source": "chat"
    },
    {
        "owner_id": "yashwanthreddy9494542321@gmail.com",
        "title": "Apartment Wi-Fi & Smart Lock Access",
        "content": "Guest Wi-Fi network SSID is 'Oakwood-5G' password 'SereneValley2026!'. Front door August smart lock backup passcode is 8492#.",
        "summary": "Home Wi-Fi credentials and front door backup access code.",
        "category": "personal",
        "visibility": "selected",
        "permitted_user_ids": ["sarah.miller@familytrust.org", "alex.chen@healthguard.io"],
        "tags": ["home", "wifi", "access-codes"],
        "source": "chat"
    },
    {
        "owner_id": "yashwanthreddy9494542321@gmail.com",
        "title": "Quantum Algorithm Research Notes",
        "content": "Exploring variational quantum eigensolvers for lattice protein folding optimization. Target completion Q4 2026.",
        "summary": "Research milestones on variational quantum eigensolver experiments.",
        "category": "idea",
        "visibility": "private",
        "permitted_user_ids": [],
        "tags": ["research", "quantum", "patents"],
        "source": "manual"
    },
    # Sample memory owned by a different user to verify authorization isolation
    {
        "owner_id": "sarah.miller@familytrust.org",
        "title": "Sarah's Confidential Trust Portfolio",
        "content": "Private estate distribution documents and fiduciary beneficiary schedule for 2026.",
        "summary": "Confidential trust portfolio and fiduciary allocations.",
        "category": "finance",
        "visibility": "private",  # Yashwanth or external auditor MUST NOT be able to see this!
        "permitted_user_ids": [],
        "tags": ["estate", "trust", "private"],
        "source": "manual"
    }
]

def seed_database():
    print("[Seed] Initializing database...")
    init_db()
    
    print("[Seed] Initializing Qdrant vector engine...")
    vector_service.initialize()

    existing = list_all_raw_memories()
    if existing:
        print(f"[Seed] Database already contains {len(existing)} memories. Skipping re-seed.")
        return

    print("[Seed] Populating realistic sample memories with multi-tier access control...")
    for item in SAMPLE_MEMORIES:
        created = create_memory(item)
        full_text = f"{item['title']}. {item['content']}"
        vec = embedding_service.embed_text(full_text)
        synced = vector_service.upsert_memory(created, vec)
        print(f"  + Seeded: [{created['visibility'].upper()}] '{created['title']}' (Owner: {created['owner_id']}, Qdrant: {'OK' if synced else 'Failed'})")

    print("[Seed] Seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
