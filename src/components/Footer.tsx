import { motion } from 'framer-motion';
import { Heart, Github, Twitter, Mail, ArrowUp } from 'lucide-react';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative py-12 px-4 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <span className="text-xl font-bold text-white">Zoro</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              全栈开发者，热爱创造各种实用工具。希望这些小工具能帮助到你！
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="text-white font-semibold mb-4">快速链接</h4>
            <ul className="space-y-2">
              {[
                { label: '首页', href: '#hero' },
                { label: '项目', href: '#projects' },
                { label: '关于', href: '#about' },
              ].map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-500 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="text-white font-semibold mb-4">联系我</h4>
            <div className="flex gap-4">
              {[
                { icon: Github, href: 'https://github.com/zoro' },
                { icon: Twitter, href: 'https://twitter.com/zoro' },
                { icon: Mail, href: 'mailto:zoro@example.com' },
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5">
          <p className="text-slate-500 text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by Zoro
          </p>
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} Zoro. All rights reserved.
          </p>
          <motion.button
            onClick={scrollToTop}
            className="mt-4 sm:mt-0 p-3 rounded-xl glass text-slate-400 hover:text-white transition-colors"
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
