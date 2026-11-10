import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, Edit2, Save, Pin, LogOut,
  Settings, FolderOpen, BarChart2, Key,
  ExternalLink, Github, Eye, Star,
  ChevronLeft, Box, type LucideIcon
} from 'lucide-react';
import type { Project, ProjectCategory, SiteConfig } from '../types';
import { CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onUpdateProjects: (projects: Project[]) => void;
  config: SiteConfig;
  onUpdateConfig: (config: SiteConfig) => void;
  onLogout: () => void;
  token: string | null;
}

type Tab = 'projects' | 'config' | 'stats';

const EMPTY_PROJECT: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'> = {
  name: '', description: '', demoUrl: '', repoUrl: '', icon: 'Box',
  category: 'tool', tags: [], isPinned: false,
};

/* ── Shared input style ─────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--ink-raised)', border: '1px solid var(--ink-border)',
  borderRadius: 0, color: 'var(--text-primary)',
  fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'JetBrains Mono', fontSize: '0.6rem',
  letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-dim)',
  marginBottom: '6px',
};

/* ── Field component ────────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export function AdminPanel({
  isOpen, onClose, projects, onUpdateProjects,
  config, onUpdateConfig, onLogout, token,
}: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('projects');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_PROJECT);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  // Config editing state
  const [configForm, setConfigForm] = useState<SiteConfig>(config);
  const [taglineInput, setTaglineInput] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  useEffect(() => { setConfigForm(config); }, [config]);

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name, description: editingProject.description,
        demoUrl: editingProject.demoUrl, repoUrl: editingProject.repoUrl ?? '',
        icon: editingProject.icon, category: editingProject.category,
        tags: editingProject.tags, isPinned: editingProject.isPinned,
      });
    } else { setFormData(EMPTY_PROJECT); }
  }, [editingProject]);

  const resetForm = () => { setEditingProject(null); setIsCreating(false); setFormData(EMPTY_PROJECT); setTagInput(''); };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.demoUrl.trim()) return;
    setSaveStatus('saving');
    const now = new Date().toISOString();
    let updated: Project[];
    if (isCreating) {
      const np: Project = { ...formData, id: Date.now().toString(36) + Math.random().toString(36).slice(2), createdAt: now, updatedAt: now, viewCount: 0 };
      updated = [...projects, np];
    } else if (editingProject) {
      updated = projects.map(p => p.id === editingProject.id ? { ...p, ...formData, updatedAt: now } : p);
    } else { setSaveStatus('idle'); return; }
    await onUpdateProjects(updated);
    setSaveStatus('ok');
    setTimeout(() => { setSaveStatus('idle'); resetForm(); }, 800);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个项目吗？')) return;
    await onUpdateProjects(projects.filter(p => p.id !== id));
  };

  const handleTogglePin = async (id: string) => {
    const updated = projects.map(p => p.id === id ? { ...p, isPinned: !p.isPinned, updatedAt: new Date().toISOString() } : p);
    await onUpdateProjects(updated);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    await onUpdateConfig(configForm);
    setSaveStatus('ok');
    setTimeout(() => setSaveStatus('idle'), 1200);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { setPwStatus('err'); return; }
    setPwStatus('saving');
    try {
      const res = await fetch('/api/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      const j = await res.json() as { success: boolean };
      if (j.success) { setPwStatus('ok'); setNewPassword(''); setTimeout(() => { setPwStatus('idle'); onLogout(); }, 1500); }
      else setPwStatus('err');
    } catch { setPwStatus('err'); }
  };

  const iconList = Object.keys(Icons).filter(k => typeof (Icons as Record<string, unknown>)[k] === 'function' && k[0] === k[0].toUpperCase() && !k.includes('Icon')).slice(0, 80);

  const tabs: { id: Tab; icon: typeof Settings; label: string }[] = [
    { id: 'projects', icon: FolderOpen, label: 'PROJECTS' },
    { id: 'config',   icon: Settings,   label: 'SITE CONFIG' },
    { id: 'stats',    icon: BarChart2,  label: 'STATS' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'var(--ink)', fontFamily: 'Syne, Noto Sans SC, sans-serif' }}
        >
          <div className="min-h-screen">
            {/* Top bar */}
            <div style={{ borderBottom: '1px solid var(--ink-border)', background: 'var(--ink-mid)', position: 'sticky', top: 0, zIndex: 10 }}>
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={onClose} className="flex items-center gap-2"
                    style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                    <ChevronLeft size={14} /> BACK
                  </button>
                  <div style={{ width: 1, height: 16, background: 'var(--ink-border)' }} />
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--gold-dim)' }}>
                    ADMIN PANEL
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex items-center gap-2"
                      style={{
                        fontFamily: 'JetBrains Mono', fontSize: '0.62rem', letterSpacing: '0.1em',
                        padding: '7px 14px', borderRadius: 0, transition: 'all 0.2s',
                        background: tab === t.id ? 'var(--gold)' : 'transparent',
                        color: tab === t.id ? 'var(--ink)' : 'var(--text-secondary)',
                        border: `1px solid ${tab === t.id ? 'var(--gold)' : 'var(--ink-border)'}`,
                        cursor: 'pointer',
                      }}>
                      <t.icon size={11} /> {t.label}
                    </button>
                  ))}
                  <button onClick={onLogout} className="flex items-center gap-2"
                    style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', letterSpacing: '0.1em', padding: '7px 14px', border: '1px solid var(--ink-border)', color: 'var(--text-dim)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f87171'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'; }}>
                    <LogOut size={11} /> LOGOUT
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-10">
              <AnimatePresence mode="wait">
                {/* ── TAB: PROJECTS ────────────────────────────────────────── */}
                {tab === 'projects' && (
                  <motion.div key="projects" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <div className="section-number mb-2">PROJECTS MANAGEMENT</div>
                        <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                          {projects.length} 个项目
                        </h2>
                      </div>
                      {!isCreating && !editingProject && (
                        <button onClick={() => { setIsCreating(true); setFormData(EMPTY_PROJECT); }}
                          className="btn-primary flex items-center gap-2"
                          style={{ padding: '10px 20px', borderRadius: 0, border: 'none', cursor: 'pointer' }}>
                          <Plus size={13} /> ADD PROJECT
                        </button>
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      {(isCreating || editingProject) ? (
                        /* ─ Form ─ */
                        <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                          className="corner-mark p-8"
                          style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border-bright)' }}>
                          <div className="flex items-center justify-between mb-8">
                            <div className="section-number">{isCreating ? '// NEW PROJECT' : '// EDIT PROJECT'}</div>
                            <button onClick={resetForm} style={{ color: 'var(--text-dim)', transition: 'color 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                              <X size={16} />
                            </button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Left column */}
                            <div className="space-y-5">
                              <Field label="项目名称 *">
                                <input style={inputStyle} value={formData.name} placeholder="My Awesome Tool"
                                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                              </Field>
                              <Field label="演示地址 *">
                                <input style={inputStyle} type="url" value={formData.demoUrl} placeholder="https://demo.example.com"
                                  onChange={e => setFormData({ ...formData, demoUrl: e.target.value })}
                                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                              </Field>
                              <Field label="GitHub 仓库地址">
                                <input style={inputStyle} type="url" value={formData.repoUrl ?? ''} placeholder="https://github.com/user/repo"
                                  onChange={e => setFormData({ ...formData, repoUrl: e.target.value })}
                                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                              </Field>
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="分类">
                                  <select style={inputStyle} value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as ProjectCategory })}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                </Field>
                                <Field label="图标">
                                  <select style={inputStyle} value={formData.icon}
                                    onChange={e => setFormData({ ...formData, icon: e.target.value })}>
                                    {iconList.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                  </select>
                                </Field>
                              </div>
                            </div>

                            {/* Right column */}
                            <div className="space-y-5">
                              <Field label="描述">
                                <textarea style={{ ...inputStyle, resize: 'none' }} rows={4} value={formData.description}
                                  placeholder="简要描述项目功能..."
                                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                              </Field>
                              <Field label="标签（回车添加）">
                                <div className="flex gap-2 mb-2">
                                  <input style={{ ...inputStyle, flex: 1 }} value={tagInput}
                                    placeholder="输入标签..."
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                                  <button onClick={handleAddTag} className="btn-primary"
                                    style={{ padding: '9px 14px', borderRadius: 0, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                                    ADD
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.tags.map(tag => (
                                    <span key={tag} className="tag-chip flex items-center gap-1" style={{ padding: '3px 8px' }}>
                                      {tag}
                                      <button onClick={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}
                                        style={{ color: 'var(--text-dim)', lineHeight: 1 }}>
                                        <X size={9} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </Field>
                              <button onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  fontFamily: 'JetBrains Mono', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                                  padding: '8px 14px', border: `1px solid ${formData.isPinned ? 'var(--gold)' : 'var(--ink-border)'}`,
                                  background: formData.isPinned ? 'rgba(201,168,76,0.08)' : 'transparent',
                                  color: formData.isPinned ? 'var(--gold)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                                }}>
                                <Pin size={11} fill={formData.isPinned ? 'currentColor' : 'none'} />
                                {formData.isPinned ? 'PINNED' : 'PIN PROJECT'}
                              </button>
                            </div>
                          </div>

                          <div style={{ borderTop: '1px solid var(--ink-border)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={resetForm} className="btn-ghost" style={{ padding: '10px 24px', borderRadius: 0, cursor: 'pointer' }}>
                              CANCEL
                            </button>
                            <button onClick={handleSave} className="btn-primary flex items-center gap-2"
                              style={{ padding: '10px 24px', borderRadius: 0, border: 'none', cursor: 'pointer' }}>
                              <Save size={13} />
                              {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'ok' ? 'SAVED ✓' : 'SAVE'}
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        /* ─ List ─ */
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="space-y-px" style={{ background: 'var(--ink-border)' }}>
                          {projects.map((project, idx) => {
                            const cat = CATEGORIES.find(c => c.id === project.category);
                            const IconComp = (Icons as unknown as Record<string, LucideIcon>)[project.icon] || Box;
                            return (
                              <motion.div key={project.id}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                style={{ background: 'var(--ink-surface)', display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px' }}>
                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-dim)', minWidth: 28 }}>
                                  #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink-raised)', border: '1px solid var(--ink-border)', flexShrink: 0 }}>
                                  <IconComp size={15} style={{ color: 'var(--gold-dim)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{project.name}</span>
                                    {project.isPinned && <Pin size={10} style={{ color: 'var(--gold)', fill: 'var(--gold)', flexShrink: 0 }} />}
                                  </div>
                                  <div className="flex items-center gap-4" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                                    <span style={{ color: 'var(--gold-dim)' }}>{cat?.name}</span>
                                    <span className="flex items-center gap-1"><Eye size={9} /> {project.viewCount}</span>
                                    {project.githubStars !== undefined && <span className="flex items-center gap-1"><Star size={9} /> {project.githubStars}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {project.repoUrl && (
                                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer"
                                      style={{ padding: '6px', color: 'var(--text-dim)', transition: 'color 0.2s' }}
                                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                                      <Github size={13} />
                                    </a>
                                  )}
                                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ padding: '6px', color: 'var(--text-dim)', transition: 'color 0.2s' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                                    <ExternalLink size={13} />
                                  </a>
                                  <button onClick={() => handleTogglePin(project.id)}
                                    style={{ padding: '6px', color: project.isPinned ? 'var(--gold)' : 'var(--text-dim)', transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <Pin size={13} fill={project.isPinned ? 'currentColor' : 'none'} />
                                  </button>
                                  <button onClick={() => setEditingProject(project)}
                                    style={{ padding: '6px', color: 'var(--text-dim)', transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                                    <Edit2 size={13} />
                                  </button>
                                  <button onClick={() => handleDelete(project.id)}
                                    style={{ padding: '6px', color: 'var(--text-dim)', transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                          {projects.length === 0 && (
                            <div style={{ background: 'var(--ink-surface)', padding: '4rem', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                              // NO PROJECTS — CLICK "ADD PROJECT" TO START
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ── TAB: SITE CONFIG ─────────────────────────────────────── */}
                {tab === 'config' && (
                  <motion.div key="config" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                    <div className="mb-8">
                      <div className="section-number mb-2">SITE CONFIGURATION</div>
                      <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                        网站配置
                      </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Personal info */}
                      <div className="p-8 space-y-5" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
                        <div className="section-number mb-2">// PERSONAL INFO</div>
                        <Field label="姓名 / Name">
                          <input style={inputStyle} value={configForm.ownerName}
                            onChange={e => setConfigForm({ ...configForm, ownerName: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        <Field label="职位 / Title">
                          <input style={inputStyle} value={configForm.ownerTitle}
                            onChange={e => setConfigForm({ ...configForm, ownerTitle: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        <Field label="地点 / Location">
                          <input style={inputStyle} value={configForm.location}
                            onChange={e => setConfigForm({ ...configForm, location: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        <Field label="个人简介 / Bio">
                          <textarea style={{ ...inputStyle, resize: 'none' }} rows={4} value={configForm.ownerBio}
                            onChange={e => setConfigForm({ ...configForm, ownerBio: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label style={{ ...labelStyle, marginBottom: 0 }}>AVAILABLE FOR WORK</label>
                          <button
                            onClick={() => setConfigForm({ ...configForm, availableForWork: !configForm.availableForWork })}
                            style={{
                              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                              background: configForm.availableForWork ? 'var(--gold)' : 'var(--ink-raised)',
                              position: 'relative', transition: 'background 0.2s',
                            }}>
                            <span style={{
                              position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                              background: configForm.availableForWork ? 'var(--ink)' : 'var(--text-dim)',
                              transition: 'all 0.2s', left: configForm.availableForWork ? 21 : 3,
                            }} />
                          </button>
                        </div>
                      </div>

                      {/* Social links */}
                      <div className="p-8 space-y-5" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
                        <div className="section-number mb-2">// SOCIAL & LINKS</div>
                        <Field label="GitHub 用户名">
                          <input style={inputStyle} value={configForm.githubUsername}
                            onChange={e => setConfigForm({ ...configForm, githubUsername: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        <Field label="Email">
                          <input style={inputStyle} type="email" value={configForm.email}
                            onChange={e => setConfigForm({ ...configForm, email: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        <Field label="Twitter Handle（不含@）">
                          <input style={inputStyle} value={configForm.twitterHandle ?? ''}
                            onChange={e => setConfigForm({ ...configForm, twitterHandle: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        <Field label="Footer 文字">
                          <input style={inputStyle} value={configForm.footerText ?? ''}
                            onChange={e => setConfigForm({ ...configForm, footerText: e.target.value })}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                      </div>

                      {/* Taglines */}
                      <div className="p-8 space-y-4" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
                        <div className="section-number mb-2">// HERO TYPEWRITER LINES</div>
                        <div className="flex gap-2">
                          <input style={{ ...inputStyle, flex: 1 }} value={taglineInput} placeholder="添加一行文字..."
                            onChange={e => setTaglineInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && taglineInput.trim()) { setConfigForm({ ...configForm, heroTaglines: [...(configForm.heroTaglines || []), taglineInput.trim()] }); setTaglineInput(''); } }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                          <button onClick={() => { if (taglineInput.trim()) { setConfigForm({ ...configForm, heroTaglines: [...(configForm.heroTaglines || []), taglineInput.trim()] }); setTaglineInput(''); } }}
                            className="btn-primary" style={{ padding: '9px 16px', borderRadius: 0, border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>
                            ADD
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(configForm.heroTaglines || []).map((line, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--ink-raised)', border: '1px solid var(--ink-border)' }}>
                              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'var(--gold-dim)', minWidth: 20 }}>#{i + 1}</span>
                              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{line}</span>
                              <button onClick={() => setConfigForm({ ...configForm, heroTaglines: configForm.heroTaglines.filter((_, j) => j !== i) })}
                                style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Password change */}
                      <div className="p-8 space-y-5" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
                        <div className="section-number mb-2">// CHANGE PASSWORD</div>
                        <Field label="新密码（至少6位）">
                          <input style={inputStyle} type="password" value={newPassword} placeholder="••••••••"
                            onChange={e => setNewPassword(e.target.value)}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')} />
                        </Field>
                        {pwStatus === 'err' && (
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#f87171' }}>// ERROR: 密码至少6位</div>
                        )}
                        {pwStatus === 'ok' && (
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#4ade80' }}>// OK: 密码已更新，请重新登录</div>
                        )}
                        <button onClick={handleChangePassword} className="flex items-center gap-2"
                          style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 20px', border: '1px solid var(--ink-border-bright)', color: 'var(--gold)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <Key size={12} />
                          {pwStatus === 'saving' ? 'SAVING...' : 'UPDATE PASSWORD'}
                        </button>
                      </div>
                    </div>

                    {/* Save config button */}
                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={handleSaveConfig} className="btn-primary flex items-center gap-2"
                        style={{ padding: '12px 32px', borderRadius: 0, border: 'none', cursor: 'pointer' }}>
                        <Save size={14} />
                        {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'ok' ? 'SAVED ✓' : 'SAVE CONFIG'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── TAB: STATS ───────────────────────────────────────────── */}
                {tab === 'stats' && (
                  <motion.div key="stats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                    <div className="mb-8">
                      <div className="section-number mb-2">OVERVIEW</div>
                      <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)' }}>统计概览</h2>
                    </div>

                    {/* Overview cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-8" style={{ background: 'var(--ink-border)' }}>
                      {[
                        { label: 'TOTAL PROJECTS', value: projects.length },
                        { label: 'PINNED', value: projects.filter(p => p.isPinned).length },
                        { label: 'TOTAL VIEWS', value: projects.reduce((s, p) => s + p.viewCount, 0).toLocaleString() },
                        { label: 'CATEGORIES', value: new Set(projects.map(p => p.category)).size },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'var(--ink-surface)', padding: '1.5rem' }}>
                          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '2rem', color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--gold-dim)', marginTop: '6px', letterSpacing: '0.12em' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Projects ranked by views */}
                    <div style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)', padding: '2rem' }}>
                      <div className="section-number mb-5">PROJECTS BY VIEWS</div>
                      <div className="space-y-4">
                        {[...projects].sort((a, b) => b.viewCount - a.viewCount).map((p, i) => {
                          const maxViews = Math.max(...projects.map(x => x.viewCount), 1);
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: 'var(--text-dim)', minWidth: 20 }}>#{i + 1}</span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: 160, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                              <div style={{ flex: 1, height: 1, background: 'var(--ink-raised)', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(p.viewCount / maxViews) * 100}%`, background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))' }} />
                              </div>
                              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'var(--gold-dim)', minWidth: 50, textAlign: 'right' }}>{p.viewCount.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
