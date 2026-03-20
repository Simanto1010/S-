import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, Lock, Eye, EyeOff, Copy, Trash2, Plus, Search, X, RefreshCw } from 'lucide-react';
import { db, auth, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { EncryptionService } from '../services/encryptionService';

interface Secret {
  id: string;
  name: string;
  service: string;
  status: string;
  lastUsed: string;
  value: string; // Encrypted value
}

export default function IdentityVault() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showValues, setShowValues] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newSecret, setNewSecret] = useState({ name: '', service: 'Google', value: '' });
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [masterPassword, setMasterPassword] = useState('');

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'vault'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        lastUsed: doc.data().lastUsed?.toDate ? doc.data().lastUsed.toDate().toLocaleString() : 'Never'
      })) as Secret[];
      setSecrets(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vault');
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const decryptValue = (id: string, encryptedValue: string) => {
    if (!masterPassword) {
      toast.error('Master password required for decryption');
      return;
    }
    try {
      const decrypted = EncryptionService.decrypt(encryptedValue, masterPassword);
      setShowValues(prev => ({ ...prev, [id]: decrypted }));
      toast.success('Value decrypted successfully');
    } catch (err) {
      toast.error('Decryption failed. Invalid master password.');
    }
  };

  const addSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!masterPassword) {
      toast.error('Master password required to encrypt new secret');
      return;
    }

    try {
      const encryptedValue = EncryptionService.encrypt(newSecret.value, masterPassword);
      
      await addDoc(collection(db, 'vault'), {
        userId: user.uid,
        name: newSecret.name,
        service: newSecret.service,
        value: encryptedValue,
        status: 'active',
        lastUsed: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      setIsAdding(false);
      setNewSecret({ name: '', service: 'Google', value: '' });
      toast.success('Secret encrypted with AES-256-GCM and stored');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vault');
    }
  };

  const deleteSecret = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'vault', id));
      toast.success('Secret removed from vault');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `vault/${id}`);
    }
  };

  const filteredSecrets = secrets.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Identity Vault</h3>
          <p className="text-zinc-500 mt-1">Secure AES-256-GCM encrypted storage for your API tokens.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500" size={18} />
            <input 
              type="password" 
              placeholder="Master Password" 
              value={masterPassword}
              onChange={e => setMasterPassword(e.target.value)}
              className="bg-[#0a0a0a] border border-cyan-500/30 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-cyan-500 text-black px-4 py-2 rounded-xl font-medium hover:bg-cyan-400 transition-all"
          >
            <Plus size={18} />
            New Secret
          </button>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
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
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-zinc-500">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  Decrypting Vault...
                </td>
              </tr>
            ) : filteredSecrets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-zinc-500">
                  {searchTerm ? `No results found for "${searchTerm}"` : 'No secrets stored in vault.'}
                </td>
              </tr>
            ) : filteredSecrets.map((cred) => (
              <tr key={cred.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Lock size={14} className="text-cyan-400" />
                    </div>
                    <span className="font-bold">{cred.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm text-zinc-400">{cred.service}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-zinc-500">
                      {showValues[cred.id] ? showValues[cred.id] : '••••••••••••••••••••'}
                    </span>
                    <button 
                      onClick={() => {
                        if (showValues[cred.id]) {
                          setShowValues(prev => {
                            const next = { ...prev };
                            delete next[cred.id];
                            return next;
                          });
                        } else {
                          decryptValue(cred.id, cred.value);
                        }
                      }}
                      className="p-1 text-zinc-600 hover:text-white transition-colors"
                    >
                      {showValues[cred.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm text-zinc-500">{cred.lastUsed}</td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        if (showValues[cred.id]) {
                          navigator.clipboard.writeText(showValues[cred.id]);
                          toast.success('Decrypted value copied to clipboard');
                        } else {
                          toast.error('Decrypt value first to copy');
                        }
                      }}
                      className="p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => deleteSecret(cred.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 z-[110] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Add New Secret</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={addSecret} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Name / Alias</label>
                  <input 
                    required
                    type="text" 
                    value={newSecret.name}
                    onChange={e => setNewSecret({...newSecret, name: e.target.value})}
                    placeholder="e.g. YouTube Main Channel"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Service</label>
                  <select 
                    value={newSecret.service}
                    onChange={e => setNewSecret({...newSecret, service: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option>Google</option>
                    <option>Notion</option>
                    <option>OpenAI</option>
                    <option>Custom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Secret Value</label>
                  <input 
                    required
                    type="password" 
                    value={newSecret.value}
                    onChange={e => setNewSecret({...newSecret, value: e.target.value})}
                    placeholder="Paste your secret here"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-cyan-500 text-black font-bold py-4 rounded-2xl hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  Encrypt & Store
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
