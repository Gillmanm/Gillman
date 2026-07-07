import React, { useState } from 'react';
import { Key, Link, AlertTriangle, Play, HelpCircle } from 'lucide-react';

interface ConnectScreenProps {
  onConnect: (token: string, appId: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function ConnectScreen({ onConnect, isLoading, error }: ConnectScreenProps) {
  // Prefilled from user-supplied token in prompt
  const [token, setToken] = useState('pat_96da23ee8708ab97dfdf55ecea9400a10778b76583b0f33ad628c4f6b4d73c48');
  const [appId, setAppId] = useState('36544'); // Default Playground/App ID for Deriv WebSockets

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !appId.trim()) return;
    onConnect(token.trim(), appId.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <span className="text-xl font-black text-rose-500 tracking-wider">D</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Deriv Multi-Strategy</h1>
              <p className="text-xs text-slate-400">Algorithmic Trading Dashboard</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-4 leading-relaxed">
            Connect your Deriv account using a WebSocket token to stream high-frequency indices, forex, commodities, and execute trades in real-time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-start space-x-3 text-rose-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-semibold block text-rose-300">Connection Failed</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="token" className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Deriv API Token
              </label>
              <a
                href="https://app.deriv.com/account/api-token"
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-0.5"
              >
                Get Token
                <Link className="w-3 h-3" />
              </a>
            </div>
            <input
              id="token"
              type="password"
              placeholder="Paste your pat_... token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="appId" className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Deriv App ID
              </label>
              <span className="text-slate-500 text-[10px] uppercase font-mono">Default: 36544</span>
            </div>
            <input
              id="appId"
              type="text"
              placeholder="Enter App ID"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl px-4 py-3.5 text-sm transition-all shadow-lg hover:shadow-rose-600/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Authorizing API Session...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Connect & Load Dashboard
              </>
            )}
          </button>
        </form>

        <div className="bg-slate-950/60 p-5 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed text-center space-y-1">
          <p>⚠️ Demo account tokens are highly recommended for evaluation.</p>
          <p>Tokens remain in-memory and are never sent to external servers.</p>
        </div>
      </div>
      
      <p className="text-[11px] text-slate-600 mt-8 max-w-sm text-center">
        Disclaimer: Trading involves substantial risk of loss. Generated indicators do not constitute financial advice.
      </p>
    </div>
  );
}
