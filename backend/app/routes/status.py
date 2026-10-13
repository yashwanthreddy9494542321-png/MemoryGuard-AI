from fastapi import APIRouter
from ..vector_db import vector_service
from ..lyzr_client import lyzr_client
from ..config import settings
from ..security import DEMO_PERSONAS

router = APIRouter(prefix="/api/status", tags=["status"])

@router.get("/health")
def health_check():
    """Overall system health check."""
    qdrant_ok = vector_service.is_connected()
    lyzr_configured = lyzr_client.has_credentials()

    return {
        "status": "healthy" if qdrant_ok else "degraded",
        "service": "MemoraGuard AI",
        "tagline": "Your Memory. Your Control.",
        "version": "1.0.0",
        "qdrant_connected": qdrant_ok,
        "lyzr_configured": lyzr_configured,
        "storage_mode": settings.qdrant_mode
    }

@router.get("/qdrant")
def qdrant_connection_status():
    """
    Honest connection check to Qdrant vector database.
    Performs real collection inspection. Never fabricates connection state.
    """
    return vector_service.get_status()

@router.get("/lyzr")
def lyzr_connection_status():
    """
    Honest connection check to Lyzr Agent Studio.
    Pings the actual Lyzr API endpoint and returns real latency and HTTP status.
    """
    return lyzr_client.test_connection()

@router.get("/omi")
def omi_connection_status():
    """
    Check OMI wearable integration credentials and status.
    Clearly notes that hardware is optional.
    """
    configured = bool(settings.omi_api_key)
    return {
        "configured": configured,
        "hardware_required": False,
        "masked_key": settings.masked_omi_key,
        "endpoint": settings.omi_api_url,
        "mode": "standalone_text_chat" if not configured else "optional_sync_enabled",
        "message": "MemoraGuard AI works completely without an Omi wearable device."
    }

@router.get("/personas")
def get_personas():
    """Return list of demo test personas to allow instant access control verification."""
    return {
        "personas": DEMO_PERSONAS,
        "notice": "Development authentication mode for privacy and visibility boundary verification."
    }
