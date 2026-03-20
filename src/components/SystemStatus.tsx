import React from 'react';
import { SystemHealth } from './SystemHealth';
import { ActivityLogs } from './ActivityLogs';
import { Shield, Activity, Zap, Server } from 'lucide-react';

export function SystemStatus() {
  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 uppercase">System Status</h2>
          <p className="text-zinc-500 text-xs sm:text-sm">Real-time monitoring and activity logs for the S+ Core.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold text-emerald-500 uppercase tracking-widest">All Systems Operational</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
            <Shield size={14} className="text-cyan-400" />
            <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Secure Core v2.1</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <SystemHealth />
        </div>
        <div className="lg:col-span-2">
          <ActivityLogs />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Server size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-tight">API Infrastructure</h4>
            <p className="text-xs text-zinc-500 mt-1">Multi-region edge network active with 99.99% uptime SLA.</p>
          </div>
        </div>
        
        <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Activity size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-tight">Auto-Healing Engine</h4>
            <p className="text-xs text-zinc-500 mt-1">AI-driven error detection and automatic retry system active.</p>
          </div>
        </div>

        <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-3xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Zap size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-tight">Real-time Sync</h4>
            <p className="text-xs text-zinc-500 mt-1">Bi-directional data synchronization across all connected platforms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
