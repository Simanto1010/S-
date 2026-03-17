import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, Trash2, TrendingUp, CheckCircle2, X, Sparkles } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  progress: number;
  status: 'active' | 'completed';
}

interface GoalManagerProps {
  goals: Goal[];
  onAdd: (title: string) => void;
  onDelete: (id: string) => void;
}

export default function GoalManager({ goals, onAdd, onDelete }: GoalManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.trim()) {
      onAdd(newGoal.trim());
      setNewGoal('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Target size={20} className="text-purple-400" />
          Strategic Goals
        </h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-xl transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {goals.map((goal) => (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/5 border border-white/5 rounded-2xl p-5 relative group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                  <TrendingUp size={18} />
                </div>
                <button 
                  onClick={() => onDelete(goal.id)}
                  className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h4 className="font-bold mb-3">{goal.title}</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Progress</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  />
                </div>
              </div>

              {goal.progress === 100 && (
                <div className="absolute top-2 right-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-purple-500/30 rounded-2xl p-5"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">New Goal</span>
                <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <input 
                autoFocus
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="e.g. Grow Instagram followers"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none transition-all"
              />
              <button 
                type="submit"
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Set Goal
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
