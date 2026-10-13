import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  ShieldAlert,
  Save,
  CheckCircle2,
  Lock,
  Users,
  Globe,
  Trash2,
  Bot,
  User,
  Info,
  Clock,
  Check
} from 'lucide-react';
import { ChatMessage, CandidateMemory, VisibilityLevel } from '../types';
import { api } from '../api';

interface ChatProps {
  onMemorySaved: () => void;
  activePersonaId: string;
}

export const Chat: React.FC<ChatProps> = ({ onMemorySaved, activePersonaId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: (
        "Hello! I am your MemoraGuard AI assistant.\n\n" +
        "• Everything we discuss is held in an ephemeral session buffer.\n" +
        "• Nothing is saved to your Memory Vault without your explicit approval.\n" +
        "• When you state personal notes, facts, or instructions, I will detect them and ask if you want them saved."
      ),
      timestamp: new Date().toISOString(),
      isTemporary: true,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState<string | null>(null);
  const [savedSuccessMap, setSavedSuccessMap] = useState<Record<string, boolean>>({});

  // Form state for candidate memory save
  const [candidateSaveConfigs, setCandidateSaveConfigs] = useState<
    Record<string, { visibility: VisibilityLevel; permitted_users: string[]; category: string }>
  >({});

  const samplePrompts = [
    "Remember that I am severely allergic to tree nuts and carry an EpiPen.",
    "Keep in mind that my gym locker code is 38-12-05.",
    "My key work deliverable is the Q4 privacy compliance audit.",
    "What are the core privacy principles of MemoraGuard AI?"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
      isTemporary: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(text);
      const assistantMessageId = `asst-${Date.now()}`;

      const asstMsg: ChatMessage = {
        id: assistantMessageId,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toISOString(),
        mode: response.mode,
        candidate_memories: response.candidate_memories,
        isTemporary: true,
      };

      // Initialize config for candidate memories
      if (response.candidate_memories && response.candidate_memories.length > 0) {
        const initialConfigs: Record<string, any> = {};
        response.candidate_memories.forEach((cand, idx) => {
          initialConfigs[`${assistantMessageId}-${idx}`] = {
            visibility: 'private',
            permitted_users: [],
            category: cand.proposed_category || 'general',
          };
        });
        setCandidateSaveConfigs((prev) => ({ ...prev, ...initialConfigs }));
      }

      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `[Error communicating with backend]: ${err.message || 'Service unavailable'}`,
          timestamp: new Date().toISOString(),
          isTemporary: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCandidate = async (
    candidateKey: string,
    candidate: CandidateMemory,
    sourceMessageText: string
  ) => {
    const config = candidateSaveConfigs[candidateKey] || {
      visibility: 'private',
      permitted_users: [],
      category: candidate.proposed_category || 'general',
    };

    setSavingIndex(candidateKey);
    try {
      await api.saveChatCandidate({
        title: candidate.proposed_title,
        content: candidate.proposed_content || sourceMessageText,
        category: config.category,
        visibility: config.visibility,
        permitted_user_ids: config.permitted_users,
      });

      setSavedSuccessMap((prev) => ({ ...prev, [candidateKey]: true }));
      onMemorySaved();
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Could not persist memory'}`);
    } finally {
      setSavingIndex(null);
    }
  };

  const updateConfig = (key: string, updates: Partial<{ visibility: VisibilityLevel; permitted_users: string[]; category: string }>) => {
    setCandidateSaveConfigs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { visibility: 'private', permitted_users: [], category: 'general' }),
        ...updates,
      },
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', gap: '16px' }} className="animate-fade-in">
      {/* Privacy Notice Banner */}
      <div style={{
        padding: '12px 18px',
        borderRadius: '12px',
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={18} color="#818CF8" />
          <span style={{ fontSize: '0.85rem', color: '#E0E7FF' }}>
            <strong>Ephemeral Dialogue Buffer:</strong> Messages below are not saved until you review and confirm the Save action.
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={12} /> Auto-cleared when browser session ends
        </div>
      </div>

      {/* Messages Stream */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '8px',
                maxWidth: '85%',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {isUser ? (
                  <>
                    <span>You ({activePersonaId.split('@')[0]})</span>
                    <User size={12} />
                  </>
                ) : (
                  <>
                    <Bot size={12} color="#818CF8" />
                    <span style={{ color: '#818CF8', fontWeight: 600 }}>MemoraGuard AI</span>
                    {msg.mode && (
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-dim)'
                      }}>
                        {msg.mode}
                      </span>
                    )}
                  </>
                )}
                <span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: isUser
                    ? 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)'
                    : 'var(--bg-input)',
                  border: isUser ? 'none' : '1px solid var(--border-subtle)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  boxShadow: isUser ? '0 4px 14px rgba(79, 70, 229, 0.25)' : 'none',
                }}
              >
                {msg.text}
              </div>

              {/* Candidate Memory Proposal Cards */}
              {!isUser && msg.candidate_memories && msg.candidate_memories.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
                  {msg.candidate_memories.map((cand, idx) => {
                    const candidateKey = `${msg.id}-${idx}`;
                    const isSaved = savedSuccessMap[candidateKey];
                    const isSaving = savingIndex === candidateKey;
                    const config = candidateSaveConfigs[candidateKey] || {
                      visibility: 'private',
                      permitted_users: [],
                      category: cand.proposed_category || 'general',
                    };

                    return (
                      <div
                        key={candidateKey}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          background: isSaved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                          border: isSaved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: isSaved ? '#34D399' : '#A5B4FC' }}>
                            <Sparkles size={14} />
                            {isSaved ? 'Memory Confirmed & Saved' : 'Candidate Memory Detected'}
                          </div>
                          <span className="badge-category">{config.category}</span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#F1F5F9', fontWeight: 500 }}>
                          {cand.proposed_title}
                        </div>

                        {!isSaved && (
                          <>
                            {/* Visibility Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>Visibility:</span>
                              {(['private', 'selected', 'shared'] as VisibilityLevel[]).map((vis) => (
                                <button
                                  key={vis}
                                  type="button"
                                  onClick={() => updateConfig(candidateKey, { visibility: vis })}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    border: config.visibility === vis ? '1px solid #818CF8' : '1px solid var(--border-subtle)',
                                    background: config.visibility === vis ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                                    color: config.visibility === vis ? '#FFFFFF' : 'var(--text-dim)',
                                  }}
                                >
                                  {vis === 'private' && <Lock size={10} />}
                                  {vis === 'selected' && <Users size={10} />}
                                  {vis === 'shared' && <Globe size={10} />}
                                  {vis.toUpperCase()}
                                </button>
                              ))}
                            </div>

                            {/* Permitted User ID Input (if Selected) */}
                            {config.visibility === 'selected' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                  Permitted collaborator email(s), comma-separated:
                                </label>
                                <input
                                  type="text"
                                  placeholder="alex.chen@healthguard.io, sarah.miller@familytrust.org"
                                  value={config.permitted_users.join(', ')}
                                  onChange={(e) =>
                                    updateConfig(candidateKey, {
                                      permitted_users: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                    })
                                  }
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    background: 'var(--bg-input)',
                                    border: '1px solid var(--border-subtle)',
                                    color: '#FFFFFF',
                                    fontSize: '0.75rem',
                                  }}
                                />
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                onClick={() => handleSaveCandidate(candidateKey, cand, msg.text)}
                                disabled={isSaving}
                                className="btn btn-primary"
                                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                              >
                                {isSaving ? (
                                  'Syncing...'
                                ) : (
                                  <>
                                    <Save size={14} /> Confirm & Save Memory
                                  </>
                                )}
                              </button>
                            </div>
                          </>
                        )}

                        {isSaved && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#34D399' }}>
                            <Check size={14} /> Stored in Vault and indexed in local Qdrant.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div className="pulse-dot" style={{ background: '#818CF8' }} />
            <span>MemoraGuard AI assistant is thinking...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          >
            "{prompt}"
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          background: 'var(--bg-card)',
          padding: '8px 12px',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message, notes, or memories... (Private buffer by default)"
          disabled={loading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '0.92rem',
            padding: '8px 6px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="btn btn-primary"
          style={{ padding: '8px 18px' }}
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
};
