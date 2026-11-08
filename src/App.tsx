import React, { useState, useEffect } from 'react';
import { Navbar, NavTab, MobileBottomBar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { CreateRecapView } from './components/CreateRecapView.tsx';
import { ProjectDetailView } from './components/ProjectDetailView.tsx';
import { ProjectsListView } from './components/ProjectsListView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { RecapProject, SystemHealth, VoiceId } from './types/project.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [projects, setProjects] = useState<RecapProject[]>([]);
  const [counts, setCounts] = useState({ total: 0, completed: 0, processing: 0, failed: 0 });
  const [systemStatus, setSystemStatus] = useState<SystemHealth | null>(null);

  // Global Groq test status for quick action
  const [groqTesting, setGroqTesting] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // Load system status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setSystemStatus(data);
    } catch (e) {
      console.error('Status fetch error:', e);
    }
  };

  // Load projects list
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
        setCounts(data.counts || { total: 0, completed: 0, processing: 0, failed: 0 });
      }
    } catch (e) {
      console.error('Projects fetch error:', e);
    }
  };

  // Fetch single project for detail view
  const fetchSingleProject = async (id: string): Promise<RecapProject | null> => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (data.success && data.project) {
        // Also update local list
        setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
        return data.project;
      }
    } catch (e) {
      console.error('Single project fetch error:', e);
    }
    return null;
  };

  useEffect(() => {
    fetchStatus();
    fetchProjects();

    // Poll projects periodically
    const timer = setInterval(() => {
      fetchProjects();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleTestGroq = async (customApiKey?: string) => {
    setGroqTesting(true);
    setGroqTestResult(null);
    try {
      const res = await fetch('/api/test-groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customApiKey }),
      });
      const data = await res.json();
      setGroqTestResult(data);
      fetchStatus();
      return data;
    } catch (err: any) {
      const failure = { success: false, message: err.message || 'Groq connection failed' };
      setGroqTestResult(failure);
      return failure;
    } finally {
      setGroqTesting(false);
    }
  };

  const handlePreviewVoice = async (voiceId: VoiceId): Promise<string | null> => {
    try {
      const res = await fetch('/api/test-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId }),
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        return data.audioUrl;
      }
    } catch (err) {
      console.error('Voice preview request error:', err);
    }
    return null;
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
      fetchProjects();
    } catch (e) {
      console.error('Delete project error:', e);
    }
  };

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
  };

  const handleProjectCreated = (newId: string) => {
    fetchProjects();
    setSelectedProjectId(newId);
  };

  return (
    <div className="min-h-screen bg-[#0b0d14] text-slate-100 flex flex-col selection:bg-purple-500/30 selection:text-purple-200">
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'dashboard') {
            // Keep or switch
          }
        }}
        systemStatus={systemStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {selectedProjectId ? (
          <ProjectDetailView
            projectId={selectedProjectId}
            onBack={() => {
              setSelectedProjectId(null);
              fetchProjects();
            }}
            onRefreshProject={fetchSingleProject}
          />
        ) : currentTab === 'dashboard' ? (
          <DashboardView
            projects={projects}
            counts={counts}
            systemStatus={systemStatus}
            onNavigateCreate={() => setCurrentTab('create')}
            onNavigateSettings={() => setCurrentTab('settings')}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            onTestGroq={() => handleTestGroq()}
            groqTesting={groqTesting}
            groqTestResult={groqTestResult}
          />
        ) : currentTab === 'create' ? (
          <CreateRecapView
            onProjectCreated={handleProjectCreated}
            onPreviewVoice={handlePreviewVoice}
          />
        ) : currentTab === 'projects' ? (
          <ProjectsListView
            projects={projects}
            onSelectProject={handleSelectProject}
            onNavigateCreate={() => setCurrentTab('create')}
            onDeleteProject={handleDeleteProject}
          />
        ) : currentTab === 'settings' ? (
          <SettingsView
            systemStatus={systemStatus}
            onRefreshStatus={fetchStatus}
            onTestGroq={handleTestGroq}
            onPreviewVoice={handlePreviewVoice}
          />
        ) : null}
      </main>

      {/* Fixed bottom navigation for mobile */}
      <MobileBottomBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedProjectId(null);
          setCurrentTab(tab);
        }}
        systemStatus={systemStatus}
      />
    </div>
  );
}
