import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Edit2, Save, Pin, PinOff, 
  ExternalLink, Eye, Calendar, ArrowLeft, Box, type LucideIcon
} from 'lucide-react';
import type { Project, ProjectCategory } from '../types';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
  onLogout: () => void;
}

const EMPTY_PROJECT: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'> = {
  name: '',
  description: '',
  url: '',
  icon: 'Box',
  category: 'tool',
  tags: [],
  isPinned: false,
};

export function AdminPanel({ isOpen, onClose, projects, onUpdateProjects, onLogout }: AdminPanelProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_PROJECT);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        description: editingProject.description,
        url: editingProject.url,
        icon: editingProject.icon,
        category: editingProject.category,
        tags: editingProject.tags,
        isPinned: editingProject.isPinned,
      });
    } else {
      setFormData(EMPTY_PROJECT);
    }
  }, [editingProject]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      return;
    }

    const now = new Date().toISOString();
    
    if (isCreating) {
      const newProject: Project = {
        ...formData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        viewCount: 0,
      };
      onUpdateProjects([...projects, newProject]);
    } else if (editingProject) {
      const updatedProjects = projects.map(p => 
        p.id === editingProject.id 
          ? { ...p, ...formData, updatedAt: now }
          : p
      );
      onUpdateProjects(updatedProjects);
    }
    
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个项目吗？')) {
      onUpdateProjects(projects.filter(p => p.id !== id));
    }
  };

  const handleTogglePin = (id: string) => {
    const updatedProjects = projects.map(p =>
      p.id === id ? { ...p, isPinned: !p.isPinned, updatedAt: new Date().toISOString() } : p
    );
    onUpdateProjects(updatedProjects);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const resetForm = () => {
    setEditingProject(null);
    setIsCreating(false);
    setFormData(EMPTY_PROJECT);
    setTagInput('');
  };

  const iconList = Object.keys(Icons).filter(key => {
    const Comp = (Icons as Record<string, unknown>)[key];
    return typeof Comp === 'function' && key[0] === key[0].toUpperCase();
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl overflow-y-auto"
        >
          <div className="min-h-screen p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center justify-between mb-8"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl glass text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl font-bold text-white">管理面板</h1>
                </div>
                
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => {
                      setIsCreating(true);
                      setFormData(EMPTY_PROJECT);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4" />
                    新增项目
                  </motion.button>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 rounded-xl glass text-slate-400 hover:text-white transition-colors"
                  >
                    退出登录
                  </button>
                </div>
              </motion.div>
              
              <AnimatePresence mode="wait">
                {(isCreating || editingProject) ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass rounded-2xl p-6 mb-8"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-white">
                        {isCreating ? '新增项目' : '编辑项目'}
                      </h2>
                      <button
                        onClick={resetForm}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">项目名称 *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="输入项目名称"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">项目链接 *</label>
                          <input
                            type="url"
                            value={formData.url}
                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="https://example.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">分类</label>
                          <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value as ProjectCategory })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">图标</label>
                          <select
                            value={formData.icon}
                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          >
                            {iconList.map(icon => (
                              <option key={icon} value={icon}>{icon}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">描述</label>
                          <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                            placeholder="简要描述项目功能..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">标签</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              placeholder="添加标签后按回车"
                            />
                            <button
                              type="button"
                              onClick={handleAddTag}
                              className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                            >
                              添加
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.tags.map(tag => (
                              <span
                                key={tag}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 text-slate-300 text-sm"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="text-slate-500 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                              formData.isPinned
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            {formData.isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
                            {formData.isPinned ? '已置顶' : '置顶'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/5">
                      <button
                        onClick={resetForm}
                        className="px-6 py-2 rounded-xl glass text-slate-400 hover:text-white transition-colors"
                      >
                        取消
                      </button>
                      <motion.button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {projects.map((project, index) => {
                      const category = CATEGORIES.find(c => c.id === project.category);
                      const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[project.icon] || Box;
                      
                      return (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="glass rounded-xl p-4 flex items-center gap-4"
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category?.color || 'from-slate-500 to-slate-600'} flex items-center justify-center shrink-0`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-medium truncate">{project.name}</h3>
                              {project.isPinned && <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {project.viewCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                              </span>
                              <span className="text-indigo-400">{category?.name}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <motion.a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </motion.a>
                            <motion.button
                              onClick={() => handleTogglePin(project.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                project.isPinned
                                  ? 'text-amber-400 hover:bg-amber-500/10'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Pin className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => setEditingProject(project)}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDelete(project.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {projects.length === 0 && (
                      <div className="text-center py-16">
                        <p className="text-slate-500 text-lg">暂无项目，点击上方按钮添加</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
