import { motion } from 'framer-motion';
import { Github, Twitter, Mail, ArrowUp } from 'lucide-react';
import type { SiteConfig } from '../types';

interface FooterProps {
  config: SiteConfig;
}

export function Footer({ config }: FooterProps) {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const socials = [
    config.githubUsername && { icon: Github, href: `https://github.com/${config.githubUsername}`, label: 'GitHub' },
    config.twitterHandle  && { icon: Twitter, href: `https://twitter.com/${config.twitterHandle}`, label: 'Twitter' },
    config.email          && { icon: Mail,    href: `mailto:${config.email}`,                       label: 'Email' },
  ].filter(Boolean) as { icon: typeof Github; href: string; label: string }[];

  return (
    <footer className="relative" style={{ borderTop: '1px solid var(--ink-border)', background: 'var(--ink-mid)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-14">
          {/* Brand */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-8 h-8 flex items-center justify-center"
                style={{ border: '1px solid var(--gold-dim)' }}>
                <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--gold)', fontWeight: 500 }}>
                  {config.ownerName[0]?.toUpperCase() ?? 'Z'}
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {config.ownerName.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>DEV</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.7 }}>
              {config.footerText || config.ownerBio.slice(0, 80)}
            </p>
          </motion.div>

          {/* Links */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}>
            <div className="section-number mb-5">NAVIGATION</div>
            <ul className="space-y-3">
              {[
                { label: '首页 / HOME',   href: '#hero' },
                { label: '项目 / WORKS',  href: '#projects' },
                { label: '关于 / ABOUT',  href: '#about' },
              ].map(link => (
                <li key={link.label}>
                  <a href={link.href} className="underline-gold"
                    style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', letterSpacing: '0.08em', color: 'var(--text-secondary)', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Social */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.16 }}>
            <div className="section-number mb-5">CONNECT</div>
            <div className="flex gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  title={label}
                  className="flex items-center justify-center"
                  style={{ width: 36, height: 36, border: '1px solid var(--ink-border)', color: 'var(--text-secondary)', transition: 'all 0.2s' }}
                  whileHover={{ scale: 1.08 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-dim)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
                  <Icon size={14} />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="line-gold mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
            © {new Date().getFullYear()} {config.ownerName.toUpperCase()} &nbsp;·&nbsp; ALL RIGHTS RESERVED
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
            BUILT WITH REACT + CLOUDFLARE
          </div>
          <motion.button onClick={scrollToTop}
            className="flex items-center gap-2"
            style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', transition: 'color 0.2s', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
            whileHover={{ y: -3 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}>
            <ArrowUp size={11} /> BACK TO TOP
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
