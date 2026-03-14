import { motion } from 'framer-motion';
import { Sparkles, ArrowDown, Code2, Zap, Rocket } from 'lucide-react';

export function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light mb-8"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-slate-300">欢迎来到我的开发者空间</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl sm:text-7xl md:text-8xl font-bold mb-6"
        >
          <span className="text-white">Hi, I'm </span>
          <span className="text-gradient">Zoro</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl sm:text-2xl text-slate-400 mb-8 max-w-2xl mx-auto"
        >
          全栈开发者 / 开源爱好者 / 工具制造者
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-lg text-slate-500 mb-12 max-w-xl mx-auto"
        >
          这里收集了我开发的各种实用工具和有趣项目，希望能帮助你提升效率
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mb-16"
        >
          <motion.a
            href="#projects"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium text-lg flex items-center gap-2"
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Rocket className="w-5 h-5" />
            探索项目
          </motion.a>
          <motion.a
            href="#about"
            className="px-8 py-4 rounded-2xl glass text-white font-medium text-lg flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Code2 className="w-5 h-5" />
            了解更多
          </motion.a>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex justify-center gap-12"
        >
          {[
            { icon: Code2, label: '项目', value: '10+' },
            { icon: Zap, label: '工具', value: '5+' },
            { icon: Rocket, label: 'Star', value: '100+' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <stat.icon className="w-5 h-5 text-indigo-400" />
                <span className="text-3xl font-bold text-white">{stat.value}</span>
              </div>
              <span className="text-slate-500 text-sm">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
      
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ArrowDown className="w-6 h-6 text-slate-500" />
      </motion.div>
    </section>
  );
}
