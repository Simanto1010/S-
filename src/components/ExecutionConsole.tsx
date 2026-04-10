import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, ChevronRight, CheckCircle2, Loader2, AlertCircle, Brain, Zap, Shield, RefreshCw, Check, Activity, Heart, Cpu, Activity as ActivityIcon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { getRecentMetrics, generateSimulatedMetrics } from '../services/systemHealthService';

interface Log {
  id: string;
  type: 'info' | 'success' | 'error' | 'ai';
  message: string;
  timestamp: Date;
}

interface ExecutionConsoleProps {
  logs: Log[];
  steps?: any[];
  isExecuting?: boolean;
  plan?: any;
}

export default function ExecutionConsole({ logs, steps = [], isExecuting, plan }: ExecutionConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'heartbeat'>('logs');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const realMetrics = await getRecentMetrics(20);
      if (realMetrics.length > 0) {
        setMetrics(realMetrics.reverse());
      } else {
        setMetrics(generateSimulatedMetrics(20));
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const latestMetric = metrics[metrics.length - 1] || { cpu: 0, latency: 0, successRate: 100, activeTasks: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[750px]">
      {/* Main Console */}
      <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Terminal size={18} className="text-cyan-400" />
              <h3 className="text-sm font-mono font-bold tracking-widest uppercase">S+ Execution Console</h3>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('logs')}
                className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'}`}
              >
                Logs
              </button>
              <button 
                onClick={() => setActiveTab('heartbeat')}
                className={`text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'heartbeat' ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
              >
                <Heart size={10} className={activeTab === 'heartbeat' ? 'animate-pulse' : ''} />
                Heartbeat
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isExecuting && (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-cyan-400 animate-spin" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Processing</span>
              </div>
            )}
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
            </div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'logs' ? (
              <motion.div 
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                ref={scrollRef}
                className="absolute inset-0 p-6 font-mono text-sm space-y-3 overflow-y-auto scrollbar-hide"
              >
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
              </motion.div>
            ) : (
              <motion.div 
                key="heartbeat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-8 flex flex-col gap-8"
              >
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <Cpu size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">CPU Load</span>
                    </div>
                    <p className="text-2xl font-black text-white">{latestMetric.cpu.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <Zap size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Latency</span>
                    </div>
                    <p className="text-2xl font-black text-white">{latestMetric.latency}ms</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <Shield size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Success</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-400">{latestMetric.successRate}%</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                      <ActivityIcon size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active Tasks</span>
                    </div>
                    <p className="text-2xl font-black text-cyan-400">{latestMetric.activeTasks}</p>
                  </div>
                </div>

                <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Real-time Performance</h4>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                        <span className="text-[10px] text-zinc-500 uppercase">Latency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-zinc-500 uppercase">CPU</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.isArray(metrics) ? metrics : []}>
                        <defs>
                          <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" />
                        <Area type="monotone" dataKey="latency" stroke="#06b6d4" fillOpacity={1} fill="url(#colorLatency)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
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
          <div className="h-3 w-[1px] bg-white/10" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Uptime: 14d 2h 12m</span>
        </div>
      </div>

      {/* Agent Planning Panel */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Brain size={20} />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tighter">Agent Planning</h3>
        </div>

        {plan ? (
          <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
              <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-2">Strategy</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{plan.summary}</p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Execution Steps</p>
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={step.id} className="relative pl-8">
                    {/* Connection Line */}
                    {idx !== steps.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-white/5" />
                    )}
                    
                    {/* Status Icon */}
                    <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                      step.status === 'completed' ? 'bg-emerald-500 text-black' :
                      step.status === 'executing' ? 'bg-cyan-500 text-black animate-pulse' :
                      step.status === 'retrying' ? 'bg-amber-500 text-black' :
                      step.status === 'failed' ? 'bg-rose-500 text-white' :
                      'bg-white/5 text-zinc-600'
                    }`}>
                      {step.status === 'completed' ? <Check size={14} /> :
                       step.status === 'executing' ? <Loader2 size={14} className="animate-spin" /> :
                       step.status === 'retrying' ? <RefreshCw size={14} className="animate-spin" /> :
                       step.status === 'failed' ? <AlertCircle size={14} /> :
                       <span className="text-[10px] font-bold">{idx + 1}</span>}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold ${step.status === 'executing' ? 'text-cyan-400' : 'text-white'}`}>
                          {step.action}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">{step.platform}</span>
                      </div>
                      
                      {step.status === 'retrying' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1"
                        >
                          <div className="flex items-center gap-2 text-amber-500">
                            <Shield size={12} />
                            <span className="text-[10px] font-bold uppercase">Self-Healing Active</span>
                          </div>
                          <p className="text-[10px] text-zinc-400">{step.recovery}</p>
                        </motion.div>
                      )}

                      {step.condition && (
                        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Conditional Logic</p>
                          <p className="text-[10px] text-zinc-400 italic">If: {step.condition.if}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <div className="flex items-center gap-3 text-zinc-500 mb-4">
                <Zap size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Memory Context</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-xs text-zinc-500 leading-relaxed italic">
                  {plan.memoryInsight || "Using historical data to optimize execution flow and platform selection."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 space-y-4">
            <Brain size={48} strokeWidth={1} />
            <p className="text-sm text-center">No active plan. Enter a command to see the AI agent's strategy.</p>
          </div>
        )}
      </div>
    </div>
  );
}
