import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => Promise<boolean>;
  isLoading: boolean;
}

export function LoginModal({ isOpen, onClose, onLogin, isLoading }: LoginModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) { setError('请输入密码'); return; }
    const success = await onLogin(password);
    if (!success) { setError('密码错误'); setPassword(''); }
    else onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="w-full max-w-sm relative corner-mark"
            style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border-bright)', padding: '2.5rem' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4"
              style={{ color: 'var(--text-dim)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
              <X size={16} />
            </button>

            <div className="mb-8">
              <div className="section-number mb-3">ADMIN ACCESS</div>
              <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)' }}>管理员登录</h2>
              <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '6px', letterSpacing: '0.05em' }}>
                请输入管理密码以继续
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-dim)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="输入密码"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    paddingRight: '40px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    background: 'var(--ink-raised)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: 0,
                    color: 'var(--text-primary)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '0.8rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--ink-border)')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-dim)' }}>
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#f87171', letterSpacing: '0.05em' }}>
                  // ERROR: {error}
                </motion.p>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2"
                style={{ padding: '11px 0', borderRadius: 0, width: '100%', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}>
                {isLoading ? <><Loader2 size={13} className="animate-spin" /> VERIFYING...</> : 'LOGIN'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
