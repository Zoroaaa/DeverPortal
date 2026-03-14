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
import { useLocalStorage, useAdminAuth } from './hooks';
import { DEFAULT_PROJECTS } from './constants';
import type { Project } from './types';

function App() {
  const [projects, setProjects] = useLocalStorage<Project[]>('zoro_projects', DEFAULT_PROJECTS);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);
  const { isAuthenticated, login, logout, isLoading } = useAdminAuth();

  const handleProjectClick = useCallback((project: Project) => {
    setProjects(prev =>
      prev.map(p => p.id === project.id ? { ...p, viewCount: p.viewCount + 1 } : p)
    );
    window.open(project.url, '_blank');
  }, [setProjects]);

  const handleLogin = useCallback(async (password: string) => {
    const success = await login(password);
    if (success) setShowAdminPanel(true);
    return success;
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    setShowAdminPanel(false);
  }, [logout]);

  const handleUpdateProjects = useCallback((newProjects: Project[]) => {
    setProjects(newProjects);
  }, [setProjects]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--ink)', color: 'var(--text-primary)' }}>
      {/* Noise overlay */}
      <div className="noise-overlay" aria-hidden="true" />

      <Header />

      <main>
        <HeroSection />
        <ProjectsSection projects={projects} onProjectClick={handleProjectClick} />
        <AboutSection />
      </main>

      <Footer />

      {/* Admin trigger */}
      <div
        className="fixed bottom-6 right-6 z-40"
        onMouseEnter={() => setShowAdminButton(true)}
        onMouseLeave={() => setShowAdminButton(false)}
      >
        <AnimatePresence>
          {showAdminButton && !showAdminPanel && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={() => isAuthenticated ? setShowAdminPanel(true) : setShowLoginModal(true)}
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
              }}
            >
              <Settings size={11} />
              ADMIN
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => showAdminPanel ? setShowAdminPanel(false) : (isAuthenticated ? setShowAdminPanel(true) : setShowLoginModal(true))}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showAdminPanel ? 'rgba(239,68,68,0.12)' : 'var(--gold)',
            border: showAdminPanel ? '1px solid rgba(239,68,68,0.3)' : 'none',
            color: showAdminPanel ? 'rgb(239,68,68)' : 'var(--ink)',
            borderRadius: 0,
          }}
        >
          {showAdminPanel ? <X size={16} /> : <Settings size={16} />}
        </motion.button>
      </div>

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
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
