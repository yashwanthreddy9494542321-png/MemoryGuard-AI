import {
  Memory,
  ChatMessage,
  Persona,
  PrivacyPolicy,
  AuditLog,
  QdrantStatus,
  LyzrStatus,
  SystemHealth,
  VisibilityLevel
} from './types';

let currentUserId = localStorage.getItem('memoraguard_active_user') || 'yashwanthreddy9494542321@gmail.com';

export const getActiveUser = () => currentUserId;
export const setActiveUser = (userId: string) => {
  currentUserId = userId;
  localStorage.setItem('memoraguard_active_user', userId);
};

const getHeaders = (extra: HeadersInit = {}): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': currentUserId,
    ...extra,
  };
};

export const api = {
  // System and Diagnostics
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch('/api/status/health', { headers: getHeaders() });
    return res.json();
  },

  async getQdrantStatus(): Promise<QdrantStatus> {
    const res = await fetch('/api/status/qdrant', { headers: getHeaders() });
    return res.json();
  },

  async getLyzrStatus(): Promise<LyzrStatus> {
    const res = await fetch('/api/status/lyzr', { headers: getHeaders() });
    return res.json();
  },

  async getOmiStatus() {
    const res = await fetch('/api/status/omi', { headers: getHeaders() });
    return res.json();
  },

  async getPersonas(): Promise<{ personas: Persona[]; notice: string }> {
    const res = await fetch('/api/status/personas', { headers: getHeaders() });
    return res.json();
  },

  // Memories
  async listMemories(category?: string, visibility?: string): Promise<{ memories: Memory[]; total: number; caller_id: string }> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (visibility && visibility !== 'all') params.append('visibility', visibility);
    const res = await fetch(`/api/memories?${params.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  async searchMemories(query: string, category?: string): Promise<{ query: string; total: number; results: Memory[] }> {
    const params = new URLSearchParams({ q: query });
    if (category && category !== 'all') params.append('category', category);
    const res = await fetch(`/api/memories/search?${params.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  async getMemory(id: string): Promise<{ memory: Memory; caller_id: string; is_owner: boolean }> {
    const res = await fetch(`/api/memories/${id}`, { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.reason || err.detail?.error || 'Failed to fetch memory');
    }
    return res.json();
  },

  async createMemory(data: {
    title: string;
    content: string;
    summary?: string;
    category?: string;
    visibility: VisibilityLevel;
    permitted_user_ids?: string[];
    tags?: string[];
    source?: string;
  }): Promise<{ success: boolean; memory: Memory; qdrant_synced: boolean; message: string }> {
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.error || 'Failed to save memory');
    }
    return res.json();
  },

  async updateMemory(
    id: string,
    updates: Partial<Memory>
  ): Promise<{ success: boolean; memory: Memory; message: string }> {
    const res = await fetch(`/api/memories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.reason || err.detail?.error || 'Failed to update memory');
    }
    return res.json();
  },

  async deleteMemory(id: string): Promise<{ success: boolean; memory_id: string; message: string }> {
    const res = await fetch(`/api/memories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.reason || err.detail?.error || 'Failed to delete memory');
    }
    return res.json();
  },

  async getCategoryStats(): Promise<{
    total_memories: number;
    categories: Record<string, number>;
    visibility: Record<string, number>;
  }> {
    const res = await fetch('/api/memories/categories/stats', { headers: getHeaders() });
    return res.json();
  },

  // Chat
  async sendChatMessage(message: string, sessionId?: string): Promise<{
    reply: string;
    mode: string;
    session_id: string;
    candidate_memories: any[];
    ephemeral_notice: string;
  }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    return res.json();
  },

  async saveChatCandidate(data: {
    title: string;
    content: string;
    summary?: string;
    category?: string;
    visibility: VisibilityLevel;
    permitted_user_ids?: string[];
    tags?: string[];
  }): Promise<{ success: boolean; memory: Memory; message: string }> {
    const res = await fetch('/api/chat/save-candidate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Privacy & Governance
  async getPrivacyPolicy(): Promise<{ policy: PrivacyPolicy }> {
    const res = await fetch('/api/privacy/policy', { headers: getHeaders() });
    return res.json();
  },

  async updatePrivacyPolicy(policy: {
    default_visibility: VisibilityLevel;
    allowed_collaborators: string[];
  }): Promise<{ success: boolean; policy: PrivacyPolicy; message: string }> {
    const res = await fetch('/api/privacy/policy', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(policy),
    });
    return res.json();
  },

  async getAuditLogs(limit: number = 50): Promise<{ count: number; audit_logs: AuditLog[] }> {
    const res = await fetch(`/api/privacy/audit-logs?limit=${limit}`, { headers: getHeaders() });
    return res.json();
  },

  async getPrivacyDisclosure() {
    const res = await fetch('/api/privacy/disclosure', { headers: getHeaders() });
    return res.json();
  },

  async purgeAllUserData(confirmation: string): Promise<{ success: boolean; deleted_count: number; message: string }> {
    const res = await fetch('/api/privacy/purge', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ confirmation }),
    });
    return res.json();
  },

  getExportUrl(format: 'json' | 'csv'): string {
    return `/api/privacy/export?format=${format}`;
  },
};
