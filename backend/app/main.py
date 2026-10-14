from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
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
    
    # Auto-seed initial realistic demo memories if storage is fresh
    try:
        from .database import list_all_raw_memories
        if not list_all_raw_memories():
            import sys
            from pathlib import Path
            backend_root = Path(__file__).resolve().parent.parent
            if str(backend_root) not in sys.path:
                sys.path.insert(0, str(backend_root))
            from init_db import seed_database
            seed_database()
    except Exception as seed_err:
        print(f"[MemoraGuard] Auto-seed notification: {seed_err}")

    yield
    # Shutdown
    print("[MemoraGuard] Shutting down...")

app = FastAPI(
    title="MemoraGuard AI API",
    description="Privacy-first personal memory assistant backend with granular access control and vector storage.",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

# Vercel Serverless routing & path normalization middleware
@app.middleware("http")
async def vercel_routing_middleware(request: Request, call_next):
    # 1. Recover original client request path if Vercel mapped to api/index.py
    matched_path = request.headers.get("x-matched-path") or request.headers.get("x-vercel-matched-path")
    if matched_path and matched_path != "/api/index.py":
        request.scope["path"] = matched_path
    
    # 2. Normalize paths
    path = request.scope.get("path", "")
    if path == "/api/index.py":
        request.scope["path"] = "/api"
    elif not path.startswith("/api") and path not in ["/", "/docs", "/redoc", "/openapi.json"]:
        request.scope["path"] = f"/api{path}"

    return await call_next(request)

# CORS configuration: Allow local development and any vercel.app preview domain
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
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
@app.get("/api")
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
