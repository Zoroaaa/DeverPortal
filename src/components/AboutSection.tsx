import { motion } from 'framer-motion';
import { Code2, Coffee, Heart, Zap, Globe, Github } from 'lucide-react';

export function AboutSection() {
  const skills = [
    { name: 'TypeScript', level: 90 },
    { name: 'React', level: 95 },
    { name: 'Node.js', level: 85 },
    { name: 'Python', level: 80 },
    { name: 'Go', level: 70 },
  ];

  return (
    <section id="about" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-white">关于</span>
            <span className="text-gradient">我</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            热爱编程，享受创造的乐趣
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="glass rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Code2 className="w-6 h-6 text-indigo-400" />
                开发者简介
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                你好，我是 Zoro！一名热爱技术的全栈开发者。我喜欢创造各种实用的小工具，
                希望能通过这些工具帮助更多人提高效率、解决问题。
              </p>
              <p className="text-slate-400 leading-relaxed">
                在工作之余，我热衷于开源社区，喜欢分享知识和经验。这个网站是我个人项目的集合，
                每一个工具都倾注了我的心血。如果你觉得有用，欢迎 Star 支持！
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Coffee, label: '杯咖啡', value: '1000+' },
                { icon: Code2, label: '行代码', value: '100K+' },
                { icon: Heart, label: '开源项目', value: '10+' },
                { icon: Globe, label: '国家访问', value: '50+' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass rounded-xl p-4 text-center"
                >
                  <stat.icon className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="glass rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-cyan-400" />
                技能栈
              </h3>
              <div className="space-y-4">
                {skills.map((skill, index) => (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, width: 0 }}
                    whileInView={{ opacity: 1, width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-300">{skill.name}</span>
                      <span className="text-indigo-400">{skill.level}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.level}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <motion.a
              href="https://github.com/zoro"
              target="_blank"
              rel="noopener noreferrer"
              className="block glass rounded-2xl p-6 text-center group"
              whileHover={{ scale: 1.02 }}
            >
              <Github className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-white transition-colors" />
              <p className="text-white font-medium mb-1">在 GitHub 上关注我</p>
              <p className="text-slate-500 text-sm">查看更多开源项目</p>
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
