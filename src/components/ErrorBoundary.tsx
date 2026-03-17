import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#0a0a0a] border border-red-500/20 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">System Interruption</h1>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              S+ encountered a critical error while processing your request. The self-healing engine is attempting to stabilize the core.
            </p>
            
            <div className="bg-black/40 rounded-xl p-4 mb-8 text-left border border-white/5">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Error Signature</p>
              <p className="text-xs font-mono text-red-400 break-all">{this.state.error?.message || 'Unknown System Fault'}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Restart Core System
              </button>
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
