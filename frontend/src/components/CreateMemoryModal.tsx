import React, { useState } from 'react';
import {
  X,
  Lock,
  Users,
  Globe,
  Save,
  CheckCircle2,
  Tag,
  Shield
} from 'lucide-react';
import { VisibilityLevel } from '../types';
import { api } from '../api';

interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoryCreated: () => void;
  defaultVisibility: VisibilityLevel;
}

export const CreateMemoryModal: React.FC<CreateMemoryModalProps> = ({
  isOpen,
  onClose,
  onMemoryCreated,
  defaultVisibility,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [visibility, setVisibility] = useState<VisibilityLevel>(defaultVisibility || 'private');
  const [permittedUsersStr, setPermittedUsersStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const permittedList = permittedUsersStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const tagList = tagsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.createMemory({
        title,
        content,
        category,
        visibility,
        permitted_user_ids: permittedList,
        tags: tagList,
        source: 'manual',
      });

      setTitle('');
      setContent('');
      setCategory('general');
      setPermittedUsersStr('');
      setTagsStr('');
      onMemoryCreated();
      onClose();
    } catch (err: any) {
      alert(`Save failed: ${err.message || 'Error creating memory'}`);
    } finally {
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
          maxWidth: '620px',
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

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={18} color="#6366F1" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Explicit Memory Capture
            </span>
          </div>
          <h2 style={{ color: '#FFFFFF', fontSize: '1.4rem', fontWeight: 700 }}>
            Save to Memory Vault
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Record a memory with verified access boundaries. Indexed locally into Qdrant vectors.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Memory Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Doctor recommendation for vitamin D dosage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
              }}
            >
              <option value="general">General</option>
              <option value="personal">Personal</option>
              <option value="medical">Medical (Confidential)</option>
              <option value="finance">Finance (Restricted)</option>
              <option value="work">Work & Projects</option>
              <option value="idea">Ideas & Thoughts</option>
            </select>
          </div>

          {/* Visibility Selector */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Visibility Level (Server-side Enforced)
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['private', 'selected', 'shared'] as VisibilityLevel[]).map((vis) => (
                <button
                  key={vis}
                  type="button"
                  onClick={() => setVisibility(vis)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: visibility === vis ? '1px solid #818CF8' : '1px solid var(--border-subtle)',
                    background: visibility === vis ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-input)',
                    color: visibility === vis ? '#FFFFFF' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {vis === 'private' && <Lock size={12} />}
                  {vis === 'selected' && <Users size={12} />}
                  {vis === 'shared' && <Globe size={12} />}
                  {vis.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Permitted Collaborator Users if Selected */}
          {visibility === 'selected' && (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Authorized User ID(s) (comma-separated):
              </label>
              <input
                type="text"
                placeholder="alex.chen@healthguard.io, sarah.miller@familytrust.org"
                value={permittedUsersStr}
                onChange={(e) => setPermittedUsersStr(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          )}

          {/* Content */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Memory Content (Original Text)
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the memory in detail..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Tags (Optional, comma-separated)
            </label>
            <input
              type="text"
              placeholder="health, routine, reminder"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="btn btn-primary"
            >
              <Save size={15} /> {loading ? 'Saving...' : 'Confirm & Save Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
