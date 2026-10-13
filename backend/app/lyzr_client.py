import time
import requests
import re
from typing import Dict, Any, Optional, List
from .config import settings

class LyzrAgentClient:
    def __init__(self):
        self.api_url = settings.lyzr_api_url
        self.api_key = settings.lyzr_api_key
        self.agent_id = settings.lyzr_agent_id
        self.default_user_id = settings.lyzr_default_user_id
        self.session_id = settings.lyzr_session_id or f"{self.agent_id}-session-1"

    def has_credentials(self) -> bool:
        return bool(self.api_key and self.agent_id and self.api_url)

    def test_connection(self) -> Dict[str, Any]:
        """
        Verify real connection to Lyzr Agent Studio.
        Never fabricates connection state.
        """
        if not self.has_credentials():
            return {
                "connected": False,
                "status": "missing_credentials",
                "message": "Lyzr API Key or Agent ID not configured in backend .env",
                "agent_id": self.agent_id or None,
                "api_url": self.api_url
            }

        start = time.time()
        try:
            headers = {
                "Content-Type": "application/json",
                "x-api-key": self.api_key
            }
            payload = {
                "user_id": self.default_user_id,
                "agent_id": self.agent_id,
                "session_id": self.session_id,
                "message": "Ping: connection status check"
            }
            resp = requests.post(self.api_url, json=payload, headers=headers, timeout=12.0)
            latency_ms = round((time.time() - start) * 1000, 2)
            
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "connected": True,
                    "status": "online",
                    "http_code": 200,
                    "agent_id": self.agent_id,
                    "latency_ms": latency_ms,
                    "response_preview": (data.get("response") or "")[:100],
                    "masked_key": settings.masked_lyzr_key
                }
            else:
                return {
                    "connected": False,
                    "status": f"http_error_{resp.status_code}",
                    "http_code": resp.status_code,
                    "latency_ms": latency_ms,
                    "error": resp.text[:200],
                    "agent_id": self.agent_id
                }
        except requests.exceptions.Timeout:
            return {
                "connected": False,
                "status": "timeout",
                "error": "Connection to Lyzr Agent Studio timed out after 12s",
                "agent_id": self.agent_id
            }
        except Exception as e:
            return {
                "connected": False,
                "status": "network_error",
                "error": str(e),
                "agent_id": self.agent_id
            }

    def chat(self, user_id: str, message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Send user message to Lyzr Agent Studio backend proxy.
        If credentials are absent or remote call fails, falls back gracefully to local demo mode.
        """
        effective_session = session_id or self.session_id
        effective_user = user_id or self.default_user_id

        # Detect candidate memories for explicit user approval
        candidate_memories = self._extract_candidate_memories(message)

        if not self.has_credentials():
            return {
                "reply": (
                    "[Demo Mode: Lyzr credentials not configured] "
                    "I am running in local privacy demo mode. "
                    "Your messages are held in a temporary buffer until you explicitly click 'Save Memory'."
                ),
                "mode": "demo_fallback",
                "candidate_memories": candidate_memories,
                "session_id": effective_session
            }

        try:
            headers = {
                "Content-Type": "application/json",
                "x-api-key": self.api_key
            }
            payload = {
                "user_id": effective_user,
                "agent_id": self.agent_id,
                "session_id": effective_session,
                "message": message
            }
            resp = requests.post(self.api_url, json=payload, headers=headers, timeout=20.0)

            if resp.status_code == 200:
                data = resp.json()
                reply_text = data.get("response") or "I received your message."
                return {
                    "reply": reply_text,
                    "mode": "live_lyzr",
                    "candidate_memories": candidate_memories,
                    "session_id": effective_session,
                    "agent_id": self.agent_id
                }
            else:
                return {
                    "reply": f"[Lyzr API returned code {resp.status_code}]: {resp.text[:180]} (Operating in safe local buffer)",
                    "mode": "api_error_fallback",
                    "candidate_memories": candidate_memories,
                    "session_id": effective_session
                }
        except Exception as e:
            return {
                "reply": f"[Lyzr Connection Notice]: Operating locally due to connection error: {str(e)}",
                "mode": "connection_error_fallback",
                "candidate_memories": candidate_memories,
                "session_id": effective_session
            }

    def _extract_candidate_memories(self, text: str) -> List[Dict[str, Any]]:
        """
        Analyze dialogue text to identify personal statements, preferences,
        medical notes, commitments, and passwords/credentials.
        IMPORTANT: These are ONLY proposals. Nothing is saved until the user explicitly confirms!
        """
        candidates = []
        cleaned = text.strip()
        
        # Heuristics for personal memory extraction
        indicators = [
            (r'(?:remember|don\'t forget|note that|keep in mind)\s+(?:that\s+)?(.+)', 'general'),
            (r'(?:i am allergic to|prescribed|doctor said|medication|diagnosis)\s+(.+)', 'medical'),
            (r'(?:my goal is|project deadline|deliverable|meeting with)\s+(.+)', 'work'),
            (r'(?:i like|i prefer|my favorite|i hate|i usually)\s+(.+)', 'preference'),
            (r'(?:bank account|tax id|salary|budget|spent)\s+(.+)', 'finance'),
            (r'(?:idea for|thought on|what if we)\s+(.+)', 'idea')
        ]

        for pattern, cat in indicators:
            match = re.search(pattern, cleaned, re.IGNORECASE)
            if match:
                extracted = match.group(0).strip()
                candidates.append({
                    "proposed_title": f"{cat.capitalize()}: {cleaned[:35]}...",
                    "proposed_content": cleaned,
                    "proposed_category": cat,
                    "confidence": "high"
                })
                break

        # If no specific trigger matched, but the message has substantial personal content
        if not candidates and len(cleaned) > 15:
            candidates.append({
                "proposed_title": f"Memory: {cleaned[:35]}...",
                "proposed_content": cleaned,
                "proposed_category": "general",
                "confidence": "standard"
            })

        return candidates

lyzr_client = LyzrAgentClient()
