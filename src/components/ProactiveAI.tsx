import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap, Lightbulb, TrendingUp, CheckCircle2, Play, Edit3, Trash2, Calendar, Target, ArrowRight } from 'lucide-react';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'content' | 'automation' | 'optimization';
  command: string;
  reasoning: string;
}

interface DailyInsights {
  summary: string;
  tasksCompleted: number;
  successRate: string;
  topPlatform: string;
  keyInsight: string;
}

interface ProactiveAIProps {
  suggestions: Suggestion[];
  insights: DailyInsights | null;
  onRun: (command: string) => void;
  onEdit: (command: string) => void;
  onIgnore: (id: string) => void;
}

export default function ProactiveAI({ suggestions, insights, onRun, onEdit, onIgnore }: ProactiveAIProps) {
  return (
    <div className="space-y-8">
      {/* Daily Insights Banner */}
      {insights && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp size={120} className="text-indigo-400" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Calendar size={20} />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Daily AI Insights</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Tasks Completed</p>
                <p className="text-2xl font-black text-white">{insights.tasksCompleted}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Success Rate</p>
                <p className="text-2xl font-black text-emerald-400">{insights.successRate}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Top Platform</p>
                <p className="text-2xl font-black text-blue-400">{insights.topPlatform}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">AI Efficiency</p>
                <p className="text-2xl font-black text-purple-400">High</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-lg text-zinc-200 leading-relaxed italic">
                "{insights.summary}"
              </p>
              <div className="flex items-start gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <Lightbulb className="text-emerald-400 shrink-0 mt-1" size={18} />
                <div>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Key Strategy Insight</p>
                  <p className="text-sm text-zinc-300">{insights.keyInsight}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Proactive Suggestions Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-400" />
            AI Suggestions
          </h3>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {suggestions.length} New Opportunities
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suggestions.map((sug, i) => (
            <motion.div
              key={sug.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/[0.07] transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${
                  sug.type === 'content' ? 'bg-cyan-500/10 text-cyan-400' :
                  sug.type === 'automation' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {sug.type === 'content' && <Edit3 size={20} />}
                  {sug.type === 'automation' && <Zap size={20} />}
                  {sug.type === 'optimization' && <TrendingUp size={20} />}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onIgnore(sug.id)}
                    className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h4 className="text-lg font-bold mb-2 group-hover:text-cyan-400 transition-colors">{sug.title}</h4>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                {sug.description}
              </p>

              <div className="p-4 bg-black/20 rounded-2xl mb-6 border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                  <Brain size={12} /> AI Reasoning
                </p>
                <p className="text-xs text-zinc-400 italic">
                  "{sug.reasoning}"
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => onRun(sug.command)}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group/btn"
                >
                  <Play size={16} fill="currentColor" />
                  Run Now
                  <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                </button>
                <button 
                  onClick={() => onEdit(sug.command)}
                  className="px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Brain({ size }: { size: number }) {
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
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z" />
    </svg>
  );
}
