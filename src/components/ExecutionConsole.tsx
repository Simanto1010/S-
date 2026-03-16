import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface Log {
  id: string;
  type: 'info' | 'success' | 'error' | 'ai';
  message: string;
  timestamp: Date;
}

interface ExecutionConsoleProps {
  logs: Log[];
}

export default function ExecutionConsole({ logs }: ExecutionConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
      <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal size={18} className="text-cyan-400" />
          <h3 className="text-sm font-mono font-bold tracking-widest uppercase">S+ Execution Console</h3>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-6 font-mono text-sm space-y-3 overflow-y-auto scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
              <Terminal size={48} strokeWidth={1} />
              <p>System idle. Awaiting command input...</p>
            </div>
          ) : (
            logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 group"
              >
                <span className="text-zinc-700 shrink-0">
                  [{log.timestamp.toLocaleTimeString([], { hour12: false })}]
                </span>
                <div className="flex gap-2">
                  {log.type === 'ai' && <ChevronRight size={16} className="text-cyan-400 mt-0.5" />}
                  {log.type === 'success' && <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />}
                  {log.type === 'error' && <AlertCircle size={16} className="text-red-500 mt-0.5" />}
                  {log.type === 'info' && <Loader2 size={16} className="text-blue-400 animate-spin mt-0.5" />}
                  
                  <span className={`
                    ${log.type === 'ai' ? 'text-cyan-400' : ''}
                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'info' ? 'text-zinc-300' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 py-3 border-t border-white/5 bg-white/5 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Kernel Ready</span>
        </div>
        <div className="h-3 w-[1px] bg-white/10" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Memory: 12.4GB / 32GB</span>
      </div>
    </div>
  );
}
