import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Terminal, Users, Star, GitFork, BookOpen } from 'lucide-react';
import type { SiteConfig } from '../types';
import { useGithubStats } from '../hooks';

interface HeroSectionProps {
  config: SiteConfig;
}

export function HeroSection({ config }: HeroSectionProps) {
  const [displayed, setDisplayed] = useState('');
  const [titleIndex, setTitleIndex] = useState(0);
  const [typing, setTyping] = useState(true);
  const taglines = useMemo(
    () => config.heroTaglines?.length ? config.heroTaglines : ['全栈开发者'],
    [config.heroTaglines]
  );

  const { stats } = useGithubStats(config.githubUsername);

  useEffect(() => {
    const target = taglines[titleIndex];
    if (typing) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 75);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setTyping(false), 2200);
      return () => clearTimeout(t);
    }
    if (displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 38);
      return () => clearTimeout(t);
    }
    queueMicrotask(() => {
      setTitleIndex(i => (i + 1) % taglines.length);
      setTyping(true);
    });
  }, [displayed, typing, titleIndex, taglines]);

  const heroStats = [
    { icon: Star,     value: stats ? stats.totalStars.toLocaleString()  : '—', label: 'GITHUB STARS' },
    { icon: BookOpen, value: stats ? stats.totalRepos.toString()        : '—', label: 'REPOSITORIES' },
    { icon: GitFork,  value: stats ? stats.totalForks.toLocaleString()  : '—', label: 'TOTAL FORKS' },
    { icon: Users,    value: stats ? stats.followers.toLocaleString()   : '—', label: 'FOLLOWERS' },
  ];

  return (
    <section id="hero" className="relative min-h-screen flex items-center grid-bg" style={{ paddingTop: '80px' }}>
      {/* Ghost background text */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none overflow-hidden" aria-hidden>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(8rem, 20vw, 22rem)', color: 'transparent', WebkitTextStroke: '1px rgba(201,168,76,0.04)', letterSpacing: '-0.05em', lineHeight: 1 }}>
          {config.ownerName.toUpperCase()}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="max-w-3xl">
          {/* Status badge */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-10">
            <div className="flex items-center gap-2"
              style={{ border: '1px solid var(--ink-border-bright)', padding: '6px 14px' }}>
              <div style={{ width: 6, height: 6, background: config.availableForWork ? '#4ade80' : '#f87171', borderRadius: '50%', boxShadow: `0 0 6px ${config.availableForWork ? '#4ade80' : '#f87171'}` }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.63rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                {config.availableForWork ? 'AVAILABLE FOR WORK' : 'NOT AVAILABLE'}
              </span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
              // {config.location}
            </div>
          </motion.div>

          {/* Name */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="section-number mb-3">[ 01 ] &nbsp; INTRODUCTION</div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(3.5rem, 10vw, 8rem)', lineHeight: 0.95, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '0.25em' }}>
              Hi, I'm<br />
              <span className="text-gold-gradient">{config.ownerName}</span>
            </h1>
          </motion.div>

          {/* Typewriter */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="flex items-center gap-2 mb-6">
            <Terminal size={13} style={{ color: 'var(--gold-dim)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {displayed}
            </span>
            <span className="cursor-blink" />
          </motion.div>

          {/* Tagline */}
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }}
            style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75, maxWidth: '480px', marginBottom: '2.5rem' }}>
            {config.ownerBio.slice(0, 100)}{config.ownerBio.length > 100 ? '…' : ''}
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.0 }}
            className="flex flex-wrap gap-4 mb-16">
            <motion.a href="#projects" className="btn-primary" whileTap={{ scale: 0.97 }}
              style={{ padding: '12px 30px', borderRadius: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
              探索项目 <span style={{ opacity: 0.6, fontFamily: 'JetBrains Mono' }}>↓</span>
            </motion.a>
            <motion.a href={`https://github.com/${config.githubUsername}`} target="_blank" rel="noopener noreferrer"
              className="btn-ghost" whileTap={{ scale: 0.97 }}
              style={{ padding: '12px 30px', borderRadius: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
              GitHub
            </motion.a>
          </motion.div>

          {/* Live GitHub stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            style={{ borderTop: '1px solid var(--ink-border)', paddingTop: '2rem' }}>
            <div className="section-number mb-4" style={{ marginBottom: '1rem' }}>
              GITHUB STATS {stats && <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>// live</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {heroStats.map((stat, i) => (
                <motion.div key={stat.label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + i * 0.07 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon size={12} style={{ color: 'var(--gold-dim)' }} />
                    <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.6rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                      {stat.value}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--text-dim)' }}>SCROLL</div>
        <ArrowDown size={12} style={{ color: 'var(--gold-dim)' }} />
      </motion.div>
    </section>
  );
}
