import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  auth, googleProvider, signInWithPopup, db, doc, setDoc, onSnapshot, collection, query, where, serverTimestamp 
} from './firebase';
import Layout from './components/Layout';
import CommandOrb from './components/CommandOrb';
import NexusBoard from './components/NexusBoard';
import ExecutionConsole from './components/ExecutionConsole';
import IdentityVault from './components/IdentityVault';
import { orchestrateTask } from './services/aiService';
import { Sparkles, Zap, Shield, Globe, Cpu } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
        }, { merge: true });
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'ai' = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date()
    }]);
  };

  const handleCommand = async (command: string) => {
    setIsProcessing(true);
    setActiveTab('console');
    addLog(`Received command: "${command}"`, 'info');
    
    try {
      addLog("Initializing S+ Brain (Gemini 1.5 Pro)...", 'ai');
      const plan = await orchestrateTask(command);
      
      addLog(`AI Reasoning: ${plan.reasoning[0]}`, 'ai');
      addLog(`Execution Plan: ${plan.summary}`, 'ai');

      for (const step of plan.steps) {
        addLog(`Connecting to ${step.platform}...`, 'info');
        await new Promise(r => setTimeout(r, 1500)); // Simulate work
        addLog(`Executing: ${step.action} - ${step.description}`, 'ai');
        
        // Call mock backend
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: step.action, platform: step.platform })
        });
        const data = await res.json();
        addLog(data.message, 'success');
      }

      addLog("All tasks completed successfully.", 'success');
    } catch (error) {
      addLog(`Error during execution: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center z-10"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.3)] mx-auto mb-8">
            <span className="text-4xl font-black italic">S+</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-4">SYSTEM PLUS</h1>
          <p className="text-xl text-zinc-500 mb-12 max-w-lg mx-auto">
            The Universal AI Connector Platform. Control 100+ apps and devices from a single command dashboard.
          </p>

          <button
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="bg-white text-black px-8 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all flex items-center gap-3 mx-auto shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            <Globe size={24} />
            Initialize System
          </button>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
            {[
              { icon: Zap, title: "Instant Automation", desc: "Connect APIs and browser agents in seconds." },
              { icon: Shield, title: "Identity Vault", desc: "Military-grade encryption for your credentials." },
              { icon: Cpu, title: "Gemini Brain", desc: "Powered by the world's most advanced AI models." }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left">
                <feature.icon className="text-cyan-400 mb-4" size={24} />
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user}>
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="flex flex-col items-center text-center">
              <h1 className="text-4xl font-black tracking-tight mb-4">Welcome back, {user.displayName?.split(' ')[0]}</h1>
              <p className="text-zinc-500">System is online. 124 connectors active across 4 devices.</p>
            </div>

            <CommandOrb onCommand={handleCommand} isProcessing={isProcessing} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Recent Automations</h3>
                  <button className="text-sm text-cyan-400 hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                  {[
                    { title: "YouTube Upload", status: "completed", time: "12m ago" },
                    { title: "LinkedIn Summary", status: "completed", time: "1h ago" },
                    { title: "Notion Sync", status: "failed", time: "3h ago" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <span className="text-xs text-zinc-500 font-mono">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">System Health</h3>
                  <Sparkles size={20} className="text-cyan-400" />
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-500">AI Processing Load</span>
                      <span className="text-cyan-400">24%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[24%] bg-cyan-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-500">Connector Latency</span>
                      <span className="text-emerald-400">12ms</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[12%] bg-emerald-500" />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <div className="flex-1 p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-center">
                      <p className="text-2xl font-bold">124</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Connectors</p>
                    </div>
                    <div className="flex-1 p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-center">
                      <p className="text-2xl font-bold">1.2k</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Tasks/Mo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'nexus' && <NexusBoard />}
        {activeTab === 'console' && <ExecutionConsole logs={logs} />}
        {activeTab === 'vault' && <IdentityVault />}
        {activeTab === 'automation' && (
          <div className="flex flex-col items-center justify-center h-[600px] text-zinc-600">
            <Zap size={64} strokeWidth={1} className="mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">Automation Builder</h3>
            <p>Visual workflow builder is coming soon in the next update.</p>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
