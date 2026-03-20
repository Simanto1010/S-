import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Video, Wand2, Loader2, Download, RefreshCw, X, Edit3 } from 'lucide-react';
import { generateImage, generateVideo } from '../services/aiService';
import { toast } from 'sonner';

interface MediaGeneratorProps {
  onClose: () => void;
  initialPrompt?: string;
}

export default function MediaGenerator({ onClose, initialPrompt = '' }: MediaGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [type, setType] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      if (type === 'image') {
        const imageUrl = await generateImage(prompt, aspectRatio);
        if (imageUrl) {
          setResult(imageUrl);
          toast.success('Image generated successfully!');
        }
      } else {
        // Video only supports 16:9 or 9:16
        const videoAspectRatio = aspectRatio === '1:1' ? '16:9' : aspectRatio;
        const videoUrl = await generateVideo(prompt, videoAspectRatio);
        if (videoUrl) {
          setResult(videoUrl);
          toast.success('Video generated successfully!');
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate media. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row h-[600px]">
          {/* Controls */}
          <div className="w-full lg:w-80 border-r border-white/5 p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                <Wand2 size={20} className="text-cyan-400" />
                Creative Studio
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Media Type</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('image')}
                  className={`flex-1 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    type === 'image' 
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                  }`}
                >
                  <ImageIcon size={20} />
                  <span className="text-[10px] font-bold uppercase">Image</span>
                </button>
                <button
                  onClick={() => setType('video')}
                  className={`flex-1 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    type === 'video' 
                      ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' 
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                  }`}
                >
                  <Video size={20} />
                  <span className="text-[10px] font-bold uppercase">Video</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Aspect Ratio</p>
              <div className="grid grid-cols-3 gap-2">
                {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-lg border text-[10px] font-bold transition-all ${
                      aspectRatio === ratio
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prompt</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Generate {type}
                </>
              )}
            </button>
          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-black/50 p-8 flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 text-zinc-500"
                >
                  <div className="relative">
                    <Loader2 size={48} className="animate-spin text-cyan-400" />
                    <div className="absolute inset-0 blur-xl bg-cyan-400/20 animate-pulse" />
                  </div>
                  <p className="text-sm font-mono animate-pulse">
                    {type === 'video' ? 'Synthesizing frames...' : 'Dreaming up your image...'}
                  </p>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full flex flex-col items-center justify-center gap-6"
                >
                  <div className={`relative group rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-h-[400px] ${
                    aspectRatio === '1:1' ? 'aspect-square' : 
                    aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'
                  }`}>
                    {type === 'image' ? (
                      <img src={result} alt="Generated" className="w-full h-full object-cover" />
                    ) : (
                      <video src={result} controls autoPlay loop className="w-full h-full object-cover" />
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <Download size={20} />
                      </button>
                      <button 
                        onClick={() => setResult(null)}
                        className="p-3 bg-white/10 text-white rounded-full hover:scale-110 transition-transform backdrop-blur-md"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setResult(null)}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Edit3 size={14} />
                      Refine Prompt
                    </button>
                    <button 
                      onClick={onClose}
                      className="px-6 py-2 bg-cyan-500 text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Use Media
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center space-y-4 text-zinc-600">
                  <div className="w-20 h-20 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center mx-auto">
                    {type === 'image' ? <ImageIcon size={32} /> : <Video size={32} />}
                  </div>
                  <p className="text-sm">Your generation will appear here</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
