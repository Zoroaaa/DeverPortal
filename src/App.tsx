import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import {
  ParticleBackground,
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
      prev.map(p => 
        p.id === project.id 
          ? { ...p, viewCount: p.viewCount + 1 }
          : p
      )
    );
    window.open(project.url, '_blank');
  }, [setProjects]);

  const handleLogin = useCallback(async (password: string) => {
    const success = await login(password);
    if (success) {
      setShowAdminPanel(true);
    }
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
    <div className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <ParticleBackground />
      
      <Header />
      
      <main className="relative z-10">
        <HeroSection />
        <ProjectsSection 
          projects={projects} 
          onProjectClick={handleProjectClick}
        />
        <AboutSection />
      </main>
      
      <Footer />
      
      <div
        className="fixed bottom-6 right-6 z-40"
        onMouseEnter={() => setShowAdminButton(true)}
        onMouseLeave={() => setShowAdminButton(false)}
      >
        <AnimatePresence>
          {showAdminButton && !showAdminPanel && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              onClick={() => {
                if (isAuthenticated) {
                  setShowAdminPanel(true);
                } else {
                  setShowLoginModal(true);
                }
              }}
              className="absolute bottom-16 right-0 flex items-center gap-2 px-4 py-2 rounded-xl glass text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <Settings className="w-4 h-4" />
              管理面板
            </motion.button>
          )}
        </AnimatePresence>
        
        <motion.button
          onClick={() => {
            if (showAdminPanel) {
              setShowAdminPanel(false);
            } else if (isAuthenticated) {
              setShowAdminPanel(true);
            } else {
              setShowLoginModal(true);
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            showAdminPanel
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {showAdminPanel ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
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
