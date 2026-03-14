import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { Project, ProjectCategory } from '../types';
import { CATEGORIES } from '../constants';
import { ProjectCard } from './ProjectCard';

interface ProjectsSectionProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  tool: '#c9a84c',
  library: '#7c9e8a',
  website: '#6b8cc4',
  api: '#c4845a',
  game: '#b06ea0',
  other: '#7a7a8a',
};

export function ProjectsSection({ projects, onProjectClick }: ProjectsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('all');

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.viewCount - a.viewCount;
    });
  }, [projects, searchQuery, selectedCategory]);

  return (
    <section id="projects" className="relative py-28 grid-bg" style={{ borderTop: '1px solid var(--ink-border)' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="section-number mb-4">[ 02 ] &nbsp; WORKS</div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(2.2rem, 5vw, 4rem)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ color: 'var(--text-primary)' }}>我的</span>
              <span className="text-gold-gradient">项目</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '320px', lineHeight: 1.6 }}>
              精心打造的各种实用工具和有趣项目，持续更新中。
            </p>
          </div>
          <div className="line-gold mt-8" />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-4 mb-10"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: searchQuery ? '32px' : '12px',
                paddingTop: '9px',
                paddingBottom: '9px',
                background: 'var(--ink-surface)',
                border: '1px solid var(--ink-border)',
                borderRadius: 0,
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-dim)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '0.62rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '7px 14px',
                borderRadius: 0,
                background: selectedCategory === 'all' ? 'var(--gold)' : 'transparent',
                color: selectedCategory === 'all' ? 'var(--ink)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: selectedCategory === 'all' ? 'var(--gold)' : 'var(--ink-border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              ALL
            </button>
            {CATEGORIES.map(category => {
              const active = selectedCategory === category.id;
              const color = CATEGORY_COLORS[category.id] || '#7a7a8a';
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '0.62rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '7px 14px',
                    borderRadius: 0,
                    background: active ? `${color}20` : 'transparent',
                    color: active ? color : 'var(--text-secondary)',
                    border: `1px solid`,
                    borderColor: active ? color : 'var(--ink-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="cat-dot" style={{ background: color, width: '5px', height: '5px', opacity: active ? 1 : 0.4 }} />
                  {category.name}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Result count */}
        <div className="mb-6" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--text-dim)' }}>
          SHOWING {filteredProjects.length} / {projects.length} PROJECTS
        </div>

        {/* Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px"
          style={{ background: 'var(--ink-border)' }}>
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                onProjectClick={onProjectClick}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredProjects.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20"
            style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
            // NO RESULTS FOUND
          </motion.div>
        )}
      </div>
    </section>
  );
}
