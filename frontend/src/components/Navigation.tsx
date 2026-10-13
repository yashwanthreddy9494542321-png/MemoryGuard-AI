import React, { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  MessageSquare,
  Database,
  Lock,
  Settings,
  UserCheck,
  Server,
  Zap,
  ChevronDown
} from 'lucide-react';
import { Persona, QdrantStatus, LyzrStatus } from '../types';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activePersona: string;
  personas: Persona[];
  onSelectPersona: (personaId: string) => void;
  qdrantStatus: QdrantStatus | null;
  lyzrStatus: LyzrStatus | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  activePersona,
  personas,
  onSelectPersona,
  qdrantStatus,
  lyzrStatus,
}) => {
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const currentPersonaObj = personas.find((p) => p.id === activePersona) || personas[0];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Assistant Chat', icon: MessageSquare },
    { id: 'vault', label: 'Memory Vault', icon: Database },
    { id: 'privacy', label: 'Privacy Center', icon: Lock },
    { id: 'settings', label: 'Settings & Telemetry', icon: Settings },
  ];

  return (
    <header style={{
      background: 'rgba(12, 18, 32, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
          }}>
            <Shield size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #FFFFFF 0%, #CBD5E1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                MemoraGuard AI
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#A5B4FC',
                fontWeight: 600,
                letterSpacing: '0.05em'
              }}>
                v1.0 LOCAL-FIRST
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>
              Your Memory. Your Control.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} color={isActive ? '#818CF8' : 'currentColor'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Status Indicators & Persona Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Qdrant Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}>
            <Server size={12} color={qdrantStatus?.connected ? '#10B981' : '#EF4444'} />
            <span>Qdrant: {qdrantStatus?.connected ? (qdrantStatus.mode === 'local' ? 'Local Embedded' : 'Hosted') : 'Offline'}</span>
            <span
              className="pulse-dot"
              style={{ background: qdrantStatus?.connected ? '#10B981' : '#EF4444' }}
            />
          </div>

          {/* Lyzr Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}>
            <Zap size={12} color={lyzrStatus?.connected ? '#818CF8' : '#F59E0B'} />
            <span>Lyzr: {lyzrStatus?.connected ? 'Online' : 'Demo Buffer'}</span>
            <span
              className="pulse-dot"
              style={{ background: lyzrStatus?.connected ? '#818CF8' : '#F59E0B' }}
            />
          </div>

          {/* Active User Persona Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#E0E7FF',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#FFFFFF'
              }}>
                {currentPersonaObj?.avatar || 'U'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{currentPersonaObj?.name?.split(' ')[0]}</div>
                <div style={{ fontSize: '0.65rem', color: '#A5B4FC' }}>{currentPersonaObj?.role}</div>
              </div>
              <ChevronDown size={14} color="#A5B4FC" />
            </button>

            {showPersonaDropdown && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '260px',
                background: 'var(--bg-card)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                padding: '8px',
                zIndex: 200,
              }}>
                <div style={{
                  padding: '6px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '6px',
                }}>
                  Access Control Persona
                </div>
                {personas.map((persona) => {
                  const isSelected = persona.id === activePersona;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => {
                        onSelectPersona(persona.id);
                        setShowPersonaDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isSelected ? '#6366F1' : 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#FFFFFF'
                      }}>
                        {persona.avatar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {persona.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: isSelected ? '#A5B4FC' : 'var(--text-dim)' }}>
                          {persona.role}
                        </div>
                      </div>
                      {isSelected && <UserCheck size={16} color="#10B981" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
