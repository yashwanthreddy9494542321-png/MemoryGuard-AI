import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { Chat } from './components/Chat';
import { MemoryVault } from './components/MemoryVault';
import { MemoryDetailsModal } from './components/MemoryDetailsModal';
import { CreateMemoryModal } from './components/CreateMemoryModal';
import { PrivacyCenter } from './components/PrivacyCenter';
import { Settings } from './components/Settings';
import { Memory, AuditLog, QdrantStatus, LyzrStatus, Persona, VisibilityLevel } from './types';
import { api, getActiveUser, setActiveUser } from './api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activePersona, setActivePersona] = useState<string>(getActiveUser());
  const [personas, setPersonas] = useState<Persona[]>([
    {
      id: 'yashwanthreddy9494542321@gmail.com',
      name: 'Yashwanth Reddy (Owner)',
      role: 'Primary User',
      avatar: 'YR',
    },
    {
      id: 'alex.chen@healthguard.io',
      name: 'Alex Chen (Physician)',
      role: 'Selected Collaborator',
      avatar: 'AC',
    },
    {
      id: 'sarah.miller@familytrust.org',
      name: 'Sarah Miller (Partner)',
      role: 'Selected Collaborator',
      avatar: 'SM',
    },
    {
      id: 'external.auditor@untrusted.net',
      name: 'External Auditor (Untrusted)',
      role: 'Guest / Third Party',
      avatar: 'EA',
    },
  ]);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [visibilityStats, setVisibilityStats] = useState<Record<string, number>>({});
  const [defaultVisibility, setDefaultVisibility] = useState<VisibilityLevel>('private');

  const [qdrantStatus, setQdrantStatus] = useState<QdrantStatus | null>(null);
  const [lyzrStatus, setLyzrStatus] = useState<LyzrStatus | null>(null);

  // Modals
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadPersonasAndHealth();
  }, []);

  useEffect(() => {
    loadUserData();
  }, [activePersona]);

  const loadPersonasAndHealth = async () => {
    try {
      const [personasData, qdrantData, lyzrData] = await Promise.all([
        api.getPersonas(),
        api.getQdrantStatus(),
        api.getLyzrStatus(),
      ]);
      if (personasData.personas && personasData.personas.length > 0) {
        setPersonas(personasData.personas);
      }
      setQdrantStatus(qdrantData);
      setLyzrStatus(lyzrData);
    } catch (err) {
      console.warn('Initial telemetry ping warning:', err);
    }
  };

  const loadUserData = async () => {
    try {
      const [memoriesData, logsData, statsData, policyData] = await Promise.all([
        api.listMemories(),
        api.getAuditLogs(30),
        api.getCategoryStats(),
        api.getPrivacyPolicy(),
      ]);

      setMemories(memoriesData.memories || []);
      setAuditLogs(logsData.audit_logs || []);
      setCategoryStats(statsData.categories || {});
      setVisibilityStats(statsData.visibility || {});
      if (policyData.policy?.default_visibility) {
        setDefaultVisibility(policyData.policy.default_visibility);
      }
    } catch (err) {
      console.error('Error loading persona data:', err);
    }
  };

  const handleSelectPersona = (personaId: string) => {
    setActiveUser(personaId);
    setActivePersona(personaId);
    setSelectedMemory(null);
  };

  const handleDataChanged = () => {
    loadUserData();
    api.getQdrantStatus().then(setQdrantStatus);
  };

  const activePersonaObj = personas.find((p) => p.id === activePersona) || personas[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & Navigation */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activePersona={activePersona}
        personas={personas}
        onSelectPersona={handleSelectPersona}
        qdrantStatus={qdrantStatus}
        lyzrStatus={lyzrStatus}
      />

      {/* Main Page Container */}
      <main style={{
        flex: 1,
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '24px',
      }}>
        {currentTab === 'dashboard' && (
          <Dashboard
            memories={memories}
            auditLogs={auditLogs}
            categoryStats={categoryStats}
            visibilityStats={visibilityStats}
            qdrantStatus={qdrantStatus}
            lyzrStatus={lyzrStatus}
            onNavigateTab={setCurrentTab}
            onSelectMemory={setSelectedMemory}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            activePersonaName={activePersonaObj.name}
          />
        )}

        {currentTab === 'chat' && (
          <Chat
            onMemorySaved={handleDataChanged}
            activePersonaId={activePersona}
          />
        )}

        {currentTab === 'vault' && (
          <MemoryVault
            memories={memories}
            onSelectMemory={setSelectedMemory}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onRefresh={handleDataChanged}
            activePersonaId={activePersona}
          />
        )}

        {currentTab === 'privacy' && (
          <PrivacyCenter
            auditLogs={auditLogs}
            onDataPurged={handleDataChanged}
            activePersonaId={activePersona}
          />
        )}

        {currentTab === 'settings' && (
          <Settings
            qdrantStatus={qdrantStatus}
            lyzrStatus={lyzrStatus}
            onRefreshTelemetry={loadPersonasAndHealth}
            personas={personas}
            activePersonaId={activePersona}
            onSelectPersona={handleSelectPersona}
          />
        )}
      </main>

      {/* Modals */}
      <MemoryDetailsModal
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        onMemoryUpdated={handleDataChanged}
        onMemoryDeleted={() => {
          setSelectedMemory(null);
          handleDataChanged();
        }}
        activePersonaId={activePersona}
      />

      <CreateMemoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onMemoryCreated={handleDataChanged}
        defaultVisibility={defaultVisibility}
      />
    </div>
  );
};

export default App;
