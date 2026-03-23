import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Key, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { useAdminAuth } from '../hooks/useAdminAuth';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { 
    isVerified, isOtpSent, isLoading, sendOtp, 
    verifyOtp, isAdminEmail, maskedEmail, resendCooldown 
  } = useAdminAuth();
  const [otp, setOtp] = useState('');

  if (!isAdminEmail) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-3xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 mb-6">
          <Shield size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-zinc-500 text-center max-w-md">
          This area is restricted to authorized administrators only. Your account ({auth.currentUser?.email}) does not have the necessary permissions.
        </p>
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 blur-[100px] pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {!isOtpSent ? (
          <motion.div
            key="request-otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 mx-auto mb-6">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Secure Admin Login Required</h2>
            <p className="text-zinc-500 mb-8">
              A 6-digit verification code will be sent to <span className="text-cyan-400 font-mono">{maskedEmail}</span> to grant access.
            </p>
            <button
              onClick={sendOtp}
              disabled={isLoading}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all group"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="verify-otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-sm w-full"
          >
            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 mx-auto mb-6">
              <Key size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Enter 6-Digit Code</h2>
            <p className="text-zinc-500 mb-8">
              Please enter the code sent to <span className="text-cyan-400 font-mono">{maskedEmail}</span>.
            </p>
            
            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              
              <button
                onClick={() => verifyOtp(otp)}
                disabled={isLoading || otp.length !== 6}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Verify & Access'
                )}
              </button>
              
              <button
                onClick={sendOtp}
                disabled={isLoading || resendCooldown > 0}
                className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
