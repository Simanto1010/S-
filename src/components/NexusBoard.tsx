import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, Instagram, Facebook, Twitter, Linkedin, 
  Github, Slack, MessageSquare, Database, Cloud,
  Image as ImageIcon, FileText, Layout, Plus, Check, AlertCircle, X, Key, Globe, Search, Filter, Zap, Settings, ShieldCheck, ExternalLink
} from 'lucide-react';
import { db, auth, collection, query, where, onSnapshot, setDoc, doc, serverTimestamp, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';

interface Connector {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error';
  actions: string[];
  icon?: any;
  color?: string;
}

const CATEGORIES = ['All', 'Social', 'Messaging', 'AI Tools', 'Developer', 'Storage', 'Video', 'Productivity', 'E-commerce'];

export default function NexusBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [userConnectors, setUserConnectors] = useState<Record<string, any>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<Connector | null>(null);
  const [connectMode, setConnectMode] = useState<'oauth' | 'api' | 'vault' | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    const fetchConnectors = async () => {
      try {
        const res = await fetch('/api/connectors');
        const data = await res.json();
        setConnectors(data);
      } catch (err) {
        console.error('Failed to fetch connectors', err);
      }
    };
    fetchConnectors();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'userConnectors'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        data[doc.data().connectorId] = doc.data();
      });
      setUserConnectors(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'userConnectors');
    });

    return unsubscribe;
  }, [user]);

  const getIcon = (category: string) => {
    switch(category) {
      case 'Social': return Globe;
      case 'Messaging': return MessageSquare;
      case 'Video': return Youtube;
      case 'Storage': return Database;
      case 'Developer': return Github;
      case 'Productivity': return Layout;
      default: return Zap;
    }
  };

  const filteredConnectors = connectors.map(c => ({
    ...c,
    status: userConnectors[c.id]?.status || 'disconnected'
  })).filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = async (mode: string, data?: any) => {
    if (!selectedPlatform || !user) return;
    
    try {
      let status: 'connected' | 'disconnected' | 'error' = 'connected';
      
      if (mode === 'oauth') {
        toast.info(`Redirecting to ${selectedPlatform.name} OAuth...`);
        await new Promise(r => setTimeout(r, 1500));
      }

      const userConnectorRef = doc(db, 'userConnectors', `${user.uid}_${selectedPlatform.id}`);
      await setDoc(userConnectorRef, {
        userId: user.uid,
        connectorId: selectedPlatform.id,
        status,
        mode,
        connectedAt: serverTimestamp(),
        config: data || {}
      }, { merge: true });
      
      toast.success(`${selectedPlatform.name} connected successfully!`);
      setSelectedPlatform(null);
      setConnectMode(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `userConnectors/${user.uid}_${selectedPlatform.id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Connector Marketplace</h2>
          <p className="text-zinc-500">Discover and manage 1000+ service integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search connectors..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all w-64"
            />
          </div>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat 
                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                : 'bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredConnectors.map((connector, idx) => {
          const Icon = getIcon(connector.category);
          return (
            <motion.div
              key={connector.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 hover:border-cyan-500/30 transition-all group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                {connector.status === 'connected' ? (
                  <Check size={16} className="text-emerald-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                )}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  connector.status === 'connected' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-white/5 text-zinc-600'
                }`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold">{connector.name}</h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{connector.category}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {connector.actions.map(action => (
                    <span key={action} className="text-[10px] px-2 py-1 bg-white/5 rounded-md text-zinc-400">{action}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedPlatform(connector)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  connector.status === 'connected'
                    ? 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                }`}
              >
                {connector.status === 'connected' ? (
                  <>
                    <Settings size={16} />
                    Configure
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Install Plugin
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedPlatform && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedPlatform(null); setConnectMode(null); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 z-[110] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-cyan-400">
                    {React.createElement(getIcon(selectedPlatform.category), { size: 20 })}
                  </div>
                  <h3 className="text-xl font-bold">Connect {selectedPlatform.name}</h3>
                </div>
                <button onClick={() => { setSelectedPlatform(null); setConnectMode(null); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              {!connectMode ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => setConnectMode('oauth')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all group"
                  >
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                      <Globe size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">OAuth 2.0 Login</p>
                      <p className="text-[10px] text-zinc-500 uppercase">Recommended & Secure</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => setConnectMode('api')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all group"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                      <Key size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">API Key / Token</p>
                      <p className="text-[10px] text-zinc-500 uppercase">For Developers</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => setConnectMode('vault')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all group"
                  >
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">Identity Vault</p>
                      <p className="text-[10px] text-zinc-500 uppercase">Use Stored Credentials</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {connectMode === 'oauth' ? (
                    <div className="text-center py-8 space-y-6">
                      <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
                        <Globe size={32} />
                      </div>
                      <p className="text-sm text-zinc-400">You will be redirected to {selectedPlatform.name} to authorize S+ Plus.</p>
                      <button 
                        onClick={() => handleConnect('oauth')}
                        className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl hover:bg-blue-400 transition-all"
                      >
                        Authorize with OAuth
                      </button>
                    </div>
                  ) : connectMode === 'api' ? (
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleConnect('api'); }}>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">API Key</label>
                        <input 
                          type="password" 
                          required
                          placeholder="Paste your API key here"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <button className="w-full bg-cyan-500 text-black font-bold py-4 rounded-2xl hover:bg-cyan-400 transition-all">
                        Connect Platform
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-400">Select a stored credential from your Identity Vault.</p>
                      <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-zinc-500 text-center text-sm">
                        No compatible credentials found.
                      </div>
                      <button 
                        onClick={() => handleConnect('vault')}
                        className="w-full bg-white/5 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all"
                      >
                        Go to Vault
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => setConnectMode(null)}
                    className="w-full text-xs font-bold text-zinc-500 hover:text-white transition-colors"
                  >
                    Back to options
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
