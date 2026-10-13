import React, { useState } from 'react';
import {
  X,
  Lock,
  Users,
  Globe,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Shield,
  AlertTriangle,
  Server,
  Layers
} from 'lucide-react';
import { Memory, VisibilityLevel } from '../types';
import { api } from '../api';

interface MemoryDetailsModalProps {
  memory: Memory | null;
  onClose: () => void;
  onMemoryUpdated: () => void;
  onMemoryDeleted: () => void;
  activePersonaId: string;
}

export const MemoryDetailsModal: React.FC<MemoryDetailsModalProps> = ({
  memory,
  onClose,
  onMemoryUpdated,
  onMemoryDeleted,
  activePersonaId,
}) => {
  if (!memory) return null;

  const isOwner = memory.owner_id === activePersonaId;
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit state
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content);
  const [category, setCategory] = useState(memory.category);
  const [visibility, setVisibility] = useState<VisibilityLevel>(memory.visibility);
  const [permittedUsersStr, setPermittedUsersStr] = useState(
    (memory.permitted_user_ids || []).join(', ')
  );

  const handleSaveEdit = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);

    try {
      const permittedList = permittedUsersStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.updateMemory(memory.id, {
        title,
        content,
        category,
        visibility,
        permitted_user_ids: permittedList,
      });

      setIsEditing(false);
      onMemoryUpdated();
    } catch (err: any) {
      alert(`Update failed: ${err.message || 'Error saving changes'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.deleteMemory(memory.id);
      setShowDeleteConfirm(false);
      onMemoryDeleted();
    } catch (err: any) {
      alert(`Delete failed: ${err.message || 'Error deleting memory'}`);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 15, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          padding: '28px',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className={`badge-visibility badge-${visibility}`}>
              {visibility === 'private' && <Lock size={11} />}
              {visibility === 'selected' && <Users size={11} />}
              {visibility === 'shared' && <Globe size={11} />}
              {visibility.toUpperCase()}
            </span>
            <span className="badge-category">{category}</span>
            {memory.vector_synced && (
              <span style={{ fontSize: '0.72rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Indexed in Qdrant
              </span>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-active)',
                color: '#FFFFFF',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
            />
          ) : (
            <h2 style={{ color: '#FFFFFF', fontSize: '1.4rem', fontWeight: 700 }}>
              {memory.title}
            </h2>
          )}
        </div>

        {/* Main Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Source Text / Content */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
              Original Source Text (Raw Payload)
            </label>
            {isEditing ? (
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-active)',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-body)',
                }}
              />
            ) : (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#F1F5F9',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {memory.content}
              </div>
            )}
          </div>

          {/* Edit Controls for Visibility & Permitted Users */}
          {isEditing && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Visibility Level:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(['private', 'selected', 'shared'] as VisibilityLevel[]).map((vis) => (
                    <button
                      key={vis}
                      type="button"
                      onClick={() => setVisibility(vis)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: visibility === vis ? '1px solid #818CF8' : '1px solid var(--border-subtle)',
                        background: visibility === vis ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                        color: visibility === vis ? '#FFFFFF' : 'var(--text-muted)',
                      }}
                    >
                      {vis.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {visibility === 'selected' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Permitted Collaborator User IDs:
                  </label>
                  <input
                    type="text"
                    value={permittedUsersStr}
                    onChange={(e) => setPermittedUsersStr(e.target.value)}
                    placeholder="alex.chen@healthguard.io, sarah.miller@familytrust.org"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Technical Diagnostics & Access Metadata */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 600 }}>Memory ID:</span>
              <code style={{ fontSize: '0.7rem' }}>{memory.id}</code>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 600 }}>Owner ID:</span>
              <span>{memory.owner_id}</span>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 600 }}>Vector Dimensions:</span>
              <span>384 Dimensions (Cosine)</span>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 600 }}>Created Timestamp:</span>
              <span>{new Date(memory.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Delete Confirmation Warning Box */}
          {showDeleteConfirm && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', fontWeight: 600, fontSize: '0.9rem' }}>
                <AlertTriangle size={18} /> Confirm Permanent Deletion
              </div>
              <p style={{ fontSize: '0.8rem', color: '#FECACA' }}>
                This memory will be permanently removed from SQLite and purged from the Qdrant vector index. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn btn-danger"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Memory'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <div>
              {isOwner && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-danger"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  <Trash2 size={15} /> Delete Memory
                </button>
              )}
              {!isOwner && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Read-only view (You are viewing as collaborator)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {isOwner && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  <Edit2 size={15} /> Edit
                </button>
              )}

              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                  >
                    <Save size={15} /> {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}

              {!isEditing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem' }}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
