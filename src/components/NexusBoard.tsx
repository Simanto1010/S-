import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, Instagram, Facebook, Twitter, Linkedin, 
  Github, Slack, MessageSquare, Database, Cloud,
  Image as ImageIcon, FileText, Layout, Plus, Check, AlertCircle, X, Key, Globe, Search, Filter, Zap, Settings, ShieldCheck, ExternalLink, RefreshCw,
  Briefcase, DollarSign, Code, Layers, ShoppingCart, Mail, Radio, Cpu, Wand2, Link2
} from 'lucide-react';
import { db, auth, collection, query, where, onSnapshot, setDoc, doc, serverTimestamp, getDocs, handleFirestoreError, OperationType, addDoc } from '../firebase';
import { toast } from 'sonner';
import { ConnectorService, UnifiedDataModel, ConnectorTemplate } from '../services/connectorService';

interface Connector {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  actions: string[];
  icon?: any;
  color?: string;
  realtimeData?: UnifiedDataModel;
  description?: string;
}

const CATEGORIES = ['All', 'CRM', 'Social', 'Finance', 'DevTools', 'ERP', 'Messaging', 'Storage', 'AI Tools', 'E-commerce'];

interface NexusBoardProps {
  setActiveTab?: (tab: string) => void;
}

export default function NexusBoard({ setActiveTab }: NexusBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [userConnectors, setUserConnectors] = useState<Record<string, any>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<Connector | null>(null);
  const [connectMode, setConnectMode] = useState<'oauth' | 'api' | 'vault' | 'auto' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoUrl, setAutoUrl] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    const fetchConnectors = async () => {
      try {
        // Simulated large library of connectors
        const baseConnectors: Connector[] = [
          { id: 'salesforce', name: 'Salesforce', category: 'CRM', actions: ['Leads', 'Accounts'], status: 'disconnected' },
          { id: 'shopify', name: 'Shopify', category: 'E-commerce', actions: ['Orders', 'Products'], status: 'disconnected' },
          { id: 'slack', name: 'Slack', category: 'Messaging', actions: ['Channels', 'Messages'], status: 'disconnected' },
          { id: 'github', name: 'GitHub', category: 'DevTools', actions: ['Repos', 'Commits'], status: 'disconnected' },
          { id: 'notion', name: 'Notion', category: 'Productivity', actions: ['Pages', 'Databases'], status: 'disconnected' },
          { id: 'discord', name: 'Discord', category: 'Messaging', actions: ['Servers', 'Webhooks'], status: 'disconnected' },
          { id: 'hubspot', name: 'HubSpot', category: 'CRM', actions: ['Contacts', 'Deals'], status: 'disconnected' },
          { id: 'quickbooks', name: 'QuickBooks', category: 'Finance', actions: ['Invoices', 'Expenses'], status: 'disconnected' },
          { id: 'jira', name: 'Jira', category: 'DevTools', actions: ['Issues', 'Sprints'], status: 'disconnected' },
          { id: 'aws', name: 'AWS', category: 'Storage', actions: ['S3', 'Lambda'], status: 'disconnected' },
          { id: 'openai', name: 'OpenAI', category: 'AI Tools', actions: ['GPT-4', 'DALL-E'], status: 'disconnected' },
        ];
        
        // Add more simulated ones to reach "1000+" feel
        const extraConnectors: Connector[] = Array.from({ length: 20 }).map((_, i) => ({
          id: `app-${i}`,
          name: `App ${i + 100}`,
          category: CATEGORIES[Math.floor(Math.random() * (CATEGORIES.length - 1)) + 1],
          actions: ['Sync', 'Notify'],
          status: 'disconnected'
        }));

        setConnectors([...baseConnectors, ...extraConnectors]);
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

  const syncAllData = async () => {
    if (!user) return;
    setIsSyncing(true);
    toast.info('Initiating global sync across all platforms...');
    
    try {
      const updatedConnectors = await Promise.all(connectors.map(async (c) => {
        if (userConnectors[c.id]?.status === 'connected') {
          try {
            const data = await ConnectorService.getPlatformData(c.name, userConnectors[c.id].config);
            return { ...c, realtimeData: data };
          } catch (e) {
            return { ...c, status: 'error' as const };
          }
        }
        return c;
      }));
      
      setConnectors(updatedConnectors);
      toast.success('Global sync complete. Real-time metrics updated.');
    } catch (err) {
      toast.error('Global sync failed. Check platform health.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getIcon = (category: string, name?: string) => {
    if (name === 'Slack') return MessageSquare;
    if (name === 'GitHub') return Github;
    if (name === 'Shopify') return ShoppingCart;
    if (name === 'Salesforce') return Briefcase;
    if (name === 'OpenAI') return Wand2;

    switch(category) {
      case 'Social': return Globe;
      case 'Messaging': return MessageSquare;
      case 'Video': return Youtube;
      case 'Storage': return Database;
      case 'Developer': return Code;
      case 'DevTools': return Code;
      case 'Productivity': return Layout;
      case 'Finance': return DollarSign;
      case 'CRM': return Briefcase;
      case 'ERP': return Layers;
      case 'AI Tools': return Cpu;
      case 'E-commerce': return ShoppingCart;
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
        await ConnectorService.initiateOAuth(selectedPlatform.name);
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

  const handleAutoDiscover = async () => {
    if (!autoUrl || !user) return;
    setIsDiscovering(true);
    
    try {
      const template = await ConnectorService.discoverConnector(autoUrl);
      if (template) {
        const newConnector: Connector = {
          ...template,
          status: 'disconnected',
          icon: template.icon
        };
        setConnectors(prev => [newConnector, ...prev]);
        setSelectedPlatform(newConnector);
        setConnectMode(null);
        setAutoUrl('');
      }
    } catch (err) {
      toast.error('Failed to discover connector');
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 uppercase">Nexus Board 2.0</h2>
          <p className="text-zinc-500 text-xs sm:text-sm">Universal Integration Hub with 1000+ Apps & AI Auto-Connect.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex gap-3">
            <button 
              onClick={() => setConnectMode('auto')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-cyan-500 text-black px-4 py-3 rounded-2xl hover:bg-cyan-400 transition-all font-bold uppercase tracking-widest text-[10px] sm:text-xs"
            >
              <Wand2 size={18} />
              <span>Auto-Connect</span>
            </button>
            <button 
              onClick={syncAllData}
              disabled={isSyncing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-zinc-300 px-4 py-3 rounded-2xl hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin text-cyan-400' : ''} />
              <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest">Sync All</span>
            </button>
          </div>
          <div className="relative group flex-1 sm:flex-none">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search 1000+ apps..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all w-full sm:w-64 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat 
                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                : 'bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredConnectors.map((connector, idx) => {
          const Icon = getIcon(connector.category, connector.name);
          const metrics = connector.realtimeData?.metrics;
          
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
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

              {connector.status === 'connected' && metrics ? (
                <div className="grid grid-cols-2 gap-4 mb-6 p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Metric</p>
                    <p className="text-sm font-mono text-cyan-400">
                      {metrics.revenue ? `$${metrics.revenue.toLocaleString()}` : 
                       metrics.engagement ? `${metrics.engagement}%` : 
                       metrics.tasks ? `${metrics.tasks} Active` : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Latency</p>
                    <p className="text-sm font-mono text-zinc-400">{metrics.latency}ms</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {connector.actions.map(action => (
                      <span key={action} className="text-[10px] px-2 py-1 bg-white/5 rounded-md text-zinc-400">{action}</span>
                    ))}
                  </div>
                </div>
              )}

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
                    Connect
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {(selectedPlatform || connectMode === 'auto') && (
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
              {connectMode === 'auto' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <Wand2 size={20} />
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-tight">AI Auto-Connector</h3>
                    </div>
                    <button onClick={() => setConnectMode(null)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <p className="text-sm text-zinc-500">Provide an API Documentation URL, and the S+ AI Core will automatically map the schema and build the connector card for you.</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API Documentation URL</label>
                      <div className="relative">
                        <Link2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input 
                          type="url" 
                          placeholder="https://api.example.com/docs"
                          value={autoUrl}
                          onChange={(e) => setAutoUrl(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAutoDiscover}
                      disabled={isDiscovering || !autoUrl}
                      className="w-full bg-cyan-500 text-black font-bold py-4 rounded-2xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDiscovering ? (
                        <>
                          <RefreshCw size={20} className="animate-spin" />
                          Analyzing Schema...
                        </>
                      ) : (
                        <>
                          <Zap size={20} />
                          Generate Connector
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : selectedPlatform && (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-cyan-400">
                        {React.createElement(getIcon(selectedPlatform.category, selectedPlatform.name), { size: 20 })}
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
                            onClick={() => {
                              if (setActiveTab) {
                                setActiveTab('vault');
                                setSelectedPlatform(null);
                                setConnectMode(null);
                              } else {
                                handleConnect('vault');
                              }
                            }}
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
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
