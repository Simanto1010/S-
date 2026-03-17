import React from 'react';
import { motion } from 'motion/react';
import { Activity, Shield, Zap, Cpu, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface HealthMetric {
  id: string;
  name: string;
  status: 'online' | 'warning' | 'offline';
  latency?: string;
  load?: string;
}

interface SystemHealthPanelProps {
  metrics: HealthMetric[];
  isChecking: boolean;
  onRefresh: () => void;
}

export default function SystemHealthPanel({ metrics, isChecking, onRefresh }: SystemHealthPanelProps) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-xl">
            <Activity size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold">System Health</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Real-time Diagnostics</p>
          </div>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isChecking}
          className={`p-2 hover:bg-white/5 rounded-xl transition-all ${isChecking ? 'animate-spin text-cyan-400' : 'text-zinc-500'}`}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${
                metric.status === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                metric.status === 'warning' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 
                'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              }`} />
              <div>
                <p className="text-sm font-bold">{metric.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  {metric.latency && <span className="text-[10px] text-zinc-500 font-mono">LATENCY: {metric.latency}</span>}
                  {metric.load && <span className="text-[10px] text-zinc-500 font-mono">LOAD: {metric.load}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {metric.status === 'online' ? (
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Stable</span>
              ) : metric.status === 'warning' ? (
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Degraded</span>
              ) : (
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Offline</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-center gap-4">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Shield size={16} className="text-cyan-400" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Security Status</p>
          <p className="text-xs text-zinc-300">All encryption modules active.</p>
        </div>
        <CheckCircle2 size={16} className="text-emerald-500" />
      </div>
    </div>
  );
}
