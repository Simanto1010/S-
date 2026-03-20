import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, AlertCircle, XCircle, RefreshCw, Zap, Database, ShieldCheck, Server } from 'lucide-react';
import { HealthCheckService, HealthStatus } from '../services/healthCheckService';
import { cn } from '../lib/utils';

export const SystemHealth: React.FC = () => {
  const [statuses, setStatuses] = useState<HealthStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runChecks = async () => {
    setIsChecking(true);
    try {
      const results = await HealthCheckService.runFullCheck();
      setStatuses(results);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'degraded': return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'down': return <XCircle className="w-5 h-5 text-rose-400" />;
    }
  };

  const getServiceIcon = (service: string) => {
    if (service.includes('AI')) return <Zap className="w-5 h-5" />;
    if (service.includes('Firestore')) return <Database className="w-5 h-5" />;
    if (service.includes('Auth')) return <ShieldCheck className="w-5 h-5" />;
    return <Server className="w-5 h-5" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">System Health</h1>
          <p className="text-white/40 text-sm mt-1">Real-time infrastructure & service monitoring</p>
        </div>
        <button
          onClick={runChecks}
          disabled={isChecking}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all disabled:opacity-50 group"
        >
          <RefreshCw className={cn("w-4 h-4 group-hover:rotate-180 transition-transform duration-500", isChecking && "animate-spin")} />
          <span className="font-bold uppercase tracking-widest text-xs">Refresh Status</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statuses.map((status, idx) => (
          <motion.div
            key={status.service}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4">
              {getStatusIcon(status.status)}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                status.status === 'healthy' ? "bg-emerald-500/10 text-emerald-400" :
                status.status === 'degraded' ? "bg-amber-500/10 text-amber-400" :
                "bg-rose-500/10 text-rose-400"
              )}>
                {getServiceIcon(status.service)}
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-widest text-sm">{status.service}</h3>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-tighter",
                  status.status === 'healthy' ? "text-emerald-500" :
                  status.status === 'degraded' ? "text-amber-500" :
                  "text-rose-500"
                )}>
                  {status.status}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {status.latency !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 uppercase font-mono">Latency</span>
                  <span className="text-white font-mono">{status.latency}ms</span>
                </div>
              )}
              {status.message && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[10px] text-white/60 font-mono leading-relaxed break-words">
                    {status.message}
                  </p>
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1">
              <div className={cn(
                "h-full transition-all duration-1000",
                status.status === 'healthy' ? "bg-emerald-500 w-full" :
                status.status === 'degraded' ? "bg-amber-500 w-1/2" :
                "bg-rose-500 w-1/4"
              )} />
            </div>
          </motion.div>
        ))}
      </div>

      {lastChecked && (
        <p className="text-center text-white/20 text-[10px] font-mono uppercase tracking-widest">
          Last full system check: {lastChecked.toLocaleTimeString()}
        </p>
      )}

      {/* Infrastructure Details */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <h2 className="text-white font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Infrastructure Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Region', value: 'Global (Edge)' },
            { label: 'Runtime', value: 'Node.js 20.x' },
            { label: 'Real-time', value: 'Socket.io 4.x' },
            { label: 'Vector Engine', value: 'Firestore Native' }
          ].map(item => (
            <div key={item.label}>
              <p className="text-white/40 text-[10px] uppercase font-mono mb-1">{item.label}</p>
              <p className="text-white font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
