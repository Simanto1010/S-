import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Key, Cpu, Mic, Shield, Bell, Zap, Smartphone, ChevronRight, ArrowLeft, LogOut } from 'lucide-react';
import { 
  ProfileSettings, 
  APIKeyManagement, 
  AIModelSelection, 
  VoiceSettings, 
  SecurityPrivacy, 
  DeviceConnections, 
  NotificationSettings, 
  AutomationPreferences 
} from './SettingsSections';
import { db, auth, doc, onSnapshot, setDoc } from '../firebase';
import { toast } from 'sonner';
import { signOut } from 'firebase/auth';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  deferredPrompt?: any;
  onInstall?: () => void;
}

export default function SettingsDrawer({ isOpen, onClose, user, deferredPrompt, onInstall }: SettingsDrawerProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      const settingsRef = doc(db, 'settings', user.uid);
      const unsubscribe = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
          setSettings(doc.data());
        } else {
          // Initialize default settings
          const defaultSettings = {
            userId: user.uid,
            displayName: user.displayName,
            email: user.email,
            aiModel: 'gemini',
            voiceEnabled: true,
            voiceOutput: 'nova',
            automationMode: 'autonomous',
            retryStrategy: 'Exponential Backoff (Recommended)',
            notifications: {
              push: true,
              email: false,
              tasks: true,
              security: true
            }
          };
          setDoc(settingsRef, defaultSettings);
          setSettings(defaultSettings);
        }
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, 'get', `settings/${user.uid}`);
      });
      return unsubscribe;
    }
  }, [isOpen, user]);

  const updateSettings = async (newData: any) => {
    if (!user) return;
    try {
      const settingsRef = doc(db, 'settings', user.uid);
      await setDoc(settingsRef, newData, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'update', `settings/${user.uid}`);
    }
  };

  function handleFirestoreError(error: any, operationType: string, path: string) {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    toast.error('System permission error. Check console for details.');
    throw new Error(JSON.stringify(errInfo));
  }

  const sections = [
    { id: 'profile', icon: User, label: 'Profile Settings', desc: 'Manage your public profile and email.', component: ProfileSettings },
    { id: 'api', icon: Key, label: 'API Key Management', desc: 'Configure keys for external services.', component: APIKeyManagement },
    { id: 'ai', icon: Cpu, label: 'AI Model Selection', desc: 'Choose between Gemini and GPT models.', component: AIModelSelection },
    { id: 'voice', icon: Mic, label: 'Voice Settings', desc: 'Configure STT and TTS preferences.', component: VoiceSettings },
    { id: 'security', icon: Shield, label: 'Security & Privacy', desc: 'Manage encryption and access logs.', component: SecurityPrivacy },
    { id: 'devices', icon: Smartphone, label: 'Device Connections', desc: 'Manage connected laptops and mobiles.', component: DeviceConnections },
    { id: 'notifications', icon: Bell, label: 'Notification Settings', desc: 'Configure alerts and task updates.', component: NotificationSettings },
    { id: 'automation', icon: Zap, label: 'Automation Preferences', desc: 'Default behaviors for AI planning.', component: AutomationPreferences },
  ];

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/5 z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                {activeSection && (
                  <button 
                    onClick={() => setActiveSection(null)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <h2 className="text-lg font-black uppercase tracking-tighter">
                  {activeSection ? sections.find(s => s.id === activeSection)?.label : 'System Settings'}
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {!activeSection ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <img src={user?.photoURL} className="w-12 h-12 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold">{settings?.displayName || user?.displayName}</p>
                      <p className="text-xs text-zinc-500">{settings?.email || user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {deferredPrompt && (
                      <button 
                        onClick={onInstall}
                        className="w-full p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all flex items-center gap-4 text-cyan-400 group mb-4"
                      >
                        <div className="p-3 bg-cyan-500/10 rounded-xl">
                          <Smartphone size={20} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold">Install S+ App</p>
                          <p className="text-[10px] uppercase tracking-widest opacity-60">Add to home screen for better experience</p>
                        </div>
                      </button>
                    )}

                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group text-left"
                      >
                        <div className="p-3 bg-white/5 rounded-xl text-zinc-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-all">
                          <section.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{section.label}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{section.desc}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700 group-hover:text-cyan-400 transition-colors" />
                      </button>
                    ))}

                    <div className="pt-8">
                      <button 
                        onClick={async () => {
                          try {
                            await signOut(auth);
                            onClose();
                            toast.success('Signed out successfully');
                          } catch (err) {
                            toast.error('Failed to sign out');
                          }
                        }}
                        className="w-full p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all flex items-center gap-4 text-red-500 group"
                      >
                        <div className="p-3 bg-red-500/10 rounded-xl">
                          <LogOut size={20} />
                        </div>
                        <span className="text-sm font-bold">Sign Out Session</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="h-full"
                >
                  {ActiveComponent && <ActiveComponent user={user} settings={settings} onUpdate={updateSettings} />}
                </motion.div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-white/5">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <span>Kernel Version 2.4.0</span>
                <span className="text-emerald-500">System Secure</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
