import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Lock, Eye, EyeOff, Copy, Trash2, Plus, Search } from 'lucide-react';

const MOCK_CREDENTIALS = [
  { id: '1', platform: 'YouTube', type: 'API Key', value: 'AIzaSyBscDrhyTSeb6F4...', lastUsed: '2 hours ago' },
  { id: '2', platform: 'Instagram', type: 'OAuth Token', value: 'IGQVJYeE5wS...', lastUsed: '5 mins ago' },
  { id: '3', platform: 'Notion', type: 'Integration Token', value: 'secret_9f8a7b6c5d4e...', lastUsed: 'Yesterday' },
];

export default function IdentityVault() {
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const toggleShow = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Identity Vault</h3>
          <p className="text-zinc-500 mt-1">Secure encrypted storage for your API tokens and credentials.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search vault..." 
              className="bg-[#0a0a0a] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button className="flex items-center gap-2 bg-cyan-500 text-black px-4 py-2 rounded-xl font-medium hover:bg-cyan-400 transition-all">
            <Plus size={18} />
            New Secret
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
              <th className="px-8 py-4">Platform</th>
              <th className="px-8 py-4">Type</th>
              <th className="px-8 py-4">Value</th>
              <th className="px-8 py-4">Last Used</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MOCK_CREDENTIALS.map((cred) => (
              <tr key={cred.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Lock size={14} className="text-cyan-400" />
                    </div>
                    <span className="font-bold">{cred.platform}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm text-zinc-400">{cred.type}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-zinc-500">
                      {showValues[cred.id] ? cred.value : '••••••••••••••••••••'}
                    </span>
                    <button 
                      onClick={() => toggleShow(cred.id)}
                      className="p-1 text-zinc-600 hover:text-white transition-colors"
                    >
                      {showValues[cred.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm text-zinc-500">{cred.lastUsed}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                      <Copy size={16} />
                    </button>
                    <button className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-4">
        <Shield className="text-cyan-400 shrink-0" size={24} />
        <div>
          <h4 className="text-sm font-bold text-cyan-400">Military-Grade Encryption Active</h4>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            All credentials stored in the Identity Vault are encrypted using AES-256-GCM. 
            S+ never stores your master password and your data is only decrypted locally during execution.
          </p>
        </div>
      </div>
    </div>
  );
}
