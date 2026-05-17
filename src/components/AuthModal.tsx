import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, X, AlertCircle } from 'lucide-react';
import { signIn, signInWithEmail, signUpWithEmail } from '../lib/firebase';
import { executeRecaptcha } from '../lib/recaptcha';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'selection' | 'login' | 'signup';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('selection');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await executeRecaptcha('GOOGLE_LOGIN');
      await signIn();
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await executeRecaptcha('LOGIN');
        await signInWithEmail(email, password);
      } else {
        await executeRecaptcha('SIGNUP');
        await signUpWithEmail(email, password, name);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-serif font-medium mb-2 text-pink-400">Welcome to Iyra</h2>
          <p className="text-white/60 text-sm">Faizan's elite AI companion</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col gap-2 text-red-400 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
            {error.includes('auth/popup-blocked') && (
              <p className="text-[10px] opacity-70 mt-1 leading-relaxed">
                Tip: Popups are blocked in frames. Open this app in a new tab or use the Email sign-in option below.
              </p>
            )}
            {error.includes('auth/operation-not-allowed') && (
              <p className="text-[10px] opacity-70 mt-1 leading-relaxed">
                Developer Note: Email sign-in is not enabled in Firebase Console. You must enable "Email/Password" in Auth {"->"} Sign-in method.
              </p>
            )}
            {error.includes('unauthorized-domain') && (
              <p className="text-[10px] opacity-70 mt-1 leading-relaxed">
                Developer Note: You must add this domain to "Authorized domains" in Firebase Console {"->"} Auth {"->"} Settings.
              </p>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'selection' ? (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1a1a1a] px-2 text-white/40">Or use email</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('login')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group"
                >
                  <Mail className="text-white/40 group-hover:text-pink-400 transition-colors" />
                  <span className="text-sm font-medium">Log In</span>
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group"
                >
                  <UserIcon className="text-white/40 group-hover:text-pink-400 transition-colors" />
                  <span className="text-sm font-medium">Sign Up</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailAuth}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Faizan Ali"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500/50 transition-colors"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs text-white/40 ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="faizan@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/40 ml-1">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500/50 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 disabled:opacity-50 transition-all shadow-lg shadow-pink-500/20 mt-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('selection');
                  setError(null);
                }}
                className="w-full text-xs text-white/40 hover:text-white transition-colors py-2"
              >
                Back to other options
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
