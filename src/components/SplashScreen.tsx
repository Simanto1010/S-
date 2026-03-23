import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500); // Allow exit animation to finish
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/10" />
          
          {/* Animated Glow */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px]"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Container */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] mb-8"
            >
              <span className="text-4xl font-black text-black tracking-tighter">S+</span>
            </motion.div>

            {/* Text Content */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-center space-y-2"
            >
              <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">SYSTEM PLUS</h1>
              <div className="flex items-center justify-center gap-2 text-zinc-500 font-mono text-[10px] tracking-widest uppercase">
                <Sparkles size={12} className="text-indigo-400" />
                <span>Kernel v2.1.0 Initializing</span>
                <Sparkles size={12} className="text-emerald-400" />
              </div>
            </motion.div>

            {/* Loading Bar */}
            <div className="mt-12 w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent"
              />
            </div>
          </div>

          {/* Bottom Meta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-12 text-[10px] font-mono text-zinc-600 tracking-widest uppercase"
          >
            Secure Neural Interface Active
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
