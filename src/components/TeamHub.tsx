import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Shield, Activity, Mail, Check, X, Loader2, BrainCircuit } from 'lucide-react';
import { TeamService } from '../services/teamService';
import { toast } from 'sonner';

interface TeamHubProps {
  userId: string;
  workspaceId: string;
}

export const TeamHub: React.FC<TeamHubProps> = ({ userId, workspaceId }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [collaborativeMode, setCollaborativeMode] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    
    const unsubscribe = TeamService.subscribeToActivity(workspaceId, (newActivities) => {
      setActivities(newActivities);
    });

    return () => unsubscribe();
  }, [workspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      await TeamService.inviteMember(workspaceId, inviteEmail, userId);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (error) {
      console.error("Failed to invite member", error);
      toast.error("Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  const toggleCollaborativeMode = () => {
    setCollaborativeMode(!collaborativeMode);
    toast.info(collaborativeMode ? "Collaborative Brain Mode Disabled" : "Collaborative Brain Mode Enabled - AI will now process multi-user inputs.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Team Management */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <Users className="w-6 h-6 text-indigo-400" />
            <h2 className="text-white text-xl font-medium">Team Hub</h2>
          </div>

          <form onSubmit={handleInvite} className="flex flex-col gap-4 mb-8">
            <label className="text-white/40 text-xs font-mono uppercase tracking-widest">Invite Team Member</label>
            <div className="relative">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={isInviting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  MB
                </div>
                <div>
                  <div className="text-white text-sm font-medium">You (Admin)</div>
                  <div className="text-white/40 text-xs">mbidhan474@gmail.com</div>
                </div>
              </div>
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
        </motion.div>

        {/* Collaborative Brain Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-3xl border transition-all cursor-pointer ${
            collaborativeMode ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white/5 border-white/10'
          }`}
          onClick={toggleCollaborativeMode}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BrainCircuit className={`w-6 h-6 ${collaborativeMode ? 'text-indigo-400' : 'text-white/40'}`} />
              <span className="text-white font-medium">Collaborative Brain</span>
            </div>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${collaborativeMode ? 'bg-indigo-500' : 'bg-white/10'}`}>
              <motion.div
                animate={{ x: collaborativeMode ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </div>
          </div>
          <p className="text-white/40 text-xs leading-relaxed">
            When active, the S+ AI Core will synthesize inputs from all team members to refine strategic plans.
          </p>
        </motion.div>
      </div>

      {/* Right Column: Activity Feed */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h2 className="text-white text-xl font-medium">Team Activity Feed</h2>
          </div>
          <div className="text-white/40 text-xs font-mono uppercase tracking-widest">Real-time Updates</div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          <AnimatePresence initial={false}>
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold shrink-0">
                    {activity.userId?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm leading-relaxed">
                      <span className="font-medium text-indigo-400">User_{activity.userId?.substring(0, 4)}</span> {activity.action}
                    </div>
                    <div className="text-white/40 text-[10px] mt-1 font-mono uppercase">
                      {activity.timestamp?.toDate?.().toLocaleString() || 'Just now'}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">No activity recorded yet.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
