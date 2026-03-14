import { motion } from 'framer-motion';
import { ExternalLink, Pin, Eye, Calendar, Box, type LucideIcon } from 'lucide-react';
import type { Project } from '../types';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  index: number;
  onProjectClick: (project: Project) => void;
}

export function ProjectCard({ project, index, onProjectClick }: ProjectCardProps) {
  const category = CATEGORIES.find(c => c.id === project.category);
  const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[project.icon] || Box;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      <motion.div
        className="relative h-full glass rounded-2xl p-6 card-hover cursor-pointer overflow-hidden"
        onClick={() => onProjectClick(project)}
        whileHover={{ borderColor: 'rgba(99, 102, 241, 0.5)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {project.isPinned && (
          <motion.div
            className="absolute top-4 right-4"
            initial={{ rotate: -45 }}
            whileHover={{ rotate: 0, scale: 1.2 }}
          >
            <Pin className="w-4 h-4 text-amber-400 fill-amber-400" />
          </motion.div>
        )}
        
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <motion.div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category?.color || 'from-slate-500 to-slate-600'} flex items-center justify-center shrink-0`}
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.4 }}
            >
              <IconComponent className="w-7 h-7 text-white" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-gradient transition-all">
                {project.name}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/10 text-slate-300">
                {category?.name || '其他'}
              </span>
            </div>
          </div>
          
          <p className="text-slate-400 text-sm mb-4 line-clamp-2 leading-relaxed">
            {project.description}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {project.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-1 rounded-lg text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {project.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(project.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            
            <motion.a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              onClick={e => e.stopPropagation()}
              whileHover={{ x: 3 }}
            >
              访问
              <ExternalLink className="w-3.5 h-3.5" />
            </motion.a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
