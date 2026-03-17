import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Zap, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Play, 
  Settings, 
  Pause, 
  Activity,
  ArrowRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface Opportunity {
  id: string;
  type: 'inactivity' | 'trend' | 'performance' | 'growth';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  detectedAt: any;
  status: string;
}

interface AutonomousTask {
  id: string;
  title: string;
  description: string;
  command: string;
  explanation: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: any;
}

interface AutonomousCenterProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  opportunities: Opportunity[];
  tasks: AutonomousTask[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  onIgnoreOpportunity: (id: string) => void;
}

export default function AutonomousCenter({ 
  isEnabled, 
  onToggle, 
  opportunities, 
  tasks, 
  onApprove, 
  onReject,
  onIgnoreOpportunity
}: AutonomousCenterProps) {
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const executedTasks = tasks.filter(t => t.status === 'executed');

  return (
    <div className="space-y-8">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 border border-white/5 rounded-3xl p-8">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${isEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-500/20 text-zinc-500'}`}>
            <Brain size={32} className={isEnabled ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Autonomous AI Center</h2>
            <p className="text-zinc-500 text-sm">S+ AI Core is {isEnabled ? 'actively monitoring' : 'paused'}.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Human Approval Mode</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1 justify-end">
              <ShieldCheck size={12} /> Always Required
            </p>
          </div>
          <button
            onClick={() => onToggle(!isEnabled)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              isEnabled 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                : 'bg-cyan-500 text-black hover:bg-cyan-400'
            }`}
          >
            {isEnabled ? <Pause size={18} /> : <Play size={18} />}
            {isEnabled ? 'Pause Autonomy' : 'Enable Autonomous Mode'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Opportunities & Status */}
        <div className="space-y-8">
          <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity size={18} className="text-cyan-400" />
              AI Status Board
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-xs text-zinc-500">Monitoring Status</span>
                <span className={`text-xs font-bold ${isEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {isEnabled ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-xs text-zinc-500">Opportunity Engine</span>
                <span className="text-xs font-bold text-cyan-400">READY</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-xs text-zinc-500">Pending Approvals</span>
                <span className="text-xs font-bold text-white">{pendingTasks.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                Detected Opportunities
              </h3>
              <span className="text-[10px] text-zinc-500 font-bold">{opportunities.length}</span>
            </div>
            
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {opportunities.map((opp) => (
                  <motion.div
                    key={opp.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-4 bg-white/5 border border-white/5 rounded-2xl group relative"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        opp.type === 'inactivity' ? 'bg-red-500/10 text-red-400' :
                        opp.type === 'trend' ? 'bg-cyan-500/10 text-cyan-400' :
                        opp.type === 'performance' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {opp.type === 'inactivity' && <Clock size={16} />}
                        {opp.type === 'trend' && <TrendingUp size={16} />}
                        {opp.type === 'performance' && <AlertCircle size={16} />}
                        {opp.type === 'growth' && <Target size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold mb-1">{opp.title}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">{opp.description}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onIgnoreOpportunity(opp.id)}
                      className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <XCircle size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {opportunities.length === 0 && (
                <div className="text-center py-8 text-zinc-600">
                  <p className="text-sm italic">Scanning for opportunities...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Task Queue & Approvals */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Zap size={20} className="text-cyan-400" />
                Autonomous Task Queue
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-full">
                  {pendingTasks.length} PENDING APPROVAL
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {pendingTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <Brain size={80} />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold mb-1">{task.title}</h4>
                          <p className="text-sm text-zinc-400">{task.description}</p>
                        </div>
                        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                          <Sparkles size={20} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">AI Strategy Explanation</p>
                          <p className="text-xs text-zinc-300 italic leading-relaxed">
                            "{task.explanation}"
                          </p>
                        </div>
                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Proposed Command</p>
                          <code className="text-xs text-cyan-400 font-mono">
                            {task.command}
                          </code>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={() => onApprove(task.id)}
                          className="flex-1 min-w-[140px] bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={18} />
                          Approve & Execute
                        </button>
                        <button 
                          onClick={() => onReject(task.id)}
                          className="px-6 bg-white/5 hover:bg-red-500/10 text-white hover:text-red-400 font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2"
                        >
                          <XCircle size={18} />
                          Reject
                        </button>
                        <button className="px-4 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-xl border border-white/10 transition-all">
                          <Settings size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {pendingTasks.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600">
                    <Brain size={32} />
                  </div>
                  <h4 className="text-zinc-400 font-bold">No Pending Tasks</h4>
                  <p className="text-zinc-600 text-sm">AI is currently evaluating your data for new opportunities.</p>
                </div>
              )}
            </div>
          </div>

          {/* Executed Tasks History */}
          <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <History size={18} className="text-zinc-400" />
              Autonomous Execution History
            </h3>
            <div className="space-y-3">
              {executedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{task.title}</p>
                      <p className="text-[10px] text-zinc-500">{new Date(task.createdAt?.toDate?.() || task.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                    <span>Executed</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              ))}
              {executedTasks.length === 0 && (
                <p className="text-center py-4 text-zinc-600 text-sm italic">No autonomous tasks executed yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function History({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
