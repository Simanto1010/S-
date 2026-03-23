import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, googleProvider, signInWithPopup, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, sendEmailVerification
} from '../firebase';
import { Globe, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityLogService } from '../services/activityLogService';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        ActivityLogService.log(result.user.uid, 'User logged in via Google', 'success', 'auth');
      }
      toast.success('Successfully initialized system via Google');
    } catch (err: any) {
      console.error('Auth Error:', err);
      let message = err.message;
      
      if (err.code === 'auth/unauthorized-domain') {
        message = `Domain Unauthorized: Please add "${window.location.hostname}" to your Firebase Console > Authentication > Settings > Authorized domains.`;
      } else if (err.code === 'auth/popup-blocked') {
        message = 'Popup Blocked: Please allow popups for this site to sign in with Google.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        message = 'Login cancelled.';
      }
      
      setError(message);
      toast.error('Google initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user) {
          if (!result.user.emailVerified) {
            setError('Please verify your email before logging in. Check your inbox.');
            toast.error('Email not verified');
            setIsLoading(false);
            return;
          }
          ActivityLogService.log(result.user.uid, 'User logged in via Email', 'success', 'auth');
        }
        toast.success('Access granted. Welcome back.');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user);
        ActivityLogService.log(userCredential.user.uid, 'New user registered', 'success', 'auth');
        toast.success('Account created. Verification email sent.');
        setIsLogin(true); // Switch to login to wait for verification
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      let message = err.message;
      
      if (err.code === 'auth/unauthorized-domain') {
        message = `Domain Unauthorized: Please add "${window.location.hostname}" to your Firebase Console > Authentication > Settings > Authorized domains.`;
      } else if (err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] mx-auto mb-8">
            <span className="text-4xl font-black italic">S+</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-4 uppercase">SYSTEM PLUS</h1>
          <p className="text-zinc-500">Universal AI Connector Platform</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex p-1 bg-white/5 rounded-xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              LOGIN
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-cyan-500/50 outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@systemplus.ai"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-cyan-500/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-cyan-500/50 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="space-y-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p>{error}</p>
                    {error.includes('Domain Unauthorized') && (
                      <div className="p-2 bg-black/20 rounded-lg text-[10px] text-zinc-400 border border-white/5">
                        <p className="font-bold text-zinc-300 mb-1 uppercase tracking-widest">How to fix:</p>
                        <ol className="list-decimal ml-4 space-y-1">
                          <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Firebase Console</a></li>
                          <li>Select your project: <strong>{auth.app.options.projectId}</strong></li>
                          <li>Go to <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong></li>
                          <li>Add <strong>{window.location.hostname}</strong> to the list</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black py-4 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 group shadow-xl"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  {isLogin ? 'ACCESS SYSTEM' : 'INITIALIZE ACCOUNT'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-[#0a0a0a] px-4 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-xl font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3"
          >
            <Globe size={20} className="text-cyan-400" />
            Google Workspace
          </button>
        </div>

        <p className="text-center mt-8 text-xs text-zinc-600">
          By accessing S+, you agree to our <span className="text-zinc-400 hover:underline cursor-pointer">Security Protocols</span> and <span className="text-zinc-400 hover:underline cursor-pointer">Neural Terms</span>.
        </p>
      </motion.div>
    </div>
  );
}
