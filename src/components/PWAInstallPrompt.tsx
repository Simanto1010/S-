import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Info, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);
    
    if (isStandaloneMode) {
      console.log('[PWA] App is already running in standalone mode');
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
      console.log('[PWA] Install Prompt Available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('[PWA] PWA Ready');

    // If it's iOS and not standalone, show the manual instructions after a delay
    if (isIOSDevice && !isStandaloneMode) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        toast.info("To install: Tap the Share button and then 'Add to Home Screen'");
      }
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (isStandalone || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 z-[60]"
      >
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Smartphone size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Install S+ App</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Native Experience</p>
              </div>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            {isIOS 
              ? "Tap the Share button in your browser and select 'Add to Home Screen' for the best experience."
              : "Install S+ on your device for faster access and a full-screen experience."}
          </p>

          <div className="flex gap-2">
            {!isIOS && deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download size={14} />
                Install Now
              </button>
            ) : isIOS ? (
              <div className="flex-1 bg-white/5 border border-white/10 py-2.5 rounded-xl text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-2 uppercase tracking-widest">
                <Info size={14} className="text-cyan-400" />
                Manual Install Required
              </div>
            ) : (
              <div className="flex-1 bg-white/5 border border-white/10 py-2.5 rounded-xl text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-2 uppercase tracking-widest">
                <Info size={14} className="text-cyan-400" />
                Use Browser Menu to Install
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
