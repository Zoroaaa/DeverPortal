import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Github, Mail, Menu, X } from 'lucide-react';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: '项目', href: '#projects', en: 'WORKS' },
    { label: '关于', href: '#about', en: 'ABOUT' },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled ? 'rgba(10,10,11,0.92)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--ink-border)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center"
              style={{ border: '1px solid var(--gold-dim)' }}>
              <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--gold)', fontWeight: 500, fontSize: '0.9rem' }}>Z</span>
              <div className="absolute -top-px -left-px w-2 h-2"
                style={{ borderTop: '1px solid var(--gold)', borderLeft: '1px solid var(--gold)' }} />
              <div className="absolute -bottom-px -right-px w-2 h-2"
                style={{ borderBottom: '1px solid var(--gold)', borderRight: '1px solid var(--gold)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>ZORO</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>DEV</div>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link, i) => (
              <motion.a
                key={link.en}
                href={link.href}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                className="underline-gold"
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '0.68rem',
                  letterSpacing: '0.2em',
                  color: 'var(--text-secondary)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {link.en}
              </motion.a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <motion.a
              href="https://github.com/zoro"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <Github size={16} />
            </motion.a>
            <motion.a
              href="mailto:zoro@example.com"
              whileHover={{ scale: 1.1 }}
              style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <Mail size={16} />
            </motion.a>
            <div style={{ width: '1px', height: '16px', background: 'var(--ink-border)' }} />
            <motion.a
              href="#projects"
              className="btn-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ padding: '7px 16px', borderRadius: 0 }}
            >
              探索项目
            </motion.a>
            <button
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ color: 'var(--text-secondary)' }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-16 left-0 right-0 z-40"
          style={{ background: 'var(--ink-surface)', borderBottom: '1px solid var(--ink-border)' }}
        >
          {navLinks.map(link => (
            <a
              key={link.en}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-6 py-4"
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--ink-border)',
              }}
            >
              {link.en} / {link.label}
            </a>
          ))}
        </motion.div>
      )}
    </>
  );
}
