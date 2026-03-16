import React from 'react';
import { motion } from 'framer-motion';
import { 
  Youtube, Instagram, Facebook, Twitter, Linkedin, 
  Github, Slack, MessageSquare, Database, Cloud,
  Image as ImageIcon, FileText, Layout, Plus, Check, AlertCircle
} from 'lucide-react';

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500', status: 'connected' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500', status: 'connected' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', status: 'connected' },
  { id: 'notion', name: 'Notion', icon: Layout, color: 'text-white', status: 'disconnected' },
  { id: 'github', name: 'GitHub', icon: Github, color: 'text-zinc-400', status: 'connected' },
  { id: 'slack', name: 'Slack', icon: Slack, color: 'text-purple-500', status: 'disconnected' },
  { id: 'discord', name: 'Discord', icon: MessageSquare, color: 'text-indigo-500', status: 'connected' },
  { id: 'gdrive', name: 'Google Drive', icon: Cloud, color: 'text-emerald-500', status: 'connected' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500', status: 'disconnected' },
  { id: 'twitter', name: 'Twitter X', icon: Twitter, color: 'text-zinc-200', status: 'disconnected' },
];

export default function NexusBoard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Nexus Connector Board</h3>
          <p className="text-zinc-500 mt-1">Manage your connected platforms and services.</p>
        </div>
        <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-medium hover:bg-zinc-200 transition-all">
          <Plus size={18} />
          Add Connector
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {PLATFORMS.map((platform, idx) => (
          <motion.div
            key={platform.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-white/5 ${platform.color}`}>
                <platform.icon size={24} />
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                platform.status === 'connected' 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-zinc-500/10 text-zinc-500'
              }`}>
                {platform.status === 'connected' ? <Check size={10} /> : <AlertCircle size={10} />}
                {platform.status}
              </div>
            </div>

            <h4 className="text-lg font-bold">{platform.name}</h4>
            <p className="text-xs text-zinc-500 mt-1">Official API Integration</p>

            <div className="mt-6 flex items-center justify-between">
              <button className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                Configure
              </button>
              <div className="flex -space-x-2">
                {[1, 2].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0a0a0a] bg-zinc-800" />
                ))}
              </div>
            </div>

            {/* Hover Glow */}
            <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/[0.02] transition-colors rounded-2xl pointer-events-none" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
