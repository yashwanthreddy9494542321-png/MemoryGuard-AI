from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .vector_db import vector_service
from .routes import memories, chat, privacy, status

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite database and Qdrant vector engine
    print("[MemoraGuard] Starting up services...")
    init_db()
    vector_service.initialize()
    yield
    # Shutdown
    print("[MemoraGuard] Shutting down...")

app = FastAPI(
    title="MemoraGuard AI API",
    description="Privacy-first personal memory assistant backend with granular access control and vector storage.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(memories.router)
app.include_router(chat.router)
app.include_router(privacy.router)
app.include_router(status.router)

@app.get("/")
def root_info():
    return {
        "project": "MemoraGuard AI",
        "tagline": "Your Memory. Your Control.",
        "status": "online",
        "docs_url": "/docs",
        "storage_mode": settings.qdrant_mode,
        "default_visibility": settings.default_visibility,
        "security_principles": [
            "Ephemeral dialogue buffer by default",
            "Explicit user confirmation before saving",
            "Strict server-side authorization enforcement",
            "Transparent audit trail"
        ]
    }
