export type VisibilityLevel = 'private' | 'selected' | 'shared';

export interface Memory {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  visibility: VisibilityLevel;
  permitted_user_ids: string[];
  tags: string[];
  source: string;
  vector_synced: boolean;
  created_at: string;
  updated_at: string;
  similarity_score?: number;
}

export interface CandidateMemory {
  proposed_title: string;
  proposed_content: string;
  proposed_category: string;
  confidence: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  mode?: string;
  candidate_memories?: CandidateMemory[];
  isTemporary?: boolean;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface PrivacyPolicy {
  user_id: string;
  default_visibility: VisibilityLevel;
  allowed_collaborators: string[];
  auto_expire_days: number;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  action: string;
  resource_id?: string;
  details?: string;
  success: boolean;
}

export interface QdrantStatus {
  connected: boolean;
  mode: string;
  collection: string;
  status?: string;
  points_count?: number;
  vector_size?: number;
  distance?: string;
  latency_ms?: number;
  error?: string;
  storage_path?: string;
  hosted_url?: string;
}

export interface LyzrStatus {
  connected: boolean;
  status: string;
  http_code?: number;
  agent_id?: string;
  latency_ms?: number;
  response_preview?: string;
  masked_key?: string;
  error?: string;
}

export interface SystemHealth {
  status: string;
  service: string;
  tagline: string;
  version: string;
  qdrant_connected: boolean;
  lyzr_configured: boolean;
  storage_mode: string;
}
