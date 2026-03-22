import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Loader2, Zap, Sparkles, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CommandOrbProps {
  onCommand: (cmd: string) => void;
  isProcessing: boolean;
}

export default function CommandOrb({ onCommand, isProcessing }: CommandOrbProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const quickActions = [
    { label: 'Analyze YouTube', cmd: 'Analyze my latest YouTube video performance' },
    { label: 'Sync Socials', cmd: 'Sync my latest post across all connected social platforms' },
    { label: 'Security Audit', cmd: 'Run a full security audit on my identity vault' },
  ];

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        
        switch (event.error) {
          case 'not-allowed':
            setMicError('Microphone access denied.');
            toast.error('Microphone access denied. Please enable it in your browser settings.');
            break;
          case 'no-microphone':
            setMicError('No microphone detected.');
            toast.error('No microphone found. Please connect a device.');
            break;
          case 'network':
            setMicError('Network error. Check connection.');
            toast.error('Speech recognition requires an active internet connection.');
            break;
          default:
            setMicError('Voice system error. Try again.');
            toast.error(`Voice recognition error: ${event.error}`);
        }
      };
    }
  }, []);

  const requestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicError(null);
      toggleListening();
    } catch (err) {
      console.error('Permission request failed', err);
      toast.error('Please enable microphone access in your browser site settings.');
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setMicError(null);
      try {
        // Check permission state if possible
        if (navigator.permissions && (navigator.permissions as any).query) {
          const status = await navigator.permissions.query({ name: 'microphone' as any });
          if (status.state === 'denied') {
            setMicError('Microphone access is blocked in browser settings.');
            toast.error('Microphone access is blocked. Please enable it in your browser settings.');
            return;
          }
        }

        recognitionRef.current?.start();
        setIsListening(true);
        toast.info('Listening for command...');
      } catch (err: any) {
        console.error('Failed to start recognition', err);
        if (err.name === 'NotAllowedError' || err.message?.includes('not-allowed')) {
          setMicError('Microphone access denied.');
          await requestMicPermission();
        } else {
          toast.error('Voice system unavailable');
        }
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isProcessing) {
      onCommand(input.trim());
      setInput('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (cmd: string) => {
    setInput(cmd);
    setShowSuggestions(false);
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-10 w-full max-w-4xl mx-auto">
      {/* The Orb */}
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          scale: isProcessing || isListening ? [1, 1.1, 1] : 1,
          boxShadow: isProcessing || isListening
            ? `0 0 60px ${isListening ? 'rgba(239,68,68,0.4)' : 'rgba(34,211,238,0.4)'}` 
            : isHovered 
              ? "0 0 40px rgba(34,211,238,0.2)" 
              : "0 0 20px rgba(34,211,238,0.1)"
        }}
        transition={{ duration: 2, repeat: isProcessing || isListening ? Infinity : 0 }}
        className={`relative w-48 h-48 rounded-full bg-gradient-to-br border flex items-center justify-center group cursor-pointer overflow-hidden transition-colors duration-500 mb-12 ${
          isListening 
            ? 'from-red-500/20 to-rose-600/20 border-red-500/30' 
            : 'from-cyan-500/20 to-blue-600/20 border-cyan-500/30'
        }`}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.random() * 50 - 25, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className={`absolute w-1 h-1 rounded-full ${isListening ? 'bg-red-400' : 'bg-cyan-400'}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            </motion.div>
          ) : isListening ? (
            <motion.div
              key="mic-active"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="flex flex-col items-center gap-2"
            >
              <Mic className="w-12 h-12 text-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Listening...</span>
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10"
            >
              <Sparkles className="w-12 h-12 text-cyan-400 group-hover:scale-110 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glow effect */}
        <div className={`absolute inset-0 blur-2xl transition-colors ${
          isListening ? 'bg-red-400/5 group-hover:bg-red-400/10' : 'bg-cyan-400/5 group-hover:bg-cyan-400/10'
        }`} />
      </motion.div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleSuggestionClick(action.cmd)}
            className="px-3 py-1.5 bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-cyan-400 transition-all flex items-center gap-2 group"
          >
            <Zap size={10} className="group-hover:animate-pulse" />
            {action.label}
          </button>
        ))}
      </div>

      <form 
        onSubmit={handleSubmit}
        className={`relative group transition-all duration-500 w-full max-w-2xl ${isListening ? 'scale-105' : ''}`}
      >
        {/* Glow Effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 ${isListening ? 'opacity-60 animate-pulse' : ''}`} />
        
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl flex items-center p-2 shadow-2xl">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-4 rounded-xl transition-all relative ${isListening ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
          >
            {isListening ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Mic size={24} />
              </motion.div>
            ) : (
              <Mic size={24} />
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={isListening ? "Listening..." : "Enter command or use voice..."}
            className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-lg font-medium placeholder:text-zinc-600"
          />

          <div className="flex items-center gap-2 pr-2">
            <AnimatePresence>
              {input && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={() => setInput('')}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </motion.button>
              )}
            </AnimatePresence>
            
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className={`p-4 rounded-xl transition-all ${
                input.trim() && !isProcessing 
                  ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)]' 
                  : 'bg-white/5 text-zinc-700'
              }`}
            >
              {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
            </button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {micError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-14 left-0 right-0 flex justify-center"
            >
              <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-bold uppercase tracking-widest shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  {micError}
                </div>
                {(micError.includes('denied') || micError.includes('detected')) && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      requestMicPermission();
                    }}
                    className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors"
                  >
                    {micError.includes('denied') ? 'Fix' : 'Retry'}
                  </button>
                )}
                <button 
                  onClick={() => setMicError(null)}
                  className="p-1 hover:bg-white/5 rounded"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Suggestions Overlay */}
      <AnimatePresence>
        {showSuggestions && !input && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-full left-0 right-0 mt-4 p-6 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl z-50"
          >
            <div className="flex items-center gap-3 mb-6">
              <Sparkles size={18} className="text-cyan-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Smart Suggestions</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Post my latest blog to LinkedIn and Twitter',
                'Generate a summary of my unread emails',
                'Check my GitHub notifications and notify Slack',
                'Schedule a meeting with the dev team',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-4 bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-2xl text-left text-sm text-zinc-400 hover:text-white transition-all group"
                >
                  <span className="group-hover:text-cyan-400 transition-colors">"</span>
                  {suggestion}
                  <span className="group-hover:text-cyan-400 transition-colors">"</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
