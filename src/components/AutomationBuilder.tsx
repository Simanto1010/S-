import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { Plus, Play, Save, Trash2, GripVertical, Zap, ArrowRight, Settings2, RefreshCw, Wand2, X } from 'lucide-react';
import { db, auth, collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { ConnectorService } from '../services/connectorService';

interface Node {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  label: string;
  platform?: string;
}

export default function AutomationBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'workflows'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const firstWorkflow = snapshot.docs[0];
        setWorkflowId(firstWorkflow.id);
        setNodes(firstWorkflow.data().nodes || []);
      } else {
        // Initialize with a default trigger if empty
        setNodes([
          { id: 'trigger-1', type: 'trigger', label: 'Manual Trigger', platform: 'System' }
        ]);
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'workflows');
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const saveWorkflow = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (workflowId) {
        await updateDoc(doc(db, 'workflows', workflowId), {
          nodes,
          updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, 'workflows'), {
          userId: user.uid,
          name: 'My Automation',
          nodes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setWorkflowId(docRef.id);
      }
      toast.success('Workflow saved successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, workflowId ? `workflows/${workflowId}` : 'workflows');
    } finally {
      setIsSaving(false);
    }
  };

  const addNode = () => {
    const newNode: Node = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'action',
      label: 'New Action Step',
      platform: 'Select Platform'
    };
    setNodes([...nodes, newNode]);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  const runTest = async () => {
    if (nodes.length === 0) {
      toast.error('No steps to test');
      return;
    }
    
    setIsLoading(true);
    setExecutionLogs([]);
    toast.info('Starting test run of automation sequence...');
    
    try {
      const steps = nodes.map(n => ({
        platform: n.platform || 'System',
        action: n.label,
        params: {}
      }));
      
      const { logs } = await ConnectorService.executeMultiAppChain(steps);
      setExecutionLogs(logs);
      toast.success('Automation sequence completed successfully!');
    } catch (err) {
      toast.error('Automation test failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestWorkflow = async () => {
    toast.info('AI Core is analyzing your connected apps to suggest a workflow...');
    // In a real app, this would use Gemini to suggest a workflow based on user's active connectors
    const suggestions: Node[] = [
      { id: 'trigger-1', type: 'trigger', label: 'New Slack Message', platform: 'Slack' },
      { id: 'action-1', type: 'action', label: 'Update Google Sheet', platform: 'Google Sheets' },
      { id: 'action-2', type: 'action', label: 'Create GitHub Issue', platform: 'GitHub' }
    ];
    
    setNodes(suggestions);
    toast.success('AI suggested a new multi-app workflow!');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Automation Builder</h3>
          <p className="text-zinc-500 mt-1">Design multi-step workflows with visual logic.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={suggestWorkflow}
            className="flex items-center gap-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-xl font-medium hover:bg-purple-500/20 transition-all"
          >
            <Wand2 size={18} />
            AI Suggest
          </button>
          <button 
            onClick={saveWorkflow}
            disabled={isSaving}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl font-medium hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            Save Workflow
          </button>
          <button 
            onClick={runTest}
            className="flex items-center gap-2 bg-cyan-500 text-black px-4 py-2 rounded-xl font-medium hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          >
            <Play size={18} />
            Test Run
          </button>
        </div>
      </div>

      <div className="relative min-h-[500px] bg-[#0a0a0a] border border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-zinc-600">
            <RefreshCw size={48} className="animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest">Loading Blueprint...</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={nodes} onReorder={setNodes} className="space-y-4 w-full max-w-xl">
            {nodes.map((node, index) => (
              <Reorder.Item 
                key={node.id} 
                value={node}
                className="relative"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-4 p-6 bg-[#111] border ${node.type === 'trigger' ? 'border-cyan-500/30' : 'border-white/5'} rounded-2xl shadow-xl group`}
                >
                  <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-white transition-colors">
                    <GripVertical size={20} />
                  </div>
                  
                  <div className={`p-3 rounded-xl ${node.type === 'trigger' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-white/5 text-zinc-400'}`}>
                    {node.type === 'trigger' ? <Zap size={20} /> : <ArrowRight size={20} />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{node.type}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">{node.platform}</span>
                    </div>
                    <p className="font-bold text-sm mt-1">{node.label}</p>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedNode(node)}
                      className="p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <Settings2 size={18} />
                    </button>
                    <button 
                      onClick={() => removeNode(node.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
                
                {index < nodes.length - 1 && (
                  <div className="h-8 w-[2px] bg-white/5 mx-auto my-1" />
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        <button 
          onClick={addNode}
          className="mt-8 flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-cyan-400 transition-all border border-dashed border-white/10 hover:border-cyan-500/30 px-6 py-3 rounded-2xl bg-white/[0.02]"
        >
          <Plus size={18} />
          Add Step
        </button>

        {/* Execution Logs */}
        {executionLogs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 w-full max-w-xl bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-xs"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-500 font-bold uppercase tracking-widest">Execution Console</span>
              <button onClick={() => setExecutionLogs([])} className="text-zinc-600 hover:text-white transition-colors">Clear</button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
              {executionLogs.map((log, i) => (
                <div key={i} className={`${log.includes('✅') ? 'text-emerald-400' : log.includes('❌') ? 'text-red-400' : 'text-zinc-400'}`}>
                  {log}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      <AnimatePresence>
        {selectedNode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNode(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 z-[110] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Configure Step</h3>
                <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Step Label</label>
                  <input 
                    type="text" 
                    value={selectedNode.label}
                    onChange={(e) => {
                      const updated = { ...selectedNode, label: e.target.value };
                      setSelectedNode(updated);
                      setNodes(nodes.map(n => n.id === selectedNode.id ? updated : n));
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Platform</label>
                  <select 
                    value={selectedNode.platform}
                    onChange={(e) => {
                      const updated = { ...selectedNode, platform: e.target.value };
                      setSelectedNode(updated);
                      setNodes(nodes.map(n => n.id === selectedNode.id ? updated : n));
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option>System</option>
                    <option>Slack</option>
                    <option>GitHub</option>
                    <option>Shopify</option>
                    <option>OpenAI</option>
                    <option>Google Sheets</option>
                  </select>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="w-full bg-cyan-500 text-black font-bold py-4 rounded-2xl hover:bg-cyan-400 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
