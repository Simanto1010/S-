import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, googleProvider, signInWithPopup, db, doc, setDoc, onSnapshot, collection, query, where, serverTimestamp, getDoc, updateDoc, addDoc, orderBy, limit, getDocs, handleFirestoreError, OperationType
} from './firebase';
import Layout from './components/Layout';
import Auth from './components/Auth';
import { UpdatePrompt } from './components/UpdatePrompt';
import { VersionService, AppVersion } from './services/versionService';

// Lazy load non-critical components
const CommandOrb = lazy(() => import('./components/CommandOrb'));
const NexusBoard = lazy(() => import('./components/NexusBoard'));
const ExecutionConsole = lazy(() => import('./components/ExecutionConsole'));
const IdentityVault = lazy(() => import('./components/IdentityVault'));
const SettingsDrawer = lazy(() => import('./components/SettingsDrawer'));
const AutomationBuilder = lazy(() => import('./components/AutomationBuilder'));
const ResultPanel = lazy(() => import('./components/ResultPanel'));
const SystemHealthPanel = lazy(() => import('./components/SystemHealthPanel'));
const AIControlCenter = lazy(() => import('./components/AIControlCenter'));
const ProactiveAI = lazy(() => import('./components/ProactiveAI'));
const GoalManager = lazy(() => import('./components/GoalManager'));
const AutonomousCenter = lazy(() => import('./components/AutonomousCenter'));
const SubscriptionManager = lazy(() => import('./components/SubscriptionManager'));
import AdminPaymentVerification from './components/AdminPaymentVerification';
import AdminGuard from './components/AdminGuard';
const Usage = lazy(() => import('./components/Usage'));
const SystemStatus = lazy(() => import('./components/SystemStatus').then(m => ({ default: m.SystemStatus })));
const TaskSwipeQueue = lazy(() => import('./components/TaskSwipeQueue'));
const VoiceOS = lazy(() => import('./components/VoiceOS').then(m => ({ default: m.VoiceOS })));
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'));
const PredictiveDashboard = lazy(() => import('./components/PredictiveDashboard').then(m => ({ default: m.PredictiveDashboard })));
const TeamHub = lazy(() => import('./components/TeamHub').then(m => ({ default: m.TeamHub })));
import { orchestrateTask, getSmartSuggestions, getProactiveSuggestions, getDailyInsights, detectAutonomousOpportunities, generateAutonomousTask, isAiCooldownActive } from './services/aiService';
import { ExecutionService } from './services/executionService';
import { TemplateService } from './services/templateService';
import { TeamService } from './services/teamService';
import { NotificationService } from './services/notificationService';
import { MemoryService } from './services/memoryService';
import { SaaSService, PlanType, PLAN_LIMITS } from './services/saasService';
import { HealthCheckService, HealthStatus } from './services/healthCheckService';
import { ActivityLogService } from './services/activityLogService';
import { ErrorRetryService } from './services/errorRetryService';
import { Sparkles, Zap, Shield, Globe, Cpu, History, Terminal, Settings, Activity, TrendingUp, Clock, Layers, Target, Brain, Bell, CreditCard, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [splashLoading, setSplashLoading] = useState(true);
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
  const [currentPlan, setCurrentPlan] = useState<PlanType>(PlanType.FREE);
  const [aiPlan, setAiPlan] = useState<any>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthStatus[]>([]);
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
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [newVersion, setNewVersion] = useState<AppVersion | null>(null);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'degraded' | 'down'>('healthy');
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
    // 1. System Health Check on Start
    const runInitialHealthCheck = async () => {
      try {
        const results = await HealthCheckService.runFullCheck();
        const isDown = results.some(r => r.status === 'down');
        const isDegraded = results.some(r => r.status === 'degraded');
        setSystemHealth(isDown ? 'down' : isDegraded ? 'degraded' : 'healthy');
        
        if (isDown) {
          toast.error("System Issue Detected", {
            description: "Some services are currently unavailable. Retrying...",
          });
        }
      } catch (err) {
        setSystemHealth('down');
      }
    };

    // 2. Version Control & Auto Update
    const unsubscribeVersion = VersionService.subscribeToVersion((versionData) => {
      const current = VersionService.getCurrentVersion();
      if (versionData.version !== current) {
        setNewVersion(versionData);
        setShowUpdatePrompt(true);
        
        // Force update if critical or version is too old
        if (versionData.critical || !VersionService.isCompatible(current, versionData.minVersion)) {
          toast.warning("Critical Update Required", {
            description: "A mandatory system update is being applied.",
          });
        }
      }
    });

    // 3. Service Worker Update Listener
    const handleSWUpdate = () => {
      setShowUpdatePrompt(true);
    };
    window.addEventListener('sw-update-available', handleSWUpdate);

    // 4. Network Status Monitoring
    const handleOnline = () => {
      toast.success("Back Online", {
        description: "Re-establishing system connections...",
      });
      runInitialHealthCheck();
      // Trigger any pending syncs here
    };
    const handleOffline = () => {
      toast.error("Connection Lost", {
        description: "System is running in offline mode. Some features may be limited.",
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    runInitialHealthCheck();
    
    return () => {
      unsubscribeVersion();
      window.removeEventListener('sw-update-available', handleSWUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  useEffect(() => {
    // Log performance metrics
    if (window.performance) {
      const loadTime = window.performance.now();
      console.log(`[Kernel] App Load Time: ${loadTime.toFixed(2)}ms`);
      
      if (user) {
        ActivityLogService.log(user.uid, `App loaded in ${loadTime.toFixed(2)}ms`, 'info', 'system', {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        });
      }
    }
  }, [user]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    if (user) {
      // Initialize Notifications
      NotificationService.requestPermission();
      NotificationService.listenForMessages();
      
      const fetchSuggestions = async () => {
        if (isAiCooldownActive()) return;
        const sugs = await getSmartSuggestions(commandHistory);
        setSuggestions(sugs);
      };

      // Debounce suggestions fetch to avoid quota limits
      const timeout = setTimeout(fetchSuggestions, 30000); // Increased to 30s
      return () => clearTimeout(timeout);
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
      await ErrorRetryService.execute(async () => {
        // Run real health checks
        const healthResults = await HealthCheckService.runFullCheck();
        setHealthMetrics(healthResults);

        const metricsRes = await fetch('/api/metrics');
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(prev => ({ ...prev, ...metricsData }));
        }
      }, { context: 'System Metrics', maxRetries: 2 });
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

    // Fetch or Create Default Workspace
    const fetchWorkspace = async () => {
      await ErrorRetryService.execute(async () => {
        const q = query(collection(db, 'workspaces'), where('ownerId', '==', user.uid));
        const snap = await getDocs(q);
        if (snap.empty) {
          const id = await TeamService.createWorkspace(user.uid, `${user.displayName}'s Workspace`);
          setCurrentWorkspaceId(id);
        } else {
          setCurrentWorkspaceId(snap.docs[0].id);
        }
      }, { context: 'Workspace Initialization' });
    };
    fetchWorkspace();

    // Fetch Subscription
    const unsubscribeSub = onSnapshot(doc(db, 'subscriptions', user.uid), (doc) => {
      if (doc.exists()) {
        setCurrentPlan(doc.data().plan as PlanType);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `subscriptions/${user.uid}`);
    });

    return () => {
      unsubscribeHistory();
      unsubscribeSettings();
      unsubscribeGoals();
      unsubscribeTasks();
      unsubscribeOpps();
      unsubscribeSub();
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (user && commandHistory.length >= 0) {
      const fetchProactive = async () => {
        if (isAiCooldownActive()) return;
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
      
      const timeout = setTimeout(fetchProactive, 120000); // Increased to 120s
      return () => clearTimeout(timeout);
    }
  }, [user, commandHistory.length, goals.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        let userData = userSnap.exists() ? userSnap.data() : null;
        
        const isEmailAdmin = firebaseUser.email === 'mbidhan474@gmail.com';
        
        if (isEmailAdmin && !userData?.role) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            lastLogin: serverTimestamp(),
            role: 'admin'
          }, { merge: true });
          // Refresh user data after setting role
          const updatedSnap = await getDoc(userRef);
          userData = updatedSnap.data();
        } else {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            lastLogin: serverTimestamp(),
          }, { merge: true });
        }

        const isRoleAdmin = userData?.role === 'admin';
        setIsAdmin(isEmailAdmin && isRoleAdmin);

        // Initialize subscription if not exists
        const subRef = doc(db, 'subscriptions', firebaseUser.uid);
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          await setDoc(subRef, {
            userId: firebaseUser.uid,
            plan: PlanType.FREE,
            status: 'active',
            features: PLAN_LIMITS[PlanType.FREE],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setIsAdmin(false);
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
        if (isAiCooldownActive()) return;
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

      const interval = setInterval(autonomousLoop, 60000 * 10); // Increased to 10 minutes
      autonomousLoop(); // Run once on enable
      return () => clearInterval(interval);
    }
  }, [user, isAutonomousModeEnabled]); // Removed commandHistory.length and goals.length

  const handleApproveTask = async (taskOrId: any) => {
    const task = typeof taskOrId === 'string' 
      ? autonomousTasks.find(t => t.id === taskOrId) 
      : taskOrId;
      
    if (!task) return;

    try {
      // Update Firestore if it's a persistent task
      if (task.id && !task.id.startsWith('temp-')) {
        await updateDoc(doc(db, 'autonomousTasks', task.id), { status: 'approved' });
      }

      setAutonomousTasks(prev => prev.filter(t => t.id !== task.id));
      toast.success(`Executing: ${task.title}`);
      
      // Trigger actual execution logic
      setAiStatus('executing');
      setCurrentTask(task.title);
      
      // Simulate execution of the autonomous task
      const steps = task.steps || [{ id: 'step-1', action: task.command || task.title, platform: 'System', status: 'pending' }];
      for (const step of steps) {
        setExecutionSteps(prev => [...prev, { ...step, status: 'running' }]);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setExecutionSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'completed' } : s));
      }
      
      setResults(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        task: task.title,
        status: 'success',
        timestamp: new Date().toISOString(),
        data: `Autonomous task "${task.title}" completed successfully.`
      }]);
      
      // Save to memory
      await MemoryService.saveMemory(task.title, {
        type: 'task',
        outcome: 'success',
        timestamp: new Date()
      });

      if (task.id && !task.id.startsWith('temp-')) {
        await updateDoc(doc(db, 'autonomousTasks', task.id), { status: 'executed' });
      }
      
    } catch (error) {
      console.error('Task approval error:', error);
      toast.error(`Failed to execute ${task.title}`);
    } finally {
      setAiStatus('idle');
      setCurrentTask(null);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      if (!taskId.startsWith('temp-')) {
        await updateDoc(doc(db, 'autonomousTasks', taskId), { status: 'rejected' });
      }
      setAutonomousTasks(prev => prev.filter(t => t.id !== taskId));
      toast.info('Task rejected');
    } catch (err) {
      toast.error('Failed to reject task');
    }
  };

  const handleIgnoreOpportunity = async (id: string) => {
    try {
      if (!id.startsWith('temp-')) {
        await updateDoc(doc(db, 'opportunities', id), { status: 'ignored' });
      }
      setOpportunities(prev => prev.filter(o => o.id !== id));
      toast.info('Opportunity ignored');
    } catch (err) {
      toast.error('Failed to ignore opportunity');
    }
  };

  const handleCommand = async (command: string) => {
    if (!user) return;

    // 1. Check AI Cooldown
    const { isAiCooldownActive, getCooldownRemaining } = await import('./services/aiService');
    if (isAiCooldownActive()) {
      const remaining = getCooldownRemaining();
      toast.error("System Cooling Down", {
        description: `AI Core is recovering from quota limits. Please wait ${remaining}s.`,
        duration: 5000
      });
      return;
    }

    // 2. Check Usage Limits
    const canRunAI = await SaaSService.checkLimit(user.uid, 'aiCalls');
    if (!canRunAI) {
      toast.error("AI Limit Reached", {
        description: "Please upgrade to PRO for unlimited AI access.",
        action: {
          label: "Upgrade",
          onClick: () => setActiveTab('subscription')
        }
      });
      return;
    }

    setIsProcessing(true);
    setAiStatus('thinking');
    setCurrentTask(command);
    setResults([]);
    setExecutionSteps([]);
    setAiPlan(null);
    setActiveTab('console');
    addLog(`Received command: "${command}"`, 'info');
    ActivityLogService.log(user.uid, `User command: ${command}`, 'info', 'ai');
    
    try {
      // Track AI Call usage
      await SaaSService.trackUsage(user.uid, 'aiCalls');

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
      setAiPlan(planWithIds);
      setExecutionSteps(planWithIds.steps.map((s: any) => ({ ...s, status: 'pending' })));
      
      addLog(`AI Reasoning: ${planWithIds.reasoning[0]}`, 'ai');
      addLog(`Execution Plan: ${planWithIds.summary}`, 'ai');

      setAiStatus('executing');

      const executionResults = await ExecutionService.executePlan(planWithIds, user.uid, {
        onLog: (msg, type) => addLog(msg, type as any),
        onStepUpdate: (stepId, status, result, error) => {
          setExecutionSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: status as any, result, error } : s));
          if (status === 'completed') {
            SaaSService.trackUsage(user.uid, 'executions');
          }
        },
        onStatusChange: (status) => setAiStatus(status as any)
      });

      const newResults = executionResults
        .filter(r => r.status === 'success' || r.status === 'success_via_plan_b')
        .map(r => {
          const step = planWithIds.steps.find((s: any) => s.id === r.stepId);
          return {
            id: Math.random().toString(36).substr(2, 9),
            type: step?.platform === 'YouTube' ? 'video' : 'link',
            title: `${step?.platform || 'Task'} Result`,
            content: r.result?.summary || r.result?.caption || r.result?.message || 'Task completed',
            thumbnail: r.result?.thumbnail,
            url: r.result?.url,
            platform: step?.platform
          };
        });

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

  const handleSaveTemplate = async () => {
    if (!user || !aiPlan || !currentTask) return;
    try {
      await TemplateService.saveAsTemplate(
        `Automation: ${currentTask.substring(0, 30)}...`,
        aiPlan.summary,
        currentTask,
        aiPlan.steps,
        user.uid
      );
      toast.success('Task saved as automation template');
    } catch (err) {
      toast.error('Failed to save template');
    }
  };

  if (splashLoading || loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <UpdatePrompt 
        show={showUpdatePrompt}
        onUpdate={handleUpdate}
        onClose={() => setShowUpdatePrompt(false)}
        isCritical={newVersion?.critical || (newVersion && !VersionService.isCompatible(VersionService.getCurrentVersion(), newVersion.minVersion))}
        message={newVersion?.message}
      />

      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user}
        onSettingsClick={() => setIsSettingsOpen(true)}
        isAdmin={isAdmin}
      >
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-top-cyan-500 rounded-full animate-spin" />
        </div>
      }>
        <SettingsDrawer 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          user={user}
          deferredPrompt={deferredPrompt}
          onInstall={handleInstallApp}
        />

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 md:space-y-12 max-w-7xl mx-auto px-4 sm:px-6"
            >
              {/* System Health Status Indicator */}
              <div className="flex justify-end px-4 -mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                  systemHealth === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  systemHealth === 'degraded' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    systemHealth === 'healthy' ? 'bg-emerald-500' :
                    systemHealth === 'degraded' ? 'bg-amber-500' :
                    'bg-rose-500'
                  } ${systemHealth !== 'healthy' ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {systemHealth === 'healthy' ? 'All Systems Working' : 
                     systemHealth === 'degraded' ? 'Degraded Performance' : 
                     'System Issue Detected'}
                  </span>
                </div>
              </div>

              {/* Memory Insight Banner */}
            {memoryInsight && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-start gap-4"
              >
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 shrink-0">
                  <Brain size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-cyan-400">Long-Term Memory Insight</p>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">{memoryInsight}</p>
                </div>
              </motion.div>
            )}

            <div className="flex flex-col items-center text-center px-4">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Welcome back, {user.displayName?.split(' ')[0]}</h1>
              <p className="text-sm md:text-base text-zinc-500 max-w-2xl">System is online. {metrics.activeConnectors} connectors active across 4 devices.</p>
            </div>

            {/* Swipe Queue for Autonomous Tasks */}
            {autonomousTasks.length > 0 && (
              <div className="max-w-xl mx-auto w-full space-y-4 px-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                    <Bell className="text-cyan-400" size={20} />
                    Approval Queue
                  </h3>
                  <span className="text-[10px] md:text-xs font-mono text-zinc-500">{autonomousTasks.length} Pending</span>
                </div>
                <TaskSwipeQueue 
                  tasks={autonomousTasks}
                  onApprove={(task) => handleApproveTask(task)}
                  onDecline={(task) => handleRejectTask(task.id)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-4">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-6 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                  <TrendingUp size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">{metrics.successRate}%</p>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Success Rate</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-6 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Clock size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">{typeof metrics.avgLatency === 'number' ? `${metrics.avgLatency}ms` : metrics.avgLatency}</p>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Avg Latency</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-6 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Layers size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">{metrics.activeConnectors}</p>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Active Plugins</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-6 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                  <Activity size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">{metrics.taskLoad}</p>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">System Load</p>
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

                <div className="mt-12">
                  <SubscriptionManager user={user} />
                </div>

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
                      const healthResults = await HealthCheckService.runFullCheck();
                      setHealthMetrics(healthResults);
                      
                      const res = await fetch('/api/metrics');
                      const data = await res.json();
                      setMetrics(prev => ({ ...prev, ...data }));
                    } finally {
                      setIsHealthChecking(false);
                    }
                  }} 
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'nexus' && <NexusBoard setActiveTab={setActiveTab} />}
        {activeTab === 'analytics' && currentWorkspaceId && (
          <PredictiveDashboard userId={user.uid} workspaceId={currentWorkspaceId} />
        )}
        {activeTab === 'team' && currentWorkspaceId && (
          <TeamHub userId={user.uid} workspaceId={currentWorkspaceId} />
        )}
        {activeTab === 'console' && (
          <div className="space-y-8">
            <ExecutionConsole 
              logs={logs} 
              steps={executionSteps} 
              isExecuting={isProcessing} 
              plan={aiPlan} 
            />
            {aiPlan && !isProcessing && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleSaveTemplate}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 transition-colors"
              >
                <Layers className="w-3 h-3" />
                Save as Automation Template
              </motion.button>
            )}
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
        {activeTab === 'subscription' && (
          <SubscriptionManager user={user} />
        )}
        {activeTab === 'admin-payments' && isAdmin && (
          <AdminGuard>
            <AdminPaymentVerification />
          </AdminGuard>
        )}
        {activeTab === 'usage' && (
          <Usage 
            user={user} 
            currentPlan={currentPlan} 
          />
        )}
        {activeTab === 'health' && <SystemStatus />}
        {activeTab === 'vault' && <IdentityVault />}
        {activeTab === 'automation' && <AutomationBuilder />}
      </AnimatePresence>
      </Suspense>
      </Layout>

      <Suspense fallback={null}>
        {deferredPrompt && (
          <PWAInstallPrompt 
            onInstall={handleInstallApp} 
            onClose={() => setDeferredPrompt(null)} 
          />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
