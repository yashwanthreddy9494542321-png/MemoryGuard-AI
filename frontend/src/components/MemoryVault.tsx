import React, { useState } from 'react';
import {
  Search,
  Filter,
  Lock,
  Users,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Tag,
  Clock,
  Sparkles,
  Database,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Memory, VisibilityLevel } from '../types';
import { api } from '../api';

interface MemoryVaultProps {
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  activePersonaId: string;
}

export const MemoryVault: React.FC<MemoryVaultProps> = ({
  memories,
  onSelectMemory,
  onOpenCreateModal,
  onRefresh,
  activePersonaId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Memory[] | null>(null);

  const categories = ['all', 'personal', 'medical', 'finance', 'work', 'idea', 'general'];
  const visibilities = ['all', 'private', 'selected', 'shared'];

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const resp = await api.searchMemories(query, selectedCategory);
      setSearchResults(resp.results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const displayedMemories = (searchResults !== null ? searchResults : memories).filter((mem) => {
    if (selectedCategory !== 'all' && mem.category !== selectedCategory) return false;
    if (selectedVisibility !== 'all' && mem.visibility !== selectedVisibility) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">
      {/* Top Controls: Search, Filters, Add Button */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '8px 14px',
            flex: '1 1 340px',
            maxWidth: '560px',
          }}>
            <Search size={18} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search memories via semantic vectors & text..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                width: '100%',
                outline: 'none',
              }}
            />
            {isSearching && (
              <div className="pulse-dot" style={{ background: '#6366F1' }} />
            )}
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onRefresh}
              className="btn btn-secondary"
              title="Refresh Vault"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onOpenCreateModal}
              className="btn btn-primary"
            >
              <Plus size={16} /> Save New Memory
            </button>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          {/* Categories */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: selectedCategory === cat ? '1px solid #818CF8' : '1px solid var(--border-subtle)',
                  background: selectedCategory === cat ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Visibilities */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Visibility:</span>
            {visibilities.map((vis) => (
              <button
                key={vis}
                onClick={() => setSelectedVisibility(vis)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: selectedVisibility === vis ? '1px solid #818CF8' : '1px solid var(--border-subtle)',
                  background: selectedVisibility === vis ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  color: selectedVisibility === vis ? '#FFFFFF' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {vis === 'private' && <Lock size={11} />}
                {vis === 'selected' && <Users size={11} />}
                {vis === 'shared' && <Globe size={11} />}
                {vis}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Memory Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing <strong>{displayedMemories.length}</strong> {searchResults !== null ? 'search results' : 'memories'}
          {searchQuery && ` for "${searchQuery}"`}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Current Persona: <strong style={{ color: '#E2E8F0' }}>{activePersonaId}</strong>
        </div>
      </div>

      {/* Memories Grid */}
      {displayedMemories.length === 0 ? (
        <div className="glass-panel" style={{
          padding: '48px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <Database size={40} color="var(--text-dim)" />
          <h3 style={{ color: '#FFFFFF', fontSize: '1.1rem' }}>No Memories Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '440px' }}>
            {searchResults !== null
              ? 'No memories matched your query under your current access control scope.'
              : 'Your vault has no records matching the selected filters for this user persona.'}
          </p>
          <button
            onClick={onOpenCreateModal}
            className="btn btn-primary"
            style={{ marginTop: '8px' }}
          >
            <Plus size={16} /> Save First Memory
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '18px',
        }}>
          {displayedMemories.map((mem) => {
            const isOwner = mem.owner_id === activePersonaId;
            return (
              <div
                key={mem.id}
                onClick={() => onSelectMemory(mem)}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Header row: Title + Visibility Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h4 style={{
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}>
                    {mem.title}
                  </h4>
                  <span className={`badge-visibility badge-${mem.visibility}`}>
                    {mem.visibility === 'private' && <Lock size={10} />}
                    {mem.visibility === 'selected' && <Users size={10} />}
                    {mem.visibility === 'shared' && <Globe size={10} />}
                    {mem.visibility}
                  </span>
                </div>

                {/* Similarity Score Pill if in search */}
                {mem.similarity_score !== undefined && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: '#818CF8',
                    background: 'rgba(99, 102, 241, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    width: 'fit-content'
                  }}>
                    <Sparkles size={11} /> Vector Similarity: {Math.round(mem.similarity_score * 100)}%
                  </div>
                )}

                {/* Content snippet */}
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {mem.content}
                </p>

                {/* Footer metadata */}
                <div style={{
                  marginTop: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.74rem',
                  color: 'var(--text-dim)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge-category">{mem.category}</span>
                    {mem.vector_synced && (
                      <span title="Vector embedding synced in Qdrant" style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10B981' }}>
                        <CheckCircle2 size={12} /> Qdrant
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {new Date(mem.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
