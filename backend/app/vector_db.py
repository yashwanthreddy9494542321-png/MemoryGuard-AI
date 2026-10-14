import time
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny
)
from .config import settings

class QdrantVectorService:
    def __init__(self):
        self.client: Optional[QdrantClient] = None
        self.collection_name = settings.qdrant_collection_name
        self.vector_dim = settings.vector_dim
        self.mode = settings.qdrant_mode
        self._connected = False
        self._last_error: Optional[str] = None

    def initialize(self):
        """Connect to either local embedded Qdrant or hosted Qdrant endpoint."""
        try:
            if settings.qdrant_url and settings.qdrant_url.strip():
                # Hosted / Docker Qdrant endpoint
                self.client = QdrantClient(
                    url=settings.qdrant_url.strip(),
                    api_key=settings.qdrant_api_key.strip() if settings.qdrant_api_key else None,
                    timeout=5.0
                )
                self.mode = "hosted"
            elif settings.qdrant_local_path == ":memory:" or settings.qdrant_mode == "memory":
                # In-memory Qdrant (serverless / test environments)
                self.client = QdrantClient(":memory:")
                self.mode = "memory"
            else:
                # Local embedded Qdrant (writes to disk or memory)
                try:
                    settings.data_dir.mkdir(parents=True, exist_ok=True)
                    self.client = QdrantClient(path=settings.qdrant_local_path)
                    self.mode = "local"
                except Exception as disk_err:
                    print(f"[Qdrant] Disk storage init failed ({disk_err}). Falling back to :memory: mode.")
                    self.client = QdrantClient(":memory:")
                    self.mode = "memory"

            # Check if collection exists or create it
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.vector_dim, distance=Distance.COSINE)
                )

            self._connected = True
            self._last_error = None
            print(f"[Qdrant] Initialized successfully in {self.mode.upper()} mode on collection '{self.collection_name}'")
        except Exception as e:
            self._connected = False
            self._last_error = str(e)
            print(f"[Qdrant Warning] Failed to initialize Qdrant ({self.mode} mode): {e}")

    def is_connected(self) -> bool:
        return self._connected and self.client is not None

    def get_status(self) -> Dict[str, Any]:
        """Perform a real health-check on Qdrant. Never fabricates connection state."""
        if not self.client:
            return {
                "connected": False,
                "mode": self.mode,
                "collection": self.collection_name,
                "points_count": 0,
                "error": self._last_error or "Qdrant client not initialized",
                "storage_path": settings.qdrant_local_path if self.mode == "local" else None,
                "hosted_url": settings.qdrant_url if self.mode == "hosted" else None
            }

        start = time.time()
        try:
            info = self.client.get_collection(self.collection_name)
            latency_ms = round((time.time() - start) * 1000, 2)
            self._connected = True
            self._last_error = None
            return {
                "connected": True,
                "mode": self.mode,
                "collection": self.collection_name,
                "status": str(info.status),
                "points_count": info.points_count or 0,
                "vector_size": self.vector_dim,
                "distance": "Cosine",
                "latency_ms": latency_ms,
                "storage_path": settings.qdrant_local_path if self.mode == "local" else None,
                "hosted_url": settings.qdrant_url if self.mode == "hosted" else None
            }
        except Exception as e:
            self._connected = False
            self._last_error = str(e)
            return {
                "connected": False,
                "mode": self.mode,
                "collection": self.collection_name,
                "points_count": 0,
                "error": str(e),
                "storage_path": settings.qdrant_local_path if self.mode == "local" else None,
                "hosted_url": settings.qdrant_url if self.mode == "hosted" else None
            }

    def upsert_memory(self, memory: Dict[str, Any], vector: List[float]) -> bool:
        """Store vector embedding and access-control metadata payload in Qdrant."""
        if not self.is_connected():
            return False

        try:
            point = PointStruct(
                id=memory["id"],
                vector=vector,
                payload={
                    "memory_id": memory["id"],
                    "owner_id": memory["owner_id"],
                    "title": memory.get("title", ""),
                    "category": memory.get("category", "general"),
                    "visibility": memory.get("visibility", "private"),
                    "permitted_user_ids": memory.get("permitted_user_ids", []),
                    "created_at": memory.get("created_at", ""),
                    "updated_at": memory.get("updated_at", "")
                }
            )
            self.client.upsert(collection_name=self.collection_name, points=[point])
            return True
        except Exception as e:
            print(f"[Qdrant Upsert Error] {e}")
            return False

    def search_memories(
        self,
        query_vector: List[float],
        caller_id: str,
        limit: int = 20,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Query vector similarity and apply authorization filtering.
        Security rule:
        A memory is returned IF AND ONLY IF:
          1. Caller is owner (owner_id == caller_id)
          2. OR visibility == 'shared'
          3. OR (visibility == 'selected' AND caller_id in permitted_user_ids)
        """
        if not self.is_connected():
            return []

        try:
            # Query the vector index
            search_result = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=limit * 2,  # Fetch wider candidate pool before backend authorization verification
                with_payload=True
            )

            authorized_matches = []
            for hit in search_result.points:
                payload = hit.payload or {}
                owner_id = payload.get("owner_id")
                visibility = payload.get("visibility", "private")
                permitted_users = payload.get("permitted_user_ids", [])

                # Authorization Check
                is_authorized = False
                if caller_id == owner_id:
                    is_authorized = True
                elif visibility == "shared":
                    is_authorized = True
                elif visibility == "selected" and caller_id in permitted_users:
                    is_authorized = True

                if not is_authorized:
                    continue

                if category and category.lower() != "all" and payload.get("category") != category:
                    continue

                authorized_matches.append({
                    "id": payload.get("memory_id", str(hit.id)),
                    "score": round(hit.score, 4) if hasattr(hit, "score") and hit.score is not None else 0.0,
                    "owner_id": owner_id,
                    "title": payload.get("title"),
                    "category": payload.get("category"),
                    "visibility": visibility,
                    "permitted_user_ids": permitted_users
                })

                if len(authorized_matches) >= limit:
                    break

            return authorized_matches
        except Exception as e:
            print(f"[Qdrant Search Error] {e}")
            return []

    def delete_memory(self, memory_id: str) -> bool:
        """Permanently delete memory vector point from Qdrant."""
        if not self.is_connected():
            return False
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=[memory_id]
            )
            return True
        except Exception as e:
            print(f"[Qdrant Delete Error] {e}")
            return False

    def purge_by_owner(self, owner_id: str) -> bool:
        """Purge all vector points belonging to an owner."""
        if not self.is_connected():
            return False
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="owner_id",
                            match=MatchValue(value=owner_id)
                        )
                    ]
                )
            )
            return True
        except Exception as e:
            print(f"[Qdrant Purge Error] {e}")
            return False

vector_service = QdrantVectorService()
