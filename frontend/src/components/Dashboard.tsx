import React from 'react';
import {
  ShieldCheck,
  Database,
  Lock,
  HardDrive,
  Users,
  Search,
  Plus,
  Activity,
  ArrowRight,
  ExternalLink,
  Cpu,
  Clock
} from 'lucide-react';
import { Memory, AuditLog, QdrantStatus, LyzrStatus } from '../types';

interface DashboardProps {
  memories: Memory[];
  auditLogs: AuditLog[];
  categoryStats: Record<string, number>;
  visibilityStats: Record<string, number>;
  qdrantStatus: QdrantStatus | null;
  lyzrStatus: LyzrStatus | null;
  onNavigateTab: (tab: string) => void;
  onSelectMemory: (memory: Memory) => void;
  onOpenCreateModal: () => void;
  activePersonaName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  memories,
  auditLogs,
  categoryStats,
  visibilityStats,
  qdrantStatus,
  lyzrStatus,
  onNavigateTab,
  onSelectMemory,
  onOpenCreateModal,
  activePersonaName,
}) => {
  const totalCount = memories.length;
  const privateCount = visibilityStats['private'] || 0;
  const selectedCount = visibilityStats['selected'] || 0;
  const sharedCount = visibilityStats['shared'] || 0;
  const privacyRatio = totalCount > 0 ? Math.round(((privateCount + selectedCount) / totalCount) * 100) : 100;

  const recentMemories = [...memories].slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(20, 30, 51, 0.9) 0%, rgba(12, 18, 32, 0.95) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow accent */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34D399',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldCheck size={14} /> Zero Cloud Storage Mandatory
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Authenticated Context: <strong style={{ color: '#E2E8F0' }}>{activePersonaName}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
              Privacy-First Memory Vault
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '620px' }}>
              Your personal assistant captures and indexes memories locally. Messages remain ephemeral until you explicitly confirm saving them.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onNavigateTab('chat')}
              className="btn btn-secondary"
            >
              <Cpu size={16} /> Open Chat
            </button>
            <button
              onClick={onOpenCreateModal}
              className="btn btn-primary"
            >
              <Plus size={16} /> Add Memory Manually
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px'
      }}>
        {/* Metric 1: Total Memories */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Accessible Memories
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Database size={18} color="#818CF8" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
            {totalCount}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            Synchronized with SQLite source-of-truth
          </p>
        </div>

        {/* Metric 2: Privacy Ratio */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Privacy Protection
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Lock size={18} color="#34D399" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#34D399', lineHeight: 1 }}>
            {privacyRatio}%
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            {privateCount} private, {selectedCount} selected, {sharedCount} shared
          </p>
        </div>

        {/* Metric 3: Vector Storage Mode */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Vector Engine
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HardDrive size={18} color="#22D3EE" />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
            {qdrantStatus?.mode === 'local' ? 'Local Qdrant' : 'Hosted Qdrant'}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            {qdrantStatus?.connected ? `Points: ${qdrantStatus.points_count || 0} (${qdrantStatus.latency_ms || 0}ms)` : 'Offline'}
          </p>
        </div>

        {/* Metric 4: Lyzr Agent Connection */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Lyzr Agent Studio
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Cpu size={18} color="#FBBF24" />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
            {lyzrStatus?.connected ? 'Live v3 Agent' : 'Local Demo Buffer'}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            {lyzrStatus?.connected ? `Agent ID: ${lyzrStatus.agent_id?.slice(0, 8)}...` : 'No telemetry leakage'}
          </p>
        </div>
      </div>

      {/* Main Content Split: Recent Memories & Audit Log Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Recent Memories Stream */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#818CF8" /> Recent Vault Memories
            </h2>
            <button
              onClick={() => onNavigateTab('vault')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#818CF8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View Vault <ArrowRight size={14} />
            </button>
          </div>

          {recentMemories.length === 0 ? (
            <div style={{
              padding: '36px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed var(--border-subtle)',
            }}>
              <Database size={32} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No memories accessible to this persona.</p>
              <button
                onClick={onOpenCreateModal}
                className="btn btn-secondary"
                style={{ marginTop: '12px' }}
              >
                Create First Memory
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentMemories.map((mem) => (
                <div
                  key={mem.id}
                  onClick={() => onSelectMemory(mem)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#F1F5F9' }}>
                      {mem.title}
                    </div>
                    <span className={`badge-visibility badge-${mem.visibility}`}>
                      {mem.visibility === 'private' && <Lock size={10} />}
                      {mem.visibility === 'selected' && <Users size={10} />}
                      {mem.visibility}
                    </span>
                  </div>
                  <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    {mem.content}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    <span className="badge-category">{mem.category}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {new Date(mem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Activity Feed */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#10B981" /> Transparent Privacy Audit Trail
            </h2>
            <button
              onClick={() => onNavigateTab('privacy')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#34D399',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Privacy Center <ArrowRight size={14} />
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
            Every read, search, update, and export operation is logged here with zero raw payload exposure.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '320px',
            overflowY: 'auto',
          }}>
            {auditLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: log.success ? '#10B981' : '#EF4444',
                  }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#E2E8F0' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {log.details || 'Access check passed'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
