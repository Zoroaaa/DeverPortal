import { motion } from 'framer-motion';
import { ExternalLink, Github, Pin, Eye, Star, GitFork, type LucideIcon, Box } from 'lucide-react';
import type { Project } from '../types';
import { CATEGORIES } from '../constants';
import { useRepoStats, parseRepoPath } from '../hooks';
import * as Icons from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  index: number;
  onProjectClick: (project: Project) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  tool:    '#c9a84c',
  library: '#7c9e8a',
  website: '#6b8cc4',
  api:     '#c4845a',
  game:    '#b06ea0',
  other:   '#7a7a8a',
};

export function ProjectCard({ project, index, onProjectClick }: ProjectCardProps) {
  const category = CATEGORIES.find(c => c.id === project.category);
  const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[project.icon] || Box;
  const catColor = CATEGORY_COLORS[project.category] || '#7a7a8a';
  const paddedIndex = String(index + 1).padStart(2, '0');

  // Real-time GitHub stats from repoUrl
  const repoPath = parseRepoPath(project.repoUrl);
  const { stats } = useRepoStats(repoPath);

  // Use live stats or fall back to stored values
  const stars = stats?.stars ?? project.githubStars;
  const forks = stats?.forks ?? project.githubForks;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="group relative corner-mark"
      style={{
        background: 'var(--ink-surface)',
        border: '1px solid var(--ink-border)',
        cursor: 'pointer',
        transition: 'border-color 0.25s ease, background 0.25s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border-bright)';
        (e.currentTarget as HTMLElement).style.background = 'var(--ink-raised)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)';
        (e.currentTarget as HTMLElement).style.background = 'var(--ink-surface)';
      }}
      onClick={() => onProjectClick(project)}
    >
      <div className="p-6">
        {/* Top row */}
        <div className="flex items-center justify-between mb-5">
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--text-dim)' }}>
            #{paddedIndex}
          </span>
          <div className="flex items-center gap-2">
            {project.isPinned && <Pin size={10} style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />}
            <span className="cat-dot" style={{ background: catColor, opacity: 0.8, width: 6, height: 6, borderRadius: 1 }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: catColor, opacity: 0.8 }}>
              {category?.name || '其他'}
            </span>
          </div>
        </div>

        {/* Icon + name */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
            style={{ background: `${catColor}12`, border: `1px solid ${catColor}28` }}>
            <IconComponent size={17} style={{ color: catColor }} />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1.3, paddingTop: '4px' }}>
            {project.name}
          </h3>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.81rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ borderTop: '1px solid var(--ink-border)', paddingTop: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Eye size={9} /> {project.viewCount.toLocaleString()}
            </span>
            {stars !== undefined && (
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--gold-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Star size={9} /> {stars.toLocaleString()}
              </span>
            )}
            {forks !== undefined && (
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <GitFork size={9} /> {forks}
              </span>
            )}
          </div>

          {/* Action links */}
          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
            {project.repoUrl && (
              <motion.a href={project.repoUrl} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.15 }}
                style={{ color: 'var(--text-dim)', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                <Github size={13} />
              </motion.a>
            )}
            <motion.a href={project.demoUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1"
              whileHover={{ x: 2 }}
              style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-dim)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}>
              DEMO <ExternalLink size={9} />
            </motion.a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
