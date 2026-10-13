import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load backend-only .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "development")
    app_host: str = os.getenv("APP_HOST", "127.0.0.1")
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")

    # Storage Paths
    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{data_dir / 'memoraguard.db'}")

    # Qdrant Vector DB
    qdrant_mode: str = os.getenv("QDRANT_MODE", "local")  # 'local' or 'hosted'
    qdrant_local_path: str = os.getenv("QDRANT_LOCAL_PATH", str(data_dir / "qdrant_storage"))
    qdrant_url: str = os.getenv("QDRANT_URL", "")
    qdrant_api_key: str = os.getenv("QDRANT_API_KEY", "")
    qdrant_collection_name: str = os.getenv("QDRANT_COLLECTION_NAME", "memoraguard_memories")
    vector_dim: int = 384

    # Lyzr Agent Studio
    lyzr_api_url: str = os.getenv("LYZR_API_URL", "https://agent-prod.studio.lyzr.ai/v3/inference/chat/")
    lyzr_api_key: str = os.getenv("LYZR_API_KEY", "")
    lyzr_agent_id: str = os.getenv("LYZR_AGENT_ID", "")
    lyzr_default_user_id: str = os.getenv("LYZR_DEFAULT_USER_ID", "yashwanthreddy9494542321@gmail.com")
    lyzr_session_id: str = os.getenv("LYZR_SESSION_ID", "")

    # OMI Wearable (Optional Text Sync)
    omi_api_key: str = os.getenv("OMI_API_KEY", "")
    omi_api_url: str = os.getenv("OMI_API_URL", "https://api.omi.me/v1")

    # Security & CORS
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
    ]
    default_visibility: str = os.getenv("DEFAULT_VISIBILITY", "private")

    # Safe diagnostics
    @property
    def masked_lyzr_key(self) -> str:
        if not self.lyzr_api_key:
            return "Not configured"
        if len(self.lyzr_api_key) <= 8:
            return "********"
        return f"{self.lyzr_api_key[:6]}...{self.lyzr_api_key[-4:]}"

    @property
    def masked_qdrant_key(self) -> str:
        if not self.qdrant_api_key:
            return "Not configured"
        if len(self.qdrant_api_key) <= 8:
            return "********"
        return f"{self.qdrant_api_key[:6]}...{self.qdrant_api_key[-4:]}"

    @property
    def masked_omi_key(self) -> str:
        if not self.omi_api_key:
            return "Not configured"
        if len(self.omi_api_key) <= 8:
            return "********"
        return f"{self.omi_api_key[:6]}...{self.omi_api_key[-4:]}"


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
