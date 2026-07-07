import React, { useState } from 'react';
import { AlertNotification, ActiveSymbol } from '../types';
import { Eye, Bell, Trash2, Plus, BellOff, Volume2, Sparkles, VolumeX, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface WatchlistPanelProps {
  watchlist: string[]; // symbol names
  watchlistSignals: { [symbol: string]: { signal: string; confidence: number; price: number } };
  activeSymbols: ActiveSymbol[];
  alerts: AlertNotification[];
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onAddWatchlist: (symbol: string) => void;
  onRemoveWatchlist: (symbol: string) => void;
  onClearAlerts: () => void;
  onSelectSymbol: (symbol: string) => void;
}

export default function WatchlistPanel({
  watchlist,
  watchlistSignals,
  activeSymbols,
  alerts,
  audioEnabled,
  onToggleAudio,
  onAddWatchlist,
  onRemoveWatchlist,
  onClearAlerts,
  onSelectSymbol,
}: WatchlistPanelProps) {
  const [selectedSymbolToAdd, setSelectedSymbolToAdd] = useState('');

  const availableToWatch = activeSymbols.filter(
    (s) => s.exchange_is_open && !watchlist.includes(s.symbol)
  );

  const getSignalBadge = (sig: string) => {
    switch (sig) {
      case 'BUY':
        return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30 font-black';
      case 'SELL':
        return 'text-rose-400 bg-rose-950/30 border-rose-900/30 font-black';
      default:
        return 'text-slate-500 bg-slate-900/80 border-slate-800';
    }
  };

  const getDisplayName = (sym: string) => {
    const matched = activeSymbols.find((s) => s.symbol === sym);
    return matched ? matched.display_name : sym;
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-rose-500" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Multi-Asset Watchlist</h2>
        </div>

        {/* Audio controls */}
        <button
          onClick={onToggleAudio}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] uppercase font-bold font-mono ${
            audioEnabled
              ? 'bg-rose-950/40 text-rose-400 border-rose-900/40 hover:bg-rose-900 hover:text-white'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
          title={audioEnabled ? 'Mute Alert Chimes' : 'Unmute Alert Chimes'}
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {audioEnabled ? 'Chimes' : 'Muted'}
        </button>
      </div>

      {/* Add Symbol Input */}
      <div className="flex gap-2 text-xs">
        <select
          value={selectedSymbolToAdd}
          onChange={(e) => setSelectedSymbolToAdd(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
        >
          <option value="" className="bg-slate-950 text-slate-500">Add asset to watch...</option>
          {availableToWatch.map((s) => (
            <option key={s.symbol} value={s.symbol} className="bg-slate-950 text-slate-300 font-mono">
              [{s.submarket_display_name}] {s.display_name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            if (selectedSymbolToAdd) {
              onAddWatchlist(selectedSymbolToAdd);
              setSelectedSymbolToAdd('');
            }
          }}
          disabled={!selectedSymbolToAdd}
          className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-900 disabled:text-slate-600 border border-transparent disabled:border-slate-850 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Watchlist entries */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {watchlist.length === 0 ? (
          <div className="text-center py-6 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
            Watchlist Empty
          </div>
        ) : (
          watchlist.map((sym) => {
            const symSig = watchlistSignals[sym] || { signal: 'HOLD', confidence: 0, price: 0 };
            return (
              <div
                key={sym}
                className="p-3 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-xl flex items-center justify-between gap-3 group transition-all"
              >
                <div
                  onClick={() => onSelectSymbol(sym)}
                  className="flex-1 cursor-pointer space-y-1 text-left"
                >
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-all block font-mono">
                    {getDisplayName(sym)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Last: {symSig.price > 0 ? symSig.price.toFixed(4) : 'Loading...'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] border font-mono ${getSignalBadge(symSig.signal)}`}>
                    {symSig.signal === 'BUY' && 'BUY'}
                    {symSig.signal === 'SELL' && 'SELL'}
                    {symSig.signal === 'HOLD' && 'HOLD'}
                    {symSig.confidence > 0 && ` ${symSig.confidence}%`}
                  </span>

                  <button
                    onClick={() => onRemoveWatchlist(sym)}
                    className="p-1.5 bg-slate-950 border border-slate-900 rounded text-slate-500 hover:text-rose-500 hover:border-rose-950/40 transition-all cursor-pointer"
                    title={`Remove ${sym} from watchlist`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* BACKGROUND ALERTS LOG */}
      <div className="border-t border-slate-900 pt-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-rose-500 animate-swing" />
            Signal Warnings Log ({alerts.length})
          </span>
          {alerts.length > 0 && (
            <button
              onClick={onClearAlerts}
              className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase cursor-pointer"
            >
              Clear Log
            </button>
          )}
        </div>

        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-[10px] font-semibold uppercase tracking-wider text-slate-600 font-mono">
              No recent alerts
            </div>
          ) : (
            alerts.slice().reverse().map((alt) => (
              <div
                key={alt.id}
                className="p-2.5 bg-rose-950/10 border border-rose-900/10 hover:border-rose-800/30 rounded-lg flex items-start gap-2.5 transition-all text-left text-[11px]"
              >
                <div className="mt-0.5">
                  {alt.signal === 'BUY' ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 font-mono">{getDisplayName(alt.symbol)}</span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(alt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-normal">
                    <span className={`font-black uppercase tracking-wider ${alt.signal === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {alt.signal} Signal
                    </span>{' '}
                    fired by {alt.strategyName} ({alt.confidence}% conviction)
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
