import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Sparkles, Loader2 } from 'lucide-react';

interface CommandOrbProps {
  onCommand: (command: string) => void;
  isProcessing: boolean;
}

export default function CommandOrb({ onCommand, isProcessing }: CommandOrbProps) {
  const [input, setInput] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onCommand(input);
      setInput('');
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-20">
      {/* The Orb */}
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          scale: isProcessing ? [1, 1.1, 1] : 1,
          boxShadow: isProcessing 
            ? "0 0 60px rgba(34,211,238,0.4)" 
            : isHovered 
              ? "0 0 40px rgba(34,211,238,0.2)" 
              : "0 0 20px rgba(34,211,238,0.1)"
        }}
        transition={{ duration: 2, repeat: isProcessing ? Infinity : 0 }}
        className="relative w-48 h-48 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center group cursor-pointer overflow-hidden"
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.random() * 50 - 25, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <Sparkles className="w-12 h-12 text-cyan-400 group-hover:scale-110 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glow effect */}
        <div className="absolute inset-0 bg-cyan-400/5 blur-2xl group-hover:bg-cyan-400/10 transition-colors" />
      </motion.div>

      {/* Input Field */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="mt-12 w-full max-w-2xl relative"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Speak or type a command (e.g., 'Upload this video to YouTube')"
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-5 pr-32 text-lg focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            type="button"
            className="p-3 text-zinc-500 hover:text-cyan-400 transition-colors"
          >
            <Mic size={24} />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-black p-3 rounded-xl transition-all"
          >
            <Send size={24} />
          </button>
        </div>
      </motion.form>

      <div className="mt-6 flex gap-4">
        {['Research AI trends', 'Post to LinkedIn', 'Generate Image'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="text-xs font-mono text-zinc-500 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/30 px-3 py-1.5 rounded-full transition-all bg-white/5"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
