import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fingerprint, 
  ShieldAlert, 
  ArrowRight, 
} from 'lucide-react';

interface AuthScreenProps {
  onLoginStudent: (admissionNo: string, pin: string) => Promise<string | null>;
  onLoginAdmin: (password: string) => Promise<boolean>;
  isOpen: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginStudent,
  onLoginAdmin,
  isOpen,
}) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginId.trim() || !password.trim()) return;

    if (loginId.trim().toLowerCase() === 'admin') {
      const success = await onLoginAdmin(password.trim());
      if (!success) {
        setError('Access Denied. Master authorization code invalid.');
      }
      return;
    }

    // Default to student check
    const studentError = await onLoginStudent(loginId.trim().toUpperCase(), password.trim());
    if (studentError) {
      setError(studentError);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[85vh] px-4 relative" id="auth-screen-container">
      
      {/* Background cyber grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"
        id="bg-grid-mesh"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key="unified-auth"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-md my-8"
        >
          {/* Main Login */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md relative shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
            <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-white/10 pointer-events-none" />

            <div className="flex flex-col items-center gap-3 mb-8 text-center" id="logo-block">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border border-teal-500/30 animate-spin" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Fingerprint className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-tr from-teal-400 to-magenta-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Election Portal</h2>
                <div className="flex items-center justify-center gap-1.5 mt-1.5" id="stud-state">
                  <span className={`w-2 h-2 rounded-full inline-block ${isOpen ? 'bg-teal-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                    SYSTEM: {isOpen ? 'ACTIVE' : 'LOCKED'}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-mono">LOGIN ID</label>
                <input
                  type="text"
                  required
                  placeholder="Login ID"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-mono">SECURE PASSWORD / PIN</label>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-mono tracking-widest"
                />
              </div>

              <div className="flex justify-end border-t border-white/5 pt-4 mt-2">
                <button
                  type="submit"
                  className="flex items-center justify-center w-full gap-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs font-mono py-3 px-6 rounded-xl select-none transition-all uppercase tracking-wider"
                >
                  AUTHENTICATE
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
