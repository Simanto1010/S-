import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Check, X, Zap, Brain, Globe, MessageSquare, Code, Database, Wand2, Image as ImageIcon, Video } from 'lucide-react';
import MediaGenerator from './MediaGenerator';

interface Task {
  id: string;
  platform: string;
  action: string;
  description: string;
  reasoning: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

interface TaskSwipeQueueProps {
  tasks: Task[];
  onApprove: (task: Task) => void;
  onDecline: (task: Task) => void;
}

export default function TaskSwipeQueue({ tasks, onApprove, onDecline }: TaskSwipeQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMediaGenerator, setShowMediaGenerator] = useState(false);

  const handleSwipe = (direction: 'left' | 'right') => {
    const task = tasks[currentIndex];
    if (direction === 'right') {
      onApprove(task);
      // Haptic feedback
      if (window.navigator.vibrate) {
        window.navigator.vibrate([50]);
      }
    } else {
      onDecline(task);
      if (window.navigator.vibrate) {
        window.navigator.vibrate([20, 10, 20]);
      }
    }
    setCurrentIndex(prev => prev + 1);
  };

  if (currentIndex >= tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 border border-white/10 rounded-3xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
          <Check size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">Queue Clear</h3>
        <p className="text-zinc-500 text-sm">All autonomous tasks have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto h-[600px] perspective-1000">
      <AnimatePresence>
        {tasks.slice(currentIndex, currentIndex + 2).reverse().map((task, idx) => (
          <SwipeCard 
            key={task.id} 
            task={task} 
            isTop={idx === 1 || tasks.length - currentIndex === 1}
            onSwipe={handleSwipe}
            onOpenMedia={() => setShowMediaGenerator(true)}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showMediaGenerator && (
          <MediaGenerator 
            onClose={() => setShowMediaGenerator(false)} 
            initialPrompt={tasks[currentIndex]?.description}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SwipeCard({ task, isTop, onSwipe, onOpenMedia }: { 
  task: Task, 
  isTop: boolean, 
  onSwipe: (dir: 'left' | 'right') => void,
  onOpenMedia: () => void 
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const approveOpacity = useTransform(x, [50, 150], [0, 1]);
  const declineOpacity = useTransform(x, [-150, -50], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('github')) return <Code size={20} />;
    if (p.includes('slack')) return <MessageSquare size={20} />;
    return <Globe size={20} />;
  };

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 shadow-2xl flex flex-col cursor-grab active:cursor-grabbing overflow-hidden"
      whileTap={{ scale: 0.98 }}
    >
      {/* Swipe Overlays */}
      <motion.div 
        style={{ opacity: approveOpacity }}
        className="absolute top-10 right-10 border-4 border-emerald-500 text-emerald-500 px-4 py-2 rounded-xl font-black text-2xl uppercase rotate-12 pointer-events-none z-20"
      >
        Approve
      </motion.div>
      <motion.div 
        style={{ opacity: declineOpacity }}
        className="absolute top-10 left-10 border-4 border-rose-500 text-rose-500 px-4 py-2 rounded-xl font-black text-2xl uppercase -rotate-12 pointer-events-none z-20"
      >
        Decline
      </motion.div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
          {getPlatformIcon(task.platform)}
        </div>
        <div>
          <h4 className="font-bold text-lg">{task.action}</h4>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{task.platform}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
        {task.mediaUrl && (
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
            {task.mediaType === 'image' ? (
              <img src={task.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <video src={task.mediaUrl} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenMedia(); }}
                className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
              >
                <Wand2 size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Zap size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Description</span>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">{task.description}</p>
        </div>

        <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 text-purple-400">
            <Brain size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">AI Reasoning</span>
          </div>
          <p className="text-zinc-400 text-xs italic leading-relaxed">"{task.reasoning}"</p>
        </div>

        {!task.mediaUrl && (
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenMedia(); }}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all group"
          >
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:scale-110 transition-transform">
              <Wand2 size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Generate Creative Media</span>
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button 
          onClick={() => onSwipe('left')}
          className="w-14 h-14 rounded-full border border-rose-500/30 text-rose-500 flex items-center justify-center hover:bg-rose-500/10 transition-colors"
        >
          <X size={24} />
        </button>
        <button 
          onClick={() => onSwipe('right')}
          className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        >
          <Check size={24} />
        </button>
      </div>
    </motion.div>
  );
}

