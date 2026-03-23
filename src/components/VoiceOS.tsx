import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { VoiceService } from '../services/voiceService';
import { orchestrateTask } from '../services/aiService';
import { toast } from 'sonner';

interface VoiceOSProps {
  onCommandExecuted?: (result: any) => void;
  context?: any;
}

export const VoiceOS: React.FC<VoiceOSProps> = ({ onCommandExecuted, context }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);

  const handleCommand = useCallback(async (text: string) => {
    if (!text || text.length < 3) return;
    
    setIsProcessing(true);
    setTranscript(text);
    
    try {
      const result = await orchestrateTask(text, context);
      
      setIsSpeaking(true);
      await VoiceService.speak(result.summary);
      setIsSpeaking(false);
      
      if (onCommandExecuted) onCommandExecuted(result);
      
      // If voice mode is active, start listening again after a short delay
      if (voiceMode) {
        setTimeout(() => {
          VoiceService.startListening();
          setIsListening(true);
        }, 1000);
      }
    } catch (error) {
      console.error("Voice command execution failed", error);
      toast.error("Failed to execute voice command.");
    } finally {
      setIsProcessing(false);
    }
  }, [context, onCommandExecuted, voiceMode]);

  useEffect(() => {
    VoiceService.initSTT(
      (text) => {
        setIsListening(false);
        handleCommand(text);
      },
      () => {
        setIsListening(false);
        // If voice mode is active and we stopped (e.g., due to no-speech), restart listening
        if (voiceMode && !isSpeaking && !isProcessing) {
          setTimeout(() => {
            if (voiceMode) { // Re-check voiceMode in case it was disabled during timeout
              VoiceService.startListening();
              setIsListening(true);
            }
          }, 500);
        }
      }
    );
  }, [handleCommand, voiceMode, isSpeaking, isProcessing]);

  const toggleVoiceMode = async () => {
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    if (newMode) {
      try {
        await VoiceService.startListening();
        setIsListening(true);
        toast.success("Voice Mode Active - Listening for commands...");
      } catch (err) {
        console.error("Failed to enable voice mode", err);
        setVoiceMode(false);
      }
    } else {
      VoiceService.stopListening();
      setIsListening(false);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      VoiceService.stopListening();
      setIsListening(false);
    } else {
      try {
        await VoiceService.startListening();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start voice listening", err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {(isListening || isSpeaking || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-black/90 backdrop-blur-xl border border-white/10 p-4 sm:p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[250px] sm:min-w-[300px] pointer-events-auto"
          >
            <div className="flex items-center gap-2 text-white/60 text-[10px] sm:text-xs font-mono uppercase tracking-widest">
              {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Processing..."}
            </div>

            {/* Voice Waveform Animation */}
            <div className="flex items-center justify-center gap-1 h-8 sm:h-12">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: (isListening || isSpeaking) ? [8, 32, 8] : 4,
                    opacity: (isListening || isSpeaking) ? 1 : 0.3,
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.5 + Math.random() * 0.5,
                    delay: i * 0.05,
                  }}
                  className="w-1 bg-emerald-400 rounded-full"
                />
              ))}
            </div>

            {transcript && (
              <div className="text-white text-xs sm:text-sm text-center italic max-w-[200px] sm:max-w-[250px] truncate">
                "{transcript}"
              </div>
            )}

            {isProcessing && (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-spin" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleVoiceMode}
          className={`p-3 sm:p-4 rounded-full shadow-lg transition-all ${
            voiceMode ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
          } backdrop-blur-md border border-white/10`}
          title={voiceMode ? "Disable Voice Mode" : "Enable Voice Mode"}
        >
          {voiceMode ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={`p-4 sm:p-5 rounded-full shadow-2xl transition-all ${
            isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-black text-white hover:bg-zinc-900'
          } border border-white/10`}
        >
          {isListening ? <MicOff className="w-6 h-6 sm:w-8 sm:h-8" /> : <Mic className="w-6 h-6 sm:w-8 sm:h-8" />}
        </motion.button>
      </div>
    </div>
  );
};
