import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Cable, 
  Terminal, 
  Shield, 
  Zap, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Activity,
  Brain,
  BarChart3,
  Users,
  CreditCard,
  Gauge,
  ShieldAlert
} from 'lucide-react';
import { auth, signOut } from '../firebase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onSettingsClick: () => void;
  isAdmin?: boolean;
}

export default function Layout({ children, activeTab, setActiveTab, user, onSettingsClick, isAdmin }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'subscription', icon: CreditCard, label: 'Subscription' },
    { id: 'autonomous', icon: Brain, label: 'Autonomous' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'team', icon: Users, label: 'Team Hub' },
    { id: 'nexus', icon: Cable, label: 'Nexus Board' },
    { id: 'console', icon: Terminal, label: 'Execution' },
    { id: 'ai-control', icon: Activity, label: 'AI Control' },
    { id: 'vault', icon: Shield, label: 'Identity Vault' },
    { id: 'automation', icon: Zap, label: 'Automations' },
    { id: 'usage', icon: Gauge, label: 'Usage & Limits' },
    { id: 'health', icon: Activity, label: 'System Status' },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'admin-payments', icon: ShieldAlert, label: 'Admin Payments' });
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col lg:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-[#0a0a0a] z-50 shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <span className="text-2xl font-black italic">S+</span>
            </div>
            <h1 className="text-xl font-bold tracking-tighter">SYSTEM PLUS</h1>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === item.id
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6 px-2">
            <img src={user?.photoURL || 'https://picsum.photos/seed/user/40/40'} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-6 lg:px-12 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <Menu size={20} className="md:w-6 md:h-6" />
            </button>
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-lg font-black italic">S+</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <h2 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h2>
              <div className="h-4 w-[1px] bg-white/10" />
              <p className="text-sm text-zinc-500">Universal Connector Active</p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-emerald-500/80 tracking-widest uppercase">System Online</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-cyan-500 rounded-full" />
              </button>
              <button 
                onClick={onSettingsClick}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-12 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0a0a0a] border-r border-white/5 z-[70] lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-black italic">S+</span>
                  </div>
                  <h1 className="text-lg font-bold tracking-tighter">SYSTEM PLUS</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-zinc-500">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${
                      activeTab === item.id 
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium text-lg">{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="p-6 border-t border-white/5">
                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Disconnect</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
