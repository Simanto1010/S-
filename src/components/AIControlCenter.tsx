import React from 'react';
import { motion } from 'motion/react';
import { Brain, Activity, Shield, Zap, Cpu, Database, AlertCircle, CheckCircle2, Loader2, Terminal } from 'lucide-react';

interface AIControlCenterProps {
  status: 'idle' | 'thinking' | 'executing' | 'healing';
  currentTask: string | null;
  memoryInsight?: string;
  intent?: string;
  health: {
    cpu: number;
    memory: number;
    latency: string;
    uptime: string;
  };
  decisionLogs: {
    id: string;
    timestamp: Date;
    type: 'reasoning' | 'action' | 'healing' | 'error' | 'memory';
    message: string;
  }[];
}

export default function AIControlCenter({ status, currentTask, memoryInsight, intent, health, decisionLogs }: AIControlCenterProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Status Card */}
        <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Brain size={120} className={status === 'thinking' ? 'animate-pulse text-cyan-400' : 'text-zinc-500'} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-3 h-3 rounded-full ${
                status === 'idle' ? 'bg-zinc-500' : 
                status === 'thinking' ? 'bg-cyan-400 animate-pulse' : 
                status === 'executing' ? 'bg-blue-500 animate-spin' : 'bg-emerald-500'
              }`} />
              <h2 className="text-2xl font-bold uppercase tracking-tight">S+ AI CORE</h2>
              {intent && (
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-full uppercase tracking-widest border border-cyan-500/20">
                  {intent}
                </span>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Current Status</p>
                  <p className="text-3xl font-black text-white capitalize">{status}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Active Task</p>
                  <p className="text-lg text-zinc-300 italic truncate">
                    {currentTask || "Awaiting instructions..."}
                  </p>
                </div>
              </div>

              {memoryInsight && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Database size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Memory Insight</span>
                  </div>
                  <p className="text-sm text-zinc-300 italic">"{memoryInsight}"</p>
                </div>
              )}

              <div className="pt-6 flex gap-4">
                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 text-cyan-400 mb-2">
                    <Shield size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Self-Healing</span>
                  </div>
                  <p className="text-sm font-medium">Active & Monitoring</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Zap size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Neural Engine</span>
                  </div>
                  <p className="text-sm font-medium">S+ AI CORE (Hybrid)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <Activity size={20} className="text-emerald-400" />
            System Health
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span className="flex items-center gap-2"><Cpu size={12} /> CPU Load</span>
                <span>{health.cpu}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${health.cpu}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span className="flex items-center gap-2"><Database size={12} /> Memory</span>
                <span>{health.memory}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${health.memory}%` }}
                  className="h-full bg-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Latency</p>
                <p className="text-lg font-bold text-white">{health.latency}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Uptime</p>
                <p className="text-lg font-bold text-white">{health.uptime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Decision Logs */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Terminal size={20} className="text-cyan-400" />
              Intelligence Logs
            </h3>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
            {decisionLogs.length > 0 ? decisionLogs.map((log) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex gap-4 items-start"
              >
                <div className={`mt-1 p-2 rounded-lg ${
                  log.type === 'reasoning' ? 'bg-cyan-500/10 text-cyan-400' :
                  log.type === 'action' ? 'bg-blue-500/10 text-blue-400' :
                  log.type === 'healing' ? 'bg-emerald-500/10 text-emerald-400' :
                  log.type === 'memory' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {log.type === 'reasoning' && <Brain size={16} />}
                  {log.type === 'action' && <Zap size={16} />}
                  {log.type === 'healing' && <Shield size={16} />}
                  {log.type === 'memory' && <Database size={16} />}
                  {log.type === 'error' && <AlertCircle size={16} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {log.type} • {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{log.message}</p>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-12 text-zinc-600">
                <Loader2 size={32} className="mx-auto mb-4 animate-spin opacity-20" />
                <p>Initializing Intelligence Stream...</p>
              </div>
            )}
          </div>
        </div>

        {/* Self-Improvement & Learning */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <Zap size={20} className="text-amber-400" />
            Self-Improvement & Learning
          </h3>
          
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-amber-500/5 to-orange-600/5 border border-amber-500/10 rounded-2xl">
              <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-4">Neural Optimization Progress</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Execution Efficiency</span>
                  <span className="text-sm font-bold text-emerald-400">+12.4%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[78%]" />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Error Reduction Rate</span>
                  <span className="text-sm font-bold text-blue-400">+8.2%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[64%]" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Recent Learnings</p>
              <div className="space-y-2">
                {[
                  "Optimized YouTube upload timing for 18:00 UTC.",
                  "Identified recurring API timeout in Notion connector; increased buffer.",
                  "Learned user preference for 'Professional' tone in LinkedIn captions."
                ].map((learning, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-400">{learning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
