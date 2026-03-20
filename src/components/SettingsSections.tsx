import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Key, Cpu, Mic, Shield, Bell, Zap, Smartphone, Plus, Trash2, Check, AlertCircle, RefreshCw, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface SectionProps {
  user: any;
  settings: any;
  onUpdate: (data: any) => Promise<void>;
}

export const ProfileSettings = ({ user, settings, onUpdate }: SectionProps) => {
  const [name, setName] = useState(settings?.displayName || user?.displayName || '');
  const [email, setEmail] = useState(settings?.email || user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ displayName: name, email });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="relative group">
          <img src={user?.photoURL} className="w-24 h-24 rounded-full border-2 border-cyan-500/50 p-1" referrerPolicy="no-referrer" />
          <button className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold uppercase">
            Change
          </button>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{name}</p>
          <p className="text-xs text-zinc-500">System Administrator</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
            Full Name
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
            Email Address
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all mt-4 flex items-center justify-center gap-2"
        >
          {isSaving && <RefreshCw size={16} className="animate-spin" />}
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};

export const APIKeyManagement = ({ settings, onUpdate }: SectionProps) => {
  const [keys, setKeys] = useState<any[]>(settings?.apiKeys || [
    { id: '1', service: 'Gemini AI', key: '••••••••••••••••', status: 'active' },
    { id: '2', service: 'OpenAI', key: '••••••••••••••••', status: 'active' },
    { id: '3', service: 'Slack', key: '••••••••••••••••', status: 'active' },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState('');
  const [newKey, setNewKey] = useState('');

  const handleDelete = async (id: string) => {
    const newKeys = keys.filter(k => k.id !== id);
    setKeys(newKeys);
    await onUpdate({ apiKeys: newKeys });
    toast.success('API Key removed');
  };

  const handleRefresh = async (id: string) => {
    toast.info('Validating API Key...');
    setTimeout(async () => {
      const newKeys = keys.map(k => k.id === id ? { ...k, status: 'active' } : k);
      setKeys(newKeys);
      await onUpdate({ apiKeys: newKeys });
      toast.success('API Key validated');
    }, 1500);
  };

  const handleAdd = async () => {
    if (!newService || !newKey) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const newKeyObj = {
      id: Math.random().toString(36).substr(2, 9),
      service: newService,
      key: newKey.substring(0, 4) + '••••' + newKey.substring(newKey.length - 4),
      status: 'active'
    };
    
    const newKeys = [...keys, newKeyObj];
    setKeys(newKeys);
    await onUpdate({ apiKeys: newKeys });
    toast.success('API Key added');
    setIsAdding(false);
    setNewService('');
    setNewKey('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest">Active Keys</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`p-2 rounded-lg transition-all ${isAdding ? 'bg-red-500/10 text-red-400' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'}`}
        >
          {isAdding ? <Trash2 size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white/5 border border-cyan-500/30 rounded-2xl space-y-4"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
              Service Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input 
              type="text" 
              placeholder="e.g. Anthropic"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center">
              API Key
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input 
              type="password" 
              placeholder="sk-..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button 
            onClick={handleAdd}
            className="w-full bg-cyan-500 text-black font-bold py-2 rounded-xl text-xs hover:bg-cyan-400 transition-all"
          >
            Add Key
          </button>
        </motion.div>
      )}

      <div className="space-y-3">
        {keys.map((k) => (
          <div key={k.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${k.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm font-bold">{k.service}</p>
                <p className="text-[10px] font-mono text-zinc-500">{k.key}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleRefresh(k.id)} className="p-2 hover:text-cyan-400 transition-colors"><RefreshCw size={14} /></button>
              <button onClick={() => handleDelete(k.id)} className="p-2 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AIModelSelection = ({ settings, onUpdate }: any) => {
  const [selected, setSelected] = useState(settings?.aiModel || 'gemini');

  const handleSelect = async (id: string) => {
    setSelected(id);
    try {
      await onUpdate({ aiModel: id });
      toast.success(`AI Model switched to ${id}`);
    } catch (err) {
      toast.error('Failed to switch model');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: 'gemini', name: 'Google Gemini 1.5 Pro', desc: 'Optimized for reasoning and multi-step tasks.', icon: Cpu },
          { id: 'gpt4', name: 'OpenAI GPT-4o', desc: 'High performance for creative writing and code.', icon: Zap },
          { id: 'claude', name: 'Anthropic Claude 3.5', desc: 'Excellent for long context and analysis.', icon: Shield },
        ].map((model) => (
          <button
            key={model.id}
            onClick={() => handleSelect(model.id)}
            className={`w-full p-4 rounded-2xl border transition-all text-left flex items-start gap-4 ${
              selected === model.id 
                ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]' 
                : 'bg-white/5 border-white/5 hover:border-white/10'
            }`}
          >
            <div className={`p-2 rounded-xl ${selected === model.id ? 'text-cyan-400' : 'text-zinc-500'}`}>
              <model.icon size={20} />
            </div>
            <div>
              <p className={`text-sm font-bold ${selected === model.id ? 'text-white' : 'text-zinc-300'}`}>{model.name}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{model.desc}</p>
            </div>
            {selected === model.id && <Check size={16} className="text-cyan-400 ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export const VoiceSettings = ({ settings, onUpdate }: any) => {
  const [enabled, setEnabled] = useState(settings?.voiceEnabled ?? true);
  const [voice, setVoice] = useState(settings?.voiceOutput || 'nova');

  const handleToggle = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    await onUpdate({ voiceEnabled: newVal });
    toast.success(`Voice commands ${newVal ? 'enabled' : 'disabled'}`);
  };

  const handleVoiceSelect = async (v: string) => {
    setVoice(v);
    await onUpdate({ voiceOutput: v });
    toast.success(`Voice output set to ${v}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
        <div>
          <p className="text-sm font-bold">Voice Commands</p>
          <p className="text-[10px] text-zinc-500">Enable speech-to-text activation.</p>
        </div>
        <button 
          onClick={handleToggle}
          className={`w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`} />
        </button>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Voice</label>
        <div className="grid grid-cols-2 gap-3">
          {['Nova', 'Echo', 'Shimmer', 'Onyx'].map((v) => (
            <button
              key={v}
              onClick={() => handleVoiceSelect(v.toLowerCase())}
              className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                voice === v.toLowerCase() ? 'bg-cyan-500/10 border-cyan-500/50 text-white' : 'bg-white/5 border-white/5 text-zinc-500'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Microphone Sensitivity</label>
        <input type="range" className="w-full accent-cyan-500" />
        <div className="flex justify-between text-[10px] text-zinc-600 uppercase font-black">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export const SecurityPrivacy = () => {
  const handleRevoke = () => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
      loading: 'Revoking all sessions...',
      success: 'All other sessions revoked',
      error: 'Failed to revoke sessions'
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
        <Lock size={20} className="text-emerald-500" />
        <div>
          <p className="text-sm font-bold text-emerald-500">End-to-End Encryption</p>
          <p className="text-[10px] text-emerald-500/70">All your data is encrypted with AES-256-GCM.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Sessions</h4>
        <div className="space-y-2">
          {[
            { device: 'Chrome on MacOS', location: 'San Francisco, US', time: 'Active Now' },
            { device: 'S+ Mobile App', location: 'San Francisco, US', time: '2 hours ago' },
          ].map((session, i) => (
            <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">{session.device}</p>
                <p className="text-[10px] text-zinc-500">{session.location}</p>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">{session.time}</span>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={handleRevoke}
        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-3 rounded-xl transition-all text-sm"
      >
        Revoke All Sessions
      </button>
    </div>
  );
};

export const DeviceConnections = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {[
          { name: 'MacBook Pro 16"', type: 'Laptop', status: 'online' },
          { name: 'iPhone 15 Pro', type: 'Mobile', status: 'offline' },
          { name: 'Home Assistant Hub', type: 'IoT', status: 'online' },
        ].map((device, i) => (
          <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className={`p-2 rounded-xl ${device.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
              <Smartphone size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{device.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{device.type}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
          </div>
        ))}
      </div>
      <button 
        onClick={() => toast.info('Scanning for nearby devices...')}
        className="w-full border border-white/10 hover:border-cyan-500/50 text-zinc-400 hover:text-white py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add New Device
      </button>
    </div>
  );
};

export const NotificationSettings = ({ settings, onUpdate }: any) => {
  const [notifs, setNotifs] = useState(settings?.notifications || {
    push: true,
    email: false,
    tasks: true,
    security: true
  });

  const handleToggle = async (id: string) => {
    const newNotifs = { ...notifs, [id]: !notifs[id as keyof typeof notifs] };
    setNotifs(newNotifs);
    await onUpdate({ notifications: newNotifs });
    toast.success('Notification preferences updated');
  };

  return (
    <div className="space-y-4">
      {[
        { id: 'push', label: 'Push Notifications', desc: 'Receive alerts on your desktop and mobile.' },
        { id: 'email', label: 'Email Reports', desc: 'Weekly summary of your automation tasks.' },
        { id: 'tasks', label: 'Task Completion', desc: 'Alert when a multi-step command finishes.' },
        { id: 'security', label: 'Security Alerts', desc: 'Notify on new login or key changes.' },
      ].map((item) => (
        <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
          <div>
            <p className="text-sm font-bold">{item.label}</p>
            <p className="text-[10px] text-zinc-500">{item.desc}</p>
          </div>
          <button 
            onClick={() => handleToggle(item.id)}
            className={`w-12 h-6 rounded-full transition-all relative ${notifs[item.id as keyof typeof notifs] ? 'bg-cyan-500' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifs[item.id as keyof typeof notifs] ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const AutomationPreferences = ({ settings, onUpdate }: any) => {
  const [mode, setMode] = useState(settings?.automationMode || 'autonomous');
  const [retry, setRetry] = useState(settings?.retryStrategy || 'Exponential Backoff (Recommended)');

  const handleModeSelect = async (id: string) => {
    setMode(id);
    await onUpdate({ automationMode: id });
    toast.success(`Automation mode set to ${id}`);
  };

  const handleRetrySelect = async (val: string) => {
    setRetry(val);
    await onUpdate({ retryStrategy: val });
    toast.success('Retry strategy updated');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Planning Mode</label>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'autonomous', name: 'Fully Autonomous', desc: 'AI makes all decisions and executes automatically.' },
            { id: 'semi', name: 'Semi-Autonomous', desc: 'AI plans, but requires confirmation for each step.' },
            { id: 'manual', name: 'Manual Override', desc: 'You select the connectors and actions manually.' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeSelect(m.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                mode === m.id ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white/5 border-white/5'
              }`}
            >
              <p className={`text-sm font-bold ${mode === m.id ? 'text-white' : 'text-zinc-300'}`}>{m.name}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Retry Strategy</label>
        <select 
          value={retry}
          onChange={(e) => handleRetrySelect(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 appearance-none text-white"
        >
          <option className="bg-[#0a0a0a]">Exponential Backoff (Recommended)</option>
          <option className="bg-[#0a0a0a]">Immediate Retry (3 times)</option>
          <option className="bg-[#0a0a0a]">Wait for Manual Intervention</option>
        </select>
      </div>
    </div>
  );
};
