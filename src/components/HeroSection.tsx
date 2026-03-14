import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Terminal } from 'lucide-react';

const TITLES = ['全栈开发者', '开源爱好者', '工具制造者', 'Cloudflare Dev'];

export function HeroSection() {
  const [titleIndex, setTitleIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const target = TITLES[titleIndex];
    if (typing) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 80);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 2000);
        return () => clearTimeout(t);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
        return () => clearTimeout(t);
      } else {
        setTitleIndex((i) => (i + 1) % TITLES.length);
        setTyping(true);
      }
    }
  }, [displayed, typing, titleIndex]);

  return (
    <section id="hero" className="relative min-h-screen flex items-center grid-bg" style={{ paddingTop: '80px' }}>
      {/* Large background index text */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none overflow-hidden"
        style={{ right: '-2rem' }}>
        <div style={{
          fontFamily: 'Syne',
          fontWeight: 800,
          fontSize: 'clamp(8rem, 20vw, 22rem)',
          color: 'transparent',
          WebkitTextStroke: '1px rgba(201,168,76,0.04)',
          letterSpacing: '-0.05em',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          ZORO
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="max-w-3xl">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="flex items-center gap-2" style={{
              border: '1px solid var(--ink-border-bright)',
              padding: '6px 14px',
              borderRadius: 0,
            }}>
              <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 6px #4ade80' }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                AVAILABLE FOR WORK
              </span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
              // Tokyo, JP
            </div>
          </motion.div>

          {/* Main name */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="section-number mb-3">[ 01 ] &nbsp; INTRODUCTION</div>
            <h1 style={{
              fontFamily: 'Syne',
              fontWeight: 800,
              fontSize: 'clamp(3.5rem, 10vw, 8rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: '0.25em',
            }}>
              Hi, I'm<br />
              <span className="text-gold-gradient">Zoro</span>
            </h1>
          </motion.div>

          {/* Typewriter role */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 mb-8"
          >
            <Terminal size={14} style={{ color: 'var(--gold-dim)' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {displayed}
            </span>
            <span className="cursor-blink" />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '480px', marginBottom: '3rem' }}
          >
            创造各种实用的小工具，希望能帮助你提升效率、解决问题。
            每一个项目都是一次认真的尝试。
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="flex flex-wrap gap-4 mb-20"
          >
            <motion.a href="#projects" className="btn-primary" whileTap={{ scale: 0.97 }}
              style={{ padding: '13px 32px', borderRadius: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>探索项目</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', opacity: 0.6 }}>↓</span>
            </motion.a>
            <motion.a href="https://github.com/zoro" target="_blank" rel="noopener noreferrer"
              className="btn-ghost" whileTap={{ scale: 0.97 }}
              style={{ padding: '13px 32px', borderRadius: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              GitHub
            </motion.a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-wrap gap-8"
            style={{ borderTop: '1px solid var(--ink-border)', paddingTop: '2rem' }}
          >
            {[
              { value: '10+', label: 'PROJECTS', en: '项目' },
              { value: '100K+', label: 'LINES OF CODE', en: '代码行' },
              { value: '50+', label: 'COUNTRIES', en: '国家访问' },
              { value: '100+', label: 'GITHUB STARS', en: 'Stars' },
            ].map((stat, i) => (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.08 }}
              >
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.75rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginTop: '4px', textTransform: 'uppercase' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--text-dim)' }}>SCROLL</div>
        <ArrowDown size={12} style={{ color: 'var(--gold-dim)' }} />
      </motion.div>
    </section>
  );
}
