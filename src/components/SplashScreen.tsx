import React from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-black to-blue-950/20" />
      
      {/* Animated Glow */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]"
      />

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.4)]"
        >
          <span className="text-5xl font-black italic text-white tracking-tighter">S+</span>
        </motion.div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-3xl font-black tracking-[0.3em] text-white uppercase"
          >
            SYSTEM PLUS
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.8, duration: 1.2, ease: "easeInOut" }}
            className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="text-cyan-500/60 font-mono text-[10px] tracking-[0.5em] uppercase mt-2"
          >
            Initializing Kernel v4.0
          </motion.p>
        </div>
      </div>

      {/* Loading Bar Container */}
      <div className="absolute bottom-20 w-64 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-full h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
        />
      </div>
    </div>
  );
}
