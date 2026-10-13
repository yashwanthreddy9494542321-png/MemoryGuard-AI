import React, { useState } from 'react';
import {
  Server,
  Zap,
  HardDrive,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Layers,
  Activity,
  Terminal,
  ExternalLink,
  Users
} from 'lucide-react';
import { QdrantStatus, LyzrStatus, Persona } from '../types';
import { api } from '../api';

interface SettingsProps {
  qdrantStatus: QdrantStatus | null;
  lyzrStatus: LyzrStatus | null;
  onRefreshTelemetry: () => void;
  personas: Persona[];
  activePersonaId: string;
  onSelectPersona: (personaId: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  qdrantStatus,
  lyzrStatus,
  onRefreshTelemetry,
  personas,
  activePersonaId,
  onSelectPersona,
}) => {
  const [testingLyzr, setTestingLyzr] = useState(false);
  const [testingQdrant, setTestingQdrant] = useState(false);
  const [customLyzrResult, setCustomLyzrResult] = useState<any>(null);
  const [customQdrantResult, setCustomQdrantResult] = useState<any>(null);

  const testLyzrPing = async () => {
    setTestingLyzr(true);
    setCustomLyzrResult(null);
    try {
      const resp = await api.getLyzrStatus();
      setCustomLyzrResult(resp);
      onRefreshTelemetry();
    } catch (err: any) {
      setCustomLyzrResult({ connected: false, error: err.message });
    } finally {
      setTestingLyzr(false);
    }
  };

  const testQdrantPing = async () => {
    setTestingQdrant(true);
    setCustomQdrantResult(null);
    try {
      const resp = await api.getQdrantStatus();
      setCustomQdrantResult(resp);
      onRefreshTelemetry();
    } catch (err: any) {
      setCustomQdrantResult({ connected: false, error: err.message });
    } finally {
      setTestingQdrant(false);
    }
  };

  const currentQdrant = customQdrantResult || qdrantStatus;
  const currentLyzr = customLyzrResult || lyzrStatus;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="animate-fade-in">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '28px 32px' }}>
        <h1 style={{ color: '#FFFFFF', fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
          System Settings & Telemetry
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Inspect live backend connection states, verify vector indices, and validate multi-user isolation.
        </p>
      </div>

      {/* Grid: Qdrant Status & Lyzr Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
        {/* Qdrant Status Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: currentQdrant?.connected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Server size={20} color={currentQdrant?.connected ? '#10B981' : '#EF4444'} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Qdrant Vector Database
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Mode: {currentQdrant?.mode === 'local' ? 'Local Embedded Disk' : 'Hosted Qdrant'}
                </span>
              </div>
            </div>

            <button
              onClick={testQdrantPing}
              disabled={testingQdrant}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} className={testingQdrant ? 'spin' : ''} />
              {testingQdrant ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <div style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.8rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Connection Health:</span>
              <strong style={{ color: currentQdrant?.connected ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {currentQdrant?.connected ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {currentQdrant?.connected ? 'CONNECTED (Verified)' : 'DISCONNECTED'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Collection Name:</span>
              <code style={{ color: '#E2E8F0' }}>{currentQdrant?.collection || 'memoraguard_memories'}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Vector Dimensions:</span>
              <span style={{ color: '#E2E8F0' }}>{currentQdrant?.vector_size || 384} (Cosine)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Indexed Vector Points:</span>
              <span style={{ color: '#E2E8F0' }}>{currentQdrant?.points_count ?? 0}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Response Latency:</span>
              <span style={{ color: '#E2E8F0' }}>{currentQdrant?.latency_ms ? `${currentQdrant.latency_ms} ms` : '—'}</span>
            </div>

            {currentQdrant?.storage_path && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Storage Location:</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{currentQdrant.storage_path}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lyzr Agent Studio Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: currentLyzr?.connected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Zap size={20} color={currentLyzr?.connected ? '#818CF8' : '#F59E0B'} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Lyzr Agent Studio
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  v3 Inference API
                </span>
              </div>
            </div>

            <button
              onClick={testLyzrPing}
              disabled={testingLyzr}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} className={testingLyzr ? 'spin' : ''} />
              {testingLyzr ? 'Pinging...' : 'Test Ping'}
            </button>
          </div>

          <div style={{
            padding: '14px',
            borderRadius: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.8rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Connection Health:</span>
              <strong style={{ color: currentLyzr?.connected ? '#10B981' : '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {currentLyzr?.connected ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {currentLyzr?.connected ? 'ONLINE (Response 200)' : 'LOCAL DEMO BUFFER'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Agent ID:</span>
              <code style={{ color: '#E2E8F0' }}>{currentLyzr?.agent_id || '6acdfcd862127a3cccc99410'}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Masked API Key:</span>
              <code style={{ color: '#94A3B8' }}>{currentLyzr?.masked_key || 'sk-def...qJJ'}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Ping Latency:</span>
              <span style={{ color: '#E2E8F0' }}>{currentLyzr?.latency_ms ? `${currentLyzr.latency_ms} ms` : '—'}</span>
            </div>

            {currentLyzr?.response_preview && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block', marginBottom: '2px' }}>
                  Live Response Preview:
                </span>
                <p style={{
                  color: '#A5B4FC',
                  fontSize: '0.72rem',
                  fontStyle: 'italic',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '6px',
                  borderRadius: '6px'
                }}>
                  "{currentLyzr.response_preview}..."
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-User Isolation Workbench */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="#6366F1" /> Access Control Testing Workbench
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
          Switch between personas below to verify that one user's private memories cannot be retrieved or searched by another user:
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}>
          {personas.map((p) => {
            const isSelected = p.id === activePersonaId;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPersona(p.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                  border: isSelected ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isSelected ? '#6366F1' : 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}>
                    {p.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: isSelected ? '#A5B4FC' : 'var(--text-dim)' }}>{p.role}</div>
                  </div>
                </div>
                {isSelected && (
                  <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Active Persona Context
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
