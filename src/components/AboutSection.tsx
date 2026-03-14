import { motion } from 'framer-motion';
import { Github, ExternalLink } from 'lucide-react';

const skills = [
  { name: 'TypeScript', level: 90, tag: 'TS' },
  { name: 'React', level: 95, tag: 'UI' },
  { name: 'Node.js', level: 85, tag: 'BE' },
  { name: 'Python', level: 80, tag: 'PY' },
  { name: 'Go', level: 70, tag: 'GO' },
  { name: 'Cloudflare Workers', level: 88, tag: 'CF' },
];

const stack = [
  'React', 'TypeScript', 'Vite', 'Tailwind',
  'Hono', 'Cloudflare Workers', 'D1 SQLite', 'KV',
  'Node.js', 'Python', 'Go', 'Git',
];

export function AboutSection() {
  return (
    <section id="about" className="relative py-28" style={{ borderTop: '1px solid var(--ink-border)' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="section-number mb-4">[ 03 ] &nbsp; ABOUT</div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(2.2rem, 5vw, 4rem)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: 'var(--text-primary)' }}>关于</span>
            <span className="text-gold-gradient">我</span>
          </h2>
          <div className="line-gold mt-8" />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Bio */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="corner-mark p-8 relative" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
              <div className="section-number mb-5">BIO.MD</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                你好，我是 <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Zoro</span>！一名热爱技术的全栈开发者。
                我喜欢创造各种实用的小工具，希望能通过这些工具帮助更多人提高效率、解决问题。
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.92rem' }}>
                在工作之余，我热衷于开源社区，喜欢分享知识和经验。
                这个网站是我个人项目的集合，每一个工具都倾注了我的心血。
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--ink-border)' }}>
              {[
                { value: '1000+', label: 'CUPS OF COFFEE', cn: '杯咖啡' },
                { value: '100K+', label: 'LINES OF CODE', cn: '行代码' },
                { value: '10+', label: 'OPEN SOURCE', cn: '开源项目' },
                { value: '50+', label: 'COUNTRIES', cn: '国家访问' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-6"
                  style={{ background: 'var(--ink-surface)' }}
                >
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.75rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', marginTop: '6px', textTransform: 'uppercase' }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* GitHub CTA */}
            <motion.a
              href="https://github.com/zoro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-5 group"
              style={{ border: '1px solid var(--ink-border-bright)', transition: 'all 0.2s' }}
              whileHover={{ borderColor: 'var(--gold)' }}
            >
              <div className="flex items-center gap-4">
                <Github size={20} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>在 GitHub 上关注我</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '2px', letterSpacing: '0.05em' }}>github.com/zoro</div>
                </div>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--gold-dim)', transition: 'color 0.2s' }}
                className="group-hover:text-gold" />
            </motion.a>
          </motion.div>

          {/* Right: Skills */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="p-8" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
              <div className="section-number mb-6">PROFICIENCY</div>
              <div className="space-y-6">
                {skills.map((skill, i) => (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', padding: '1px 5px' }}>
                          {skill.tag}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{skill.name}</span>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'var(--gold-dim)' }}>{skill.level}%</span>
                    </div>
                    <div className="skill-bar-track">
                      <motion.div
                        className="skill-bar-fill"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.level}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tech stack cloud */}
            <div className="p-8" style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)' }}>
              <div className="section-number mb-5">TECH STACK</div>
              <div className="flex flex-wrap gap-2">
                {stack.map((tech, i) => (
                  <motion.span
                    key={tech}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="tag-chip"
                    style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                  >
                    {tech}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
