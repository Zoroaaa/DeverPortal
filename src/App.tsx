import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import {
  Header,
  HeroSection,
  ProjectsSection,
  AboutSection,
  Footer,
  LoginModal,
  AdminPanel,
} from './components';
import { useAdminAuth, useKVData } from './hooks';
import { DEFAULT_PROJECTS, DEFAULT_SITE_CONFIG } from './constants';
import type { Project, SiteConfig } from './types';

function App() {
  // ── KV-backed data ────────────────────────────────────────────────────────
  const { isAuthenticated, token, login, logout, isLoading } = useAdminAuth();

  const {
    data: projects,
    save: saveProjects,
    loading: projectsLoading,
  } = useKVData<Project[]>({
    endpoint: '/api/projects',
    localKey: 'zoro_projects',
    defaultValue: DEFAULT_PROJECTS,
    token,
  });

  const {
    data: config,
    save: saveConfig,
  } = useKVData<SiteConfig>({
    endpoint: '/api/config',
    localKey: 'zoro_site_config',
    defaultValue: DEFAULT_SITE_CONFIG,
    token,
  });

  // ── Admin UI state ────────────────────────────────────────────────────────
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminHint, setShowAdminHint] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleProjectClick = useCallback(async (project: Project) => {
    // Increment view count locally first
    const updated = projects.map(p =>
      p.id === project.id ? { ...p, viewCount: p.viewCount + 1 } : p,
    );
    await saveProjects(updated);

    // Also fire-and-forget to KV views endpoint (persists without admin token)
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id }),
    }).catch(() => {});

    window.open(project.demoUrl, '_blank');
  }, [projects, saveProjects]);

  const handleLogin = useCallback(async (password: string) => {
    const success = await login(password);
    if (success) setShowAdminPanel(true);
    return success;
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    setShowAdminPanel(false);
  }, [logout]);

  const handleUpdateProjects = useCallback(async (newProjects: Project[]) => {
    await saveProjects(newProjects);
  }, [saveProjects]);

  const handleUpdateConfig = useCallback(async (newConfig: SiteConfig) => {
    await saveConfig(newConfig);
  }, [saveConfig]);

  const toggleAdmin = useCallback(() => {
    if (showAdminPanel) {
      setShowAdminPanel(false);
    } else if (isAuthenticated) {
      setShowAdminPanel(true);
    } else {
      setShowLoginModal(true);
    }
  }, [showAdminPanel, isAuthenticated]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ink)', color: 'var(--text-primary)' }}>
      {/* Film-grain noise overlay */}
      <div className="noise-overlay" aria-hidden="true" />

      <Header config={config} />

      <main>
        <HeroSection config={config} />
        {!projectsLoading && <ProjectsSection projects={projects} onProjectClick={handleProjectClick} />}
        <AboutSection config={config} />
      </main>

      <Footer config={config} />

      {/* ── Admin FAB ──────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-6 right-6 z-40"
        onMouseEnter={() => setShowAdminHint(true)}
        onMouseLeave={() => setShowAdminHint(false)}
      >
        <AnimatePresence>
          {showAdminHint && !showAdminPanel && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={toggleAdmin}
              className="absolute bottom-14 right-0 flex items-center gap-2 whitespace-nowrap"
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '0.62rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                background: 'var(--ink-surface)',
                border: '1px solid var(--ink-border-bright)',
                color: 'var(--gold-dim)',
                cursor: 'pointer',
              }}
            >
              <Settings size={11} />
              ADMIN
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          onClick={toggleAdmin}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showAdminPanel ? 'rgba(248,113,113,0.12)' : 'var(--gold)',
            border: showAdminPanel ? '1px solid rgba(248,113,113,0.3)' : 'none',
            color: showAdminPanel ? 'rgb(248,113,113)' : 'var(--ink)',
            borderRadius: 0,
            cursor: 'pointer',
          }}
        >
          {showAdminPanel ? <X size={16} /> : <Settings size={16} />}
        </motion.button>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        isLoading={isLoading}
      />

      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        projects={projects}
        onUpdateProjects={handleUpdateProjects}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        onLogout={handleLogout}
        token={token}
      />
    </div>
  );
}

export default App;
