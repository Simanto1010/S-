import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Zap, AlertTriangle, X } from 'lucide-react';

interface UpdatePromptProps {
  show: boolean;
  onUpdate: () => void;
  onClose: () => void;
  isCritical?: boolean;
  message?: string;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({ show, onUpdate, onClose, isCritical, message }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[100] max-w-md w-full"
        >
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-500" />
            
            <div className="flex items-start gap-4 relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isCritical ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                {isCritical ? <AlertTriangle size={24} /> : <Zap size={24} />}
              </div>
              
              <div className="flex-1 space-y-2">
                <h3 className="text-white font-black uppercase tracking-tight text-lg leading-tight">
                  {isCritical ? 'Critical Security Update' : 'New Update Available 🚀'}
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  {message || 'A new version of S+ Core is available with performance improvements and security patches.'}
                </p>
                
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={onUpdate}
                    className="flex-1 bg-white text-black hover:bg-zinc-200 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} className="animate-spin-slow" />
                    Update Now
                  </button>
                  {!isCritical && (
                    <button
                      onClick={onClose}
                      className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-400 text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      Later
                    </button>
                  )}
                </div>
              </div>

              {!isCritical && (
                <button
                  onClick={onClose}
                  className="text-zinc-600 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            
            {/* Progress Bar (Decorative) */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 10, ease: 'linear' }}
                className={`h-full ${isCritical ? 'bg-rose-500' : 'bg-cyan-500'}`}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
