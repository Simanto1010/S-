import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Cable, Terminal, Shield, Zap, Settings, LogOut } from 'lucide-react';
import { auth, signOut } from '../firebase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
}

export default function Layout({ children, activeTab, setActiveTab, user }: LayoutProps) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'nexus', icon: Cable, label: 'Nexus Board' },
    { id: 'console', icon: Terminal, label: 'Execution' },
    { id: 'vault', icon: Shield, label: 'Identity Vault' },
    { id: 'automation', icon: Zap, label: 'Automations' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#0a0a0a] z-50">
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

        <div className="absolute bottom-0 left-0 w-full p-6 border-t border-white/5">
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
      <main className="pl-64 min-h-screen">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-12 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h2>
            <div className="h-4 w-[1px] bg-white/10" />
            <p className="text-sm text-zinc-500">Universal Connector Active</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-emerald-500/80 tracking-widest uppercase">System Online</span>
            </div>
            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
