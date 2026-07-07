import React, { useState } from 'react';
import { OpenPosition, HistoricalTrade } from '../types';
import { Download, Play, Square, TrendingUp, TrendingDown, Clock, Archive, HelpCircle } from 'lucide-react';

interface PositionsPanelProps {
  openPositions: OpenPosition[];
  tradeHistory: HistoricalTrade[];
  currency: string;
  onClosePosition: (contractId: number) => void;
}

export default function PositionsPanel({
  openPositions,
  tradeHistory,
  currency,
  onClosePosition,
}: PositionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');

  const getPLColor = (pl: number) => {
    if (pl > 0) return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30';
    if (pl < 0) return 'text-rose-400 bg-rose-950/30 border-rose-900/30';
    return 'text-slate-400 bg-slate-900 border-slate-800';
  };

  const getPLSign = (pl: number) => {
    if (pl > 0) return `+$${pl.toFixed(2)}`;
    if (pl < 0) return `-$${Math.abs(pl).toFixed(2)}`;
    return `$${pl.toFixed(2)}`;
  };

  // CSV Exporter for Past Trades
  const handleExportCSV = () => {
    if (tradeHistory.length === 0) return;

    const headers = ['Trade ID', 'Contract ID', 'Symbol', 'Type', 'Stake', 'Payout', 'Profit/Loss', 'Entry Price', 'Exit Price', 'Timestamp'];
    const rows = tradeHistory.map((t) => [
      t.id,
      t.contract_id,
      t.symbol,
      t.contract_type,
      t.stake,
      t.payout,
      t.profit,
      t.entry_price,
      t.exit_price,
      new Date(t.timestamp).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deriv_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden p-5 flex flex-col h-full space-y-4">
      {/* Navigation tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-900 pb-3 gap-3">
        <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-xl text-xs font-semibold text-slate-400">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'open'
                ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                : 'hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Open Positions ({openPositions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                : 'hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Trade History ({tradeHistory.length})
          </button>
        </div>

        {activeTab === 'history' && tradeHistory.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {/* Main lists */}
      <div className="flex-1 overflow-x-auto min-h-[160px]">
        {activeTab === 'open' ? (
          openPositions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-1.5">
              <Clock className="w-8 h-8 text-slate-700" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">No active positions</p>
              <p className="text-[10px] text-slate-500 max-w-xs font-mono">
                Positions appear here in real-time once a contract is executed.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Contract Type</th>
                  <th className="py-2.5 px-3 text-right">Stake ({currency})</th>
                  <th className="py-2.5 px-3 text-right">Entry Price</th>
                  <th className="py-2.5 px-3 text-right">Current Price</th>
                  <th className="py-2.5 px-3 text-right">P/L ({currency})</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 font-mono">
                {openPositions.map((p) => (
                  <tr key={p.contract_id} className="hover:bg-slate-900/30 transition-all">
                    <td className="py-3 px-3 font-bold text-slate-200">{p.display_name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        p.contract_type.includes('CALL') || p.contract_type.includes('UP') || p.contract_type.includes('MATCH')
                          ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/20'
                          : 'text-rose-400 bg-rose-950/20 border-rose-900/20'
                      }`}>
                        {p.contract_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-300">{p.stake.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-slate-400">{p.entry_price.toFixed(4)}</td>
                    <td className="py-3 px-3 text-right text-slate-300 font-semibold">{p.current_price.toFixed(4)}</td>
                    <td className={`py-3 px-3 text-right font-black`}>
                      <span className={`px-2 py-1 rounded border font-black ${getPLColor(p.profit)}`}>
                        {getPLSign(p.profit)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onClosePosition(p.contract_id)}
                        className="py-1 px-2.5 bg-rose-950/40 border border-rose-800/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-500 rounded font-semibold text-[10px] transition-all cursor-pointer uppercase font-mono tracking-wider"
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : tradeHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-1.5">
            <Archive className="w-8 h-8 text-slate-700" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">No trading history</p>
            <p className="text-[10px] text-slate-500 font-mono">Completed trades show up here upon settlement.</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">
                <th className="py-2.5 px-3">Date/Time</th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Stake ({currency})</th>
                <th className="py-2.5 px-3 text-right">Payout ({currency})</th>
                <th className="py-2.5 px-3 text-right">Net Return ({currency})</th>
                <th className="py-2.5 px-3">Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 font-mono">
              {tradeHistory.map((t) => (
                <tr key={t.id} className="hover:bg-slate-900/30 transition-all text-slate-300">
                  <td className="py-3 px-3 text-[10px] text-slate-500">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-200">{t.display_name}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                      t.contract_type.includes('CALL') || t.contract_type.includes('UP') || t.contract_type.includes('MATCH')
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/20'
                        : 'text-rose-400 bg-rose-950/20 border-rose-900/20'
                    }`}>
                      {t.contract_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">{t.stake.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-slate-300 font-semibold">{t.payout.toFixed(2)}</td>
                  <td className={`py-3 px-3 text-right font-black`}>
                    <span className={`px-2 py-1 rounded border font-black ${getPLColor(t.profit)}`}>
                      {getPLSign(t.profit)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] text-rose-400 bg-rose-950/10 border border-rose-900/30 px-1.5 py-0.5 rounded">
                      {t.strategy}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
