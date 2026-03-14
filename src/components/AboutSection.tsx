import { motion } from 'framer-motion';
import { Github, ExternalLink } from 'lucide-react';
import type { SiteConfig } from '../types';
import { useGithubStats } from '../hooks';

interface AboutSectionProps {
  config: SiteConfig;
}

export function AboutSection({ config }: AboutSectionProps) {
  const { stats } = useGithubStats(config.githubUsername);

  // Language bars from live GitHub data
  const languages = stats?.languages ?? [];
  const maxLangCount = Math.max(...languages.map(l => l.bytes), 1);

  const aboutStats = [
    { value: '1000+', label: 'CUPS OF COFFEE' },
    { value: stats ? `${stats.totalRepos}` : '—', label: 'REPOSITORIES' },
    { value: stats ? `${stats.totalStars}` : '—', label: 'GITHUB STARS' },
    { value: '50+', label: 'COUNTRIES' },
  ];

  return (
    <section id="about" className="relative py-28" style={{ borderTop: '1px solid var(--ink-border)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <div className="section-number mb-4">[ 03 ] &nbsp; ABOUT</div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(2.2rem, 5vw, 4rem)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: 'var(--text-primary)' }}>关于</span>
            <span className="text-gold-gradient">我</span>
          </h2>
          <div className="line-gold mt-8" />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Bio + stats */}
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-8">
            <div className="corner-mark p-8 relative" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
              <div className="section-number mb-5">BIO.MD</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.92rem' }}>
                {config.ownerBio}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--ink-border)' }}>
              {aboutStats.map((stat, i) => (
                <motion.div key={stat.label}
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }} className="p-6" style={{ background: 'var(--ink-surface)' }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.75rem', color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', marginTop: '6px', textTransform: 'uppercase' }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <motion.a href={`https://github.com/${config.githubUsername}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-5 group"
              style={{ border: '1px solid var(--ink-border-bright)', transition: 'border-color 0.2s' }}
              whileHover={{ borderColor: 'var(--gold)' } as never}>
              <div className="flex items-center gap-4">
                <Github size={20} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>在 GitHub 上关注我</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '2px' }}>github.com/{config.githubUsername}</div>
                </div>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--gold-dim)' }} />
            </motion.a>
          </motion.div>

          {/* Right: Language stats (live) */}
          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-8">
            <div className="p-8" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="section-number">LANGUAGES</div>
                {stats && (
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                    // from github · live
                  </span>
                )}
              </div>
              {languages.length > 0 ? (
                <div className="space-y-5">
                  {languages.map((lang, i) => (
                    <motion.div key={lang.name}
                      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                      transition={{ delay: i * 0.07 }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: lang.color, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{lang.name}</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'var(--gold-dim)' }}>
                          {Math.round((lang.bytes / maxLangCount) * 100)}%
                        </span>
                      </div>
                      <div className="skill-bar-track">
                        <motion.div className="skill-bar-fill"
                          style={{ background: `linear-gradient(90deg, ${lang.color}88, ${lang.color})` }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(lang.bytes / maxLangCount) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeOut' }} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                  // loading language data...
                </div>
              )}
            </div>

            {/* Contact info */}
            <div className="p-8" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
              <div className="section-number mb-5">CONTACT</div>
              <div className="space-y-3">
                {config.email && (
                  <a href={`mailto:${config.email}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                    <span style={{ color: 'var(--gold-dim)', fontSize: '0.62rem', letterSpacing: '0.1em', minWidth: 60 }}>EMAIL</span>
                    {config.email}
                  </a>
                )}
                {config.githubUsername && (
                  <a href={`https://github.com/${config.githubUsername}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                    <span style={{ color: 'var(--gold-dim)', fontSize: '0.62rem', letterSpacing: '0.1em', minWidth: 60 }}>GITHUB</span>
                    @{config.githubUsername}
                  </a>
                )}
                {config.twitterHandle && (
                  <a href={`https://twitter.com/${config.twitterHandle}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                    <span style={{ color: 'var(--gold-dim)', fontSize: '0.62rem', letterSpacing: '0.1em', minWidth: 60 }}>TWITTER</span>
                    @{config.twitterHandle}
                  </a>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--gold-dim)', fontSize: '0.62rem', letterSpacing: '0.1em', minWidth: 60 }}>LOCATION</span>
                  {config.location}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
