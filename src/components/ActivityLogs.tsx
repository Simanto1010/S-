import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Clock, Shield, Zap, AlertCircle, CheckCircle, Brain, Database, CreditCard, Key } from 'lucide-react';
import { ActivityLogService, ActivityLog } from '../services/activityLogService';
import { auth } from '../firebase';

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'ai' | 'payment'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = ActivityLogService.subscribeToLogs(user.uid, (newLogs) => {
      setLogs(newLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'error') return log.type === 'error';
    if (filter === 'ai') return log.category === 'ai';
    if (filter === 'payment') return log.category === 'payment';
    return true;
  });

  const getIcon = (category: string, type: string) => {
    if (type === 'error') return <AlertCircle className="text-red-500" size={16} />;
    if (type === 'success') return <CheckCircle className="text-emerald-500" size={16} />;
    
    switch (category) {
      case 'ai': return <Brain className="text-purple-400" size={16} />;
      case 'payment': return <CreditCard className="text-amber-400" size={16} />;
      case 'auth': return <Shield className="text-blue-400" size={16} />;
      case 'connector': return <Zap className="text-cyan-400" size={16} />;
      case 'system': return <Database className="text-zinc-400" size={16} />;
      default: return <Activity className="text-zinc-500" size={16} />;
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden">
      <div className="p-6 border-bottom border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg text-zinc-400">
            <Clock size={20} />
          </div>
          <h3 className="text-lg font-bold uppercase tracking-tight">Activity Logs</h3>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'error', 'ai', 'payment'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Loading Logs...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getIcon(log.category, log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm font-medium truncate ${log.type === 'error' ? 'text-red-400' : 'text-zinc-200'}`}>
                          {log.action}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-zinc-500 uppercase font-bold tracking-widest">
                          {log.category}
                        </span>
                        {log.details && typeof log.details === 'string' && (
                          <p className="text-[10px] text-zinc-600 truncate">{log.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-600">No logs found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
