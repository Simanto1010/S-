import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, googleProvider, signInWithPopup, db, doc, setDoc, onSnapshot, collection, query, where, serverTimestamp, getDoc, updateDoc, addDoc, orderBy, limit, getDocs, handleFirestoreError, OperationType
} from './firebase';
import Layout from './components/Layout';
import Auth from './components/Auth';
import CommandOrb from './components/CommandOrb';
import NexusBoard from './components/NexusBoard';
import ExecutionConsole from './components/ExecutionConsole';
import IdentityVault from './components/IdentityVault';
import SettingsDrawer from './components/SettingsDrawer';
import AutomationBuilder from './components/AutomationBuilder';
import ResultPanel from './components/ResultPanel';
import SystemHealthPanel from './components/SystemHealthPanel';
import AIControlCenter from './components/AIControlCenter';
import ProactiveAI from './components/ProactiveAI';
import GoalManager from './components/GoalManager';
import AutonomousCenter from './components/AutonomousCenter';
import ErrorBoundary from './components/ErrorBoundary';
import { orchestrateTask, getSmartSuggestions, getProactiveSuggestions, getDailyInsights, detectAutonomousOpportunities, generateAutonomousTask } from './services/aiService';
import { Sparkles, Zap, Shield, Globe, Cpu, History, Terminal, Settings, Activity, TrendingUp, Clock, Layers, Target, Brain } from 'lucide-react';
import { toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [proactiveSuggestions, setProactiveSuggestions] = useState<any[]>([]);
  const [dailyInsights, setDailyInsights] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [healthMetrics, setHealthMetrics] = useState<any[]>([]);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking' | 'executing' | 'healing'>('idle');
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [decisionLogs, setDecisionLogs] = useState<any[]>([]);
  const [memoryInsight, setMemoryInsight] = useState<string | undefined>();
  const [intent, setIntent] = useState<string | undefined>();
  const [settings, setSettings] = useState<any>(null);
  const [isAutonomousModeEnabled, setIsAutonomousModeEnabled] = useState(false);
  const [autonomousTasks, setAutonomousTasks] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    successRate: 99.4,
    avgLatency: '142ms',
    activeConnectors: 1024,
    taskLoad: '24%',
    cpu: 12,
    memory: 45,
    uptime: '14d 2h 12m'
  });

  useEffect(() => {
    if (user) {
      const fetchSuggestions = async () => {
        const sugs = await getSmartSuggestions(commandHistory);
        setSuggestions(sugs);
      };
      fetchSuggestions();
    }
  }, [commandHistory.length, user]);

  // Fetch dynamic metrics and history from Firestore
  useEffect(() => {
    if (!user) return;

    // Real-time history from Firestore
    const q = query(
      collection(db, 'history'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCommandHistory(historyData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'history');
    });

    // Real-time metrics (simulated but could be from a system collection)
    const fetchData = async () => {
      try {
        const metricsRes = await fetch('/api/metrics');
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(prev => ({ ...prev, ...metricsData }));
          setHealthMetrics(metricsData.health || []);
        }
      } catch (error) {
        if (error instanceof Error && error.message !== 'Failed to fetch') {
          console.error('Error fetching metrics:', error);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    
    // Fetch settings
    const settingsRef = doc(db, 'settings', user.uid);
    const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `settings/${user.uid}`);
    });

    // Real-time goals
    const goalsQuery = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'goals');
    });

    // Real-time autonomous tasks
    const tasksQuery = query(
      collection(db, 'autonomousTasks'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      setAutonomousTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'autonomousTasks');
    });

    // Real-time opportunities
    const oppsQuery = query(
      collection(db, 'opportunities'), 
      where('userId', '==', user.uid),
      where('status', '==', 'active'),
      orderBy('detectedAt', 'desc')
    );
    const unsubscribeOpps = onSnapshot(oppsQuery, (snapshot) => {
      setOpportunities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'opportunities');
    });

    return () => {
      unsubscribeHistory();
      unsubscribeSettings();
      unsubscribeGoals();
      unsubscribeTasks();
      unsubscribeOpps();
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (user && commandHistory.length >= 0) {
      const fetchProactive = async () => {
        const connectorsSnap = await getDocs(query(collection(db, 'userConnectors'), where('userId', '==', user.uid), where('status', '==', 'connected')))
          .catch(err => handleFirestoreError(err, OperationType.GET, 'userConnectors'));
        
        if (!connectorsSnap) return;
        
        const connectedPlatforms = connectorsSnap.docs.map(d => d.data().connectorId);
        
        const [proSugs, insights] = await Promise.all([
          getProactiveSuggestions({
            history: commandHistory,
            connectors: connectedPlatforms,
            goals: goals,
            timeOfDay: new Date().toLocaleTimeString()
          }),
          getDailyInsights(commandHistory)
        ]);
        
        setProactiveSuggestions(proSugs);
        setDailyInsights(insights);
      };
      
      const timeout = setTimeout(fetchProactive, 2000); // Debounce
      return () => clearTimeout(timeout);
    }
  }, [user, commandHistory.length, goals.length]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          lastLogin: serverTimestamp(),
        }, { merge: true });
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'ai' = 'info') => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date()
    };
    setLogs(prev => [...prev, newLog]);
    
    // Also add to decision logs if it's AI or healing
    if (type === 'ai' || type === 'error') {
      setDecisionLogs(prev => [{
        id: newLog.id,
        timestamp: newLog.timestamp,
        type: type === 'ai' ? 'reasoning' : 'error',
        message: newLog.message
      }, ...prev].slice(0, 50));
    }
  };

  useEffect(() => {
    if (user && isAutonomousModeEnabled) {
      const autonomousLoop = async () => {
        try {
          // 1. Detect Opportunities
          const connectorsSnap = await getDocs(query(collection(db, 'userConnectors'), where('userId', '==', user.uid), where('status', '==', 'connected')))
            .catch(err => handleFirestoreError(err, OperationType.GET, 'userConnectors'));
          
          if (!connectorsSnap) return;

          const connectedPlatforms = connectorsSnap.docs.map(d => d.data().connectorId);
          
          const newOpps = await detectAutonomousOpportunities({
            history: commandHistory,
            connectors: connectedPlatforms,
            goals: goals,
            lastActivity: (commandHistory[0]?.timestamp?.toDate() || new Date()).toISOString()
          });

          // Save new opportunities to Firestore (if they don't already exist or are fresh)
          for (const opp of newOpps) {
            const exists = opportunities.some(o => o.title === opp.title);
            if (!exists) {
              await addDoc(collection(db, 'opportunities'), {
                ...opp,
                userId: user.uid,
                detectedAt: serverTimestamp(),
                status: 'active'
              });
              
              // 2. Generate Task for high priority opportunities
              if (opp.priority === 'high') {
                const task = await generateAutonomousTask(opp, {
                  history: commandHistory,
                  connectors: connectedPlatforms,
                  goals: goals
                });
                
                await addDoc(collection(db, 'autonomousTasks'), {
                  ...task,
                  userId: user.uid,
                  createdAt: serverTimestamp(),
                  status: 'pending',
                  opportunityId: opp.title // use title as a simple link for now
                });
                
                toast.info(`New Autonomous Suggestion: ${task.title}`, {
                  description: "Review in Autonomous Center",
                  action: {
                    label: "View",
                    onClick: () => setActiveTab('autonomous')
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error('Autonomous loop error:', error);
        }
      };

      const interval = setInterval(autonomousLoop, 60000 * 5); // Every 5 minutes
      autonomousLoop(); // Run once on enable
      return () => clearInterval(interval);
    }
  }, [user, isAutonomousModeEnabled, commandHistory.length, goals.length]);

  const handleApproveTask = async (taskId: string) => {
    const task = autonomousTasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await updateDoc(doc(db, 'autonomousTasks', taskId), { status: 'approved' });
      toast.success('Task approved. Executing...');
      handleCommand(task.command);
      await updateDoc(doc(db, 'autonomousTasks', taskId), { status: 'executed' });
    } catch (err) {
      toast.error('Failed to process task');
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'autonomousTasks', taskId), { status: 'rejected' });
      toast.info('Task rejected');
    } catch (err) {
      toast.error('Failed to reject task');
    }
  };

  const handleIgnoreOpportunity = async (id: string) => {
    try {
      await updateDoc(doc(db, 'opportunities', id), { status: 'ignored' });
    } catch (err) {
      toast.error('Failed to ignore opportunity');
    }
  };

  const handleCommand = async (command: string) => {
    if (!user) return;
    setIsProcessing(true);
    setAiStatus('thinking');
    setCurrentTask(command);
    setResults([]);
    setExecutionSteps([]);
    setCurrentPlan(null);
    setActiveTab('console');
    addLog(`Received command: "${command}"`, 'info');
    
    try {
      // Gather context
      const connectorsSnap = await getDocs(query(collection(db, 'userConnectors'), where('userId', '==', user.uid), where('status', '==', 'connected')))
        .catch(err => handleFirestoreError(err, OperationType.GET, 'userConnectors'));
      
      if (!connectorsSnap) return; // Error handled by handleFirestoreError

      const connectedPlatforms = connectorsSnap.docs.map(d => d.data().connectorId);
      
      const vaultSnap = await getDocs(query(collection(db, 'vault'), where('userId', '==', user.uid)))
        .catch(err => handleFirestoreError(err, OperationType.GET, 'vault'));
      
      if (!vaultSnap) return; // Error handled by handleFirestoreError

      const vaultItems = vaultSnap.docs.map(d => d.data().name);

      const goalsSnap = await getDocs(query(collection(db, 'goals'), where('userId', '==', user.uid)))
        .catch(err => handleFirestoreError(err, OperationType.GET, 'goals'));
      
      const activeGoals = goalsSnap ? goalsSnap.docs.map(d => d.data().title) : [];

      addLog("Initializing S+ Autonomous Agent (Gemini 1.5 Pro)...", 'ai');
      const plan = await orchestrateTask(command, { 
        history: commandHistory, 
        connectors: connectedPlatforms,
        vault: vaultItems,
        // @ts-ignore - adding goals to context
        goals: activeGoals
      });
      
      setMemoryInsight(plan.memoryInsight);
      setIntent(plan.intent);

      setDecisionLogs(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        type: 'action',
        message: `Decision Engine selected: ${plan.modelUsed} for this task sequence.`
      }, ...prev]);

      if (plan.memoryInsight) {
        setDecisionLogs(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          type: 'memory',
          message: `Memory Insight: ${plan.memoryInsight}`
        }, ...prev]);
      }

      plan.reasoning.forEach((reason: string) => {
        setDecisionLogs(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          type: 'reasoning',
          message: reason
        }, ...prev]);
      });

      // Ensure steps have unique IDs for React keys
      const planWithIds = {
        ...plan,
        steps: plan.steps.map((step: any, index: number) => ({
          ...step,
          id: step.id || `step-${index}-${Date.now()}`
        }))
      };
      setCurrentPlan(planWithIds);
      
      addLog(`AI Reasoning: ${planWithIds.reasoning[0]}`, 'ai');
      addLog(`Execution Plan: ${planWithIds.summary}`, 'ai');

      const newResults: any[] = [];
      setAiStatus('executing');

      for (const step of planWithIds.steps) {
        setExecutionSteps(prev => [...prev, { ...step, status: 'executing' }]);
        
        let success = false;
        let attempt = 1;
        const maxAttempts = 3;

        while (!success && attempt <= maxAttempts) {
          addLog(`Executing: ${step.action} on ${step.platform} (Attempt ${attempt})...`, 'info');
          
          const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: step.action, platform: step.platform, attempt, step })
          });
          const data = await res.json();
          
          if (res.ok && data.status === 'success') {
            addLog(data.message, 'success');
            setExecutionSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'completed', result: data.result } : s));
            
            if (data.result) {
              newResults.push({
                id: Math.random().toString(36).substr(2, 9),
                type: step.platform === 'YouTube' ? 'video' : 'link',
                title: `${step.platform} Result`,
                content: data.result.summary || data.result.caption || data.message,
                thumbnail: data.result.thumbnail,
                url: data.result.url,
                platform: step.platform
              });
            }
            success = true;
          } else {
            setAiStatus('healing');
            addLog(`${data.message || 'Error'}. Recovery: ${data.recoveryAction || 'Retrying...'}`, 'error');
            
            setDecisionLogs(prev => [{
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date(),
              type: 'healing',
              message: `Detected failure in ${step.platform}. Triggering self-healing: ${data.recoveryAction || 'Retrying...'}`
            }, ...prev]);

            attempt++;
            
            setExecutionSteps(prev => prev.map(s => s.id === step.id ? { 
              ...s, 
              status: 'retrying', 
              error: data.message,
              recovery: plan.selfHealing[data.error] || data.recoveryAction || 'Retrying with alternative parameters...'
            } : s));

            if (attempt <= maxAttempts) {
              addLog(`Self-healing: ${plan.selfHealing[data.error] || 'Retrying with alternative parameters...'}`, 'ai');
              await new Promise(r => setTimeout(r, 2000));
              setAiStatus('executing');
            }
          }
        }

        if (!success) {
          addLog(`Step failed after ${maxAttempts} attempts. Aborting sequence.`, 'error');
          setExecutionSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'failed' } : s));
          break;
        }
      }

      setResults(newResults);
      
      // Save to Firestore history
      await addDoc(collection(db, 'history'), {
        userId: user.uid,
        command,
        timestamp: serverTimestamp(),
        status: 'success',
        results: newResults.length
      });

      addLog("All tasks completed successfully.", 'success');

      // Voice Feedback
      if ('speechSynthesis' in window && (settings?.voiceEnabled !== false)) {
        const utterance = new SpeechSynthesisUtterance("All tasks completed successfully.");
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      addLog(`Error during execution: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
      setAiStatus('idle');
      setCurrentTask(null);
    }
  };

  const handleAddGoal = async (title: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'goals'), {
        userId: user.uid,
        title,
        progress: 0,
        status: 'active',
        createdAt: serverTimestamp()
      });
      toast.success('Strategic goal added');
    } catch (err) {
      toast.error('Failed to add goal');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'goals', id), { status: 'deleted' });
      // For simplicity, we just filter out in UI or delete
      // await deleteDoc(doc(db, 'goals', id));
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  const handleIgnoreSuggestion = (id: string) => {
    setProactiveSuggestions(prev => prev.filter(s => s.id !== id));
    toast.info('Suggestion dismissed');
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
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={user}
      onSettingsClick={() => setIsSettingsOpen(true)}
    >
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={user}
      />

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
              <p className="text-zinc-500">System is online. {metrics.activeConnectors} connectors active across 4 devices.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.successRate}%</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Success Rate</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{typeof metrics.avgLatency === 'number' ? `${metrics.avgLatency}ms` : metrics.avgLatency}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Avg Latency</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Layers size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.activeConnectors}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Active Plugins</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.taskLoad}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">System Load</p>
                </div>
              </div>
            </div>

            <CommandOrb onCommand={handleCommand} isProcessing={isProcessing} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-12">
                {/* Proactive AI Section */}
                <ProactiveAI 
                  suggestions={proactiveSuggestions}
                  insights={dailyInsights}
                  onRun={handleCommand}
                  onEdit={(cmd) => {
                    // In a real app, this might populate the command orb
                    handleCommand(cmd);
                  }}
                  onIgnore={handleIgnoreSuggestion}
                />

                {/* Strategic Goals */}
                <GoalManager 
                  goals={goals.filter(g => g.status !== 'deleted')}
                  onAdd={handleAddGoal}
                  onDelete={handleDeleteGoal}
                />

                <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <History size={20} className="text-cyan-400" />
                      Recent Activity
                    </h3>
                    <button className="text-sm text-cyan-400 hover:underline">View History</button>
                  </div>
                  <div className="space-y-4">
                    {commandHistory.length > 0 ? commandHistory.map((cmd, i) => (
                      <div key={cmd.id || i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${cmd.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <div className="overflow-hidden">
                            <span className="font-medium text-sm block truncate max-w-md">{cmd.command}</span>
                            <span className="text-[10px] text-zinc-500">
                              {cmd.timestamp?.toDate ? cmd.timestamp.toDate().toLocaleString() : new Date(cmd.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">{cmd.status}</span>
                      </div>
                    )) : (
                      <p className="text-center text-zinc-600 py-8">No recent commands.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <SystemHealthPanel 
                  metrics={healthMetrics} 
                  isChecking={isHealthChecking} 
                  onRefresh={async () => {
                    setIsHealthChecking(true);
                    try {
                      const res = await fetch('/api/metrics');
                      const data = await res.json();
                      setMetrics(prev => ({ ...prev, ...data }));
                      setHealthMetrics(data.health || []);
                    } finally {
                      setIsHealthChecking(false);
                    }
                  }} 
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'nexus' && <NexusBoard />}
        {activeTab === 'console' && (
          <div className="space-y-8">
            <ExecutionConsole 
              logs={logs} 
              steps={executionSteps} 
              isExecuting={isProcessing} 
              plan={currentPlan} 
            />
            <ResultPanel results={results} />
          </div>
        )}
        {activeTab === 'ai-control' && (
          <AIControlCenter 
            status={aiStatus}
            currentTask={currentTask}
            memoryInsight={memoryInsight}
            intent={intent}
            health={{
              cpu: metrics.cpu,
              memory: metrics.memory,
              latency: metrics.avgLatency,
              uptime: metrics.uptime
            }}
            decisionLogs={decisionLogs}
          />
        )}
        {activeTab === 'autonomous' && (
          <AutonomousCenter 
            isEnabled={isAutonomousModeEnabled}
            onToggle={setIsAutonomousModeEnabled}
            opportunities={opportunities}
            tasks={autonomousTasks}
            onApprove={handleApproveTask}
            onReject={handleRejectTask}
            onIgnoreOpportunity={handleIgnoreOpportunity}
          />
        )}
        {activeTab === 'vault' && <IdentityVault />}
        {activeTab === 'automation' && <AutomationBuilder />}
      </AnimatePresence>
    </Layout>
    </ErrorBoundary>
  );
}
