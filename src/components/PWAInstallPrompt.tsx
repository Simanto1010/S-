import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Info, Smartphone } from 'lucide-react';

interface PWAInstallPromptProps {
  onInstall: () => void;
  onClose: () => void;
}

export default function PWAInstallPrompt({ onInstall, onClose }: PWAInstallPromptProps) {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999]"
      >
        <div className="bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          {/* Animated background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] group-hover:bg-cyan-500/20 transition-colors duration-500" />
          
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Install S+ App</h3>
                  <p className="text-[10px] text-cyan-500/60 uppercase tracking-[0.2em] font-black">Native Kernel Experience</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              {isIOS 
                ? "Experience S+ as a native app. Tap the Share button in Safari and select 'Add to Home Screen'."
                : "Install S+ on your device for lightning-fast access, offline support, and a full-screen immersive experience."}
            </p>

            <div className="flex gap-3">
              {!isIOS ? (
                <button
                  onClick={onInstall}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
                >
                  <Download size={18} />
                  INSTALL NOW
                </button>
              ) : (
                <div className="flex-1 bg-white/5 border border-white/10 py-3.5 rounded-2xl text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-2 uppercase tracking-[0.2em]">
                  <Info size={16} className="text-cyan-400" />
                  Manual Install Required
                </div>
              )}
              <button
                onClick={onClose}
                className="px-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 transition-all"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
