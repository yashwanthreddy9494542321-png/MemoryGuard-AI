import React, { useState, useEffect } from 'react';
import {
  Lock,
  Download,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  Check,
  Clock,
  Eye,
  Info,
  Layers,
  HardDrive,
  Users
} from 'lucide-react';
import { PrivacyPolicy, AuditLog, VisibilityLevel } from '../types';
import { api } from '../api';

interface PrivacyCenterProps {
  auditLogs: AuditLog[];
  onDataPurged: () => void;
  activePersonaId: string;
}

export const PrivacyCenter: React.FC<PrivacyCenterProps> = ({
  auditLogs,
  onDataPurged,
  activePersonaId,
}) => {
  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null);
  const [disclosure, setDisclosure] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Policy Form State
  const [defaultVisibility, setDefaultVisibility] = useState<VisibilityLevel>('private');
  const [collaboratorsStr, setCollaboratorsStr] = useState('');

  // Purge State
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activePersonaId]);

  const loadData = async () => {
    try {
      const [polResp, discResp] = await Promise.all([
        api.getPrivacyPolicy(),
        api.getPrivacyDisclosure(),
      ]);
      setPolicy(polResp.policy);
      setDefaultVisibility(polResp.policy.default_visibility);
      setCollaboratorsStr((polResp.policy.allowed_collaborators || []).join(', '));
      setDisclosure(discResp);
    } catch (err) {
      console.error('Error loading privacy data:', err);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      const collabs = collaboratorsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const resp = await api.updatePrivacyPolicy({
        default_visibility: defaultVisibility,
        allowed_collaborators: collabs,
      });
      setPolicy(resp.policy);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to update privacy policy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountPurge = async () => {
    if (purgeConfirmText.trim() !== 'DELETE_ALL_MY_DATA') {
      alert("Confirmation mismatch! Please type 'DELETE_ALL_MY_DATA' to confirm.");
      return;
    }

    if (!confirm(`Are you absolutely sure you want to purge all memories for ${activePersonaId}?`)) {
      return;
    }

    setIsPurging(true);
    setPurgeResult(null);

    try {
      const resp = await api.purgeAllUserData(purgeConfirmText);
      if (resp.success) {
        setPurgeResult(`Purged ${resp.deleted_count} memories from database and Qdrant index.`);
        setPurgeConfirmText('');
        onDataPurged();
      } else {
        alert(resp.message);
      }
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }} className="animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Lock size={20} color="#34D399" />
          </div>
          <div>
            <h1 style={{ color: '#FFFFFF', fontSize: '1.5rem', fontWeight: 700 }}>
              Privacy & Access Control Center
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Granular visibility rules, data export, transparency disclosures, and account purge controls.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '22px' }}>
        {/* Section 1: Default Visibility Policy */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#818CF8" /> Default Visibility Setting
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '18px' }}>
            When memories are saved without explicit overriding, this visibility tier will be applied automatically.
          </p>

          <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  id: 'private',
                  title: 'Private (Recommended Default)',
                  desc: 'Only you can view or search this memory. Zero collaborator access.',
                  icon: Lock,
                  color: '#10B981',
                },
                {
                  id: 'selected',
                  title: 'Selected Users',
                  desc: 'Accessible to you and specific authorized collaborator emails only.',
                  icon: Users,
                  color: '#818CF8',
                },
                {
                  id: 'shared',
                  title: 'Shared Workspace',
                  desc: 'Accessible to all authenticated members of this workspace.',
                  icon: HardDrive,
                  color: '#22D3EE',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: defaultVisibility === opt.id ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-input)',
                    border: defaultVisibility === opt.id ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="default_visibility"
                    value={opt.id}
                    checked={defaultVisibility === opt.id}
                    onChange={() => setDefaultVisibility(opt.id as VisibilityLevel)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Default Collaborators (Comma-separated user IDs)
              </label>
              <input
                type="text"
                placeholder="alex.chen@healthguard.io, sarah.miller@familytrust.org"
                value={collaboratorsStr}
                onChange={(e) => setCollaboratorsStr(e.target.value)}
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
              {saveSuccess ? (
                <span style={{ fontSize: '0.8rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> Preferences updated!
                </span>
              ) : <div />}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.82rem' }}
              >
                {loading ? 'Saving...' : 'Save Policy Defaults'}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Data Export */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} color="#10B981" /> Export Your Memory Vault
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '18px' }}>
            Download complete records of memories owned by <strong>{activePersonaId}</strong> with full metadata and timestamps.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
            {/* JSON Export Card */}
            <a
              href={api.getExportUrl('json')}
              download
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                textDecoration: 'none',
                color: '#FFFFFF',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileJson size={20} color="#818CF8" />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Download JSON Archive</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Complete machine-readable payload with policies
                  </div>
                </div>
              </div>
              <Download size={18} color="#818CF8" />
            </a>

            {/* CSV Export Card */}
            <a
              href={api.getExportUrl('csv')}
              download
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                textDecoration: 'none',
                color: '#FFFFFF',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileSpreadsheet size={20} color="#34D399" />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Download Tabular CSV</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Compatible with Excel, Sheets, and analytical tools
                  </div>
                </div>
              </div>
              <Download size={18} color="#34D399" />
            </a>
          </div>
        </div>
      </div>

      {/* Section 3: Transparency Disclosures */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={18} color="#06B6D4" /> Transparent Data Routing & Storage Disclosures
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          fontSize: '0.82rem',
        }}>
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
          }}>
            <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: '6px' }}>
              Source of Truth Storage
            </strong>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Raw memory text and metadata are stored in a local SQLite database (<code>memoraguard.db</code>) on disk.
              No cloud synchronization is performed without your explicit approval.
            </p>
          </div>

          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
          }}>
            <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: '6px' }}>
              Vector Database & Embeddings
            </strong>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Embeddings are generated using a deterministic local 384-dimensional semantic generator.
              Vectors are indexed in local embedded Qdrant with access control payloads.
            </p>
          </div>

          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
          }}>
            <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: '6px' }}>
              Lyzr Agent Studio Interaction
            </strong>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Chat dialogue messages are sent to Lyzr Agent Studio for response generation.
              Messages are <em>never</em> automatically saved to persistent storage.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Account-Level Purge Danger Zone */}
      <div className="glass-panel" style={{
        padding: '24px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(12, 18, 32, 0.95) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', marginBottom: '6px' }}>
          <AlertTriangle size={20} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Account Data Wipe & Deletion
          </h2>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#FECACA', marginBottom: '16px', maxWidth: '640px' }}>
          Permanently delete all memories, vectors, and metadata owned by <strong>{activePersonaId}</strong> from SQLite and Qdrant.
          This action is instantaneous and irreversible.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Type 'DELETE_ALL_MY_DATA' to confirm"
            value={purgeConfirmText}
            onChange={(e) => setPurgeConfirmText(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              background: 'var(--bg-input)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              width: '300px',
            }}
          />
          <button
            onClick={handleAccountPurge}
            disabled={isPurging || purgeConfirmText.trim() !== 'DELETE_ALL_MY_DATA'}
            className="btn btn-danger"
            style={{ padding: '9px 18px', fontSize: '0.85rem' }}
          >
            <Trash2 size={15} /> {isPurging ? 'Purging data...' : 'Permanently Wipe All Data'}
          </button>
        </div>

        {purgeResult && (
          <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} /> {purgeResult}
          </div>
        )}
      </div>
    </div>
  );
};
