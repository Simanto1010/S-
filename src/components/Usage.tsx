import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, Cpu, Layers, AlertTriangle } from 'lucide-react';
import { PlanType, PLAN_LIMITS, SaaSService } from '../services/saasService';
import { ActivityLogService, ActivityLog } from '../services/activityLogService';
import { doc, onSnapshot, db, handleFirestoreError, OperationType } from '../firebase';

interface UsageProps {
  user: any;
  currentPlan: PlanType;
}

export default function Usage({ user, currentPlan }: UsageProps) {
  const [usage, setUsage] = useState<any>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const limits = PLAN_LIMITS[currentPlan];

  useEffect(() => {
    if (!user) return;
    const month = new Date().toISOString().slice(0, 7);
    const usageId = `${user.uid}_${month}`;
    const usageRef = doc(db, 'usage', usageId);
    
    const unsubscribeUsage = onSnapshot(usageRef, (doc) => {
      if (doc.exists()) {
        setUsage(doc.data());
      } else {
        setUsage({ aiCalls: 0, executions: 0, ai_tasks: 0, storageUsed: 0 });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `usage/${usageId}`);
    });

    const unsubscribeLogs = ActivityLogService.subscribeToLogs(user.uid, (newLogs) => {
      // Filter for logs that might explain usage (AI calls, executions)
      const usageRelatedLogs = newLogs.filter(log => 
        log.category === 'ai' || log.category === 'connector' || log.type === 'warning'
      ).slice(0, 5);
      setLogs(usageRelatedLogs);
    }, 20);

    return () => {
      unsubscribeUsage();
      unsubscribeLogs();
    };
  }, [user]);

  if (!usage) return null;

  const metrics = [
    {
      label: 'AI Calls',
      value: usage.aiCalls || 0,
      limit: limits.aiCalls,
      icon: <Zap className="text-cyan-400" size={20} />,
      color: 'cyan'
    },
    {
      label: 'Executions',
      value: usage.executions || 0,
      limit: limits.executions,
      icon: <Cpu className="text-blue-400" size={20} />,
      color: 'blue'
    },
    {
      label: 'AI Tasks',
      value: usage.ai_tasks || 0,
      limit: limits.ai_tasks,
      icon: <Activity className="text-emerald-400" size={20} />,
      color: 'emerald'
    },
    {
      label: 'Storage (GB)',
      value: usage.storageUsed || 0,
      limit: limits.storageGb,
      icon: <Layers className="text-purple-400" size={20} />,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Usage Tracking</h2>
          <p className="text-zinc-500">Real-time monitoring of your plan limits.</p>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold">
          Current Plan: <span className="text-cyan-400 uppercase tracking-widest ml-2">{currentPlan}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => {
          const percentage = Math.min((metric.value / metric.limit) * 100, 100);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/5 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 bg-${metric.color}-500/10 rounded-xl`}>
                  {metric.icon}
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {Math.round(percentage)}%
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-400 mb-1">{metric.label}</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-black">{metric.value.toLocaleString()}</span>
                <span className="text-zinc-500 text-sm">/ {metric.limit.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  className={`h-full bg-${metric.color}-500`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
        <h3 className="text-xl font-bold mb-6">Usage History</h3>
        <div className="space-y-4">
          {logs.length > 0 ? (
            logs.map((log, i) => (
              <div key={log.id || i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${
                    log.type === 'warning' ? 'text-amber-400' : 
                    log.type === 'error' ? 'text-rose-400' : 
                    'text-zinc-500'
                  }`}>
                    {log.type === 'warning' ? <AlertTriangle size={20} /> : <Activity size={20} />}
                  </div>
                  <div>
                    <p className="font-bold">{log.action}</p>
                    <p className="text-xs text-zinc-500">
                      {log.category.toUpperCase()} • {log.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {log.timestamp?.toDate?.() ? log.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No recent usage-related activity found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
