import React, { useState } from 'react';
import { Candle, StrategyParams, SignalType } from '../types';
import { runBacktest, BacktestResults } from '../utils/indicators';
import { Play, TrendingUp, HelpCircle, RefreshCw, BarChart2, Award, Percent, ChevronRight } from 'lucide-react';

interface BacktestPanelProps {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  params: StrategyParams;
}

const STRATEGIES_LIST = [
  { id: 'ma_cross', name: 'Moving Average Crossover' },
  { id: 'rsi', name: 'RSI Oscillation' },
  { id: 'macd', name: 'MACD Momentum' },
  { id: 'bb', name: 'Bollinger Band Reversion' },
  { id: 'stoch', name: 'Stochastic Oscillator' },
  { id: 'price_action', name: 'Price Action Breakout/Bounce' },
  { id: 'trend_strength', name: 'ADX Trend Filtered' },
  { id: 'confluence', name: 'Confluence Aggregator (Consensus)' },
];

export default function BacktestPanel({ candles, symbol, timeframe, params }: BacktestPanelProps) {
  const [selectedStrategy, setSelectedStrategy] = useState('confluence');
  const [stake, setStake] = useState<number>(10);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BacktestResults | null>(null);

  const handleRunBacktest = () => {
    if (candles.length < 50) return;

    setRunning(true);
    // Add artificial short delay to simulate heavy computations
    setTimeout(() => {
      const res = runBacktest(candles, selectedStrategy, params, stake, 'Rise/Fall');
      setResults(res);
      setRunning(false);
    }, 400);
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return 'text-emerald-400';
    if (rate >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-rose-500" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Historical Simulation</h2>
        </div>
        <span className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-full font-mono">
          Backtest Mode (Sandbox)
        </span>
      </div>

      {/* Inputs block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end text-xs">
        <div className="space-y-1.5">
          <label htmlFor="backtestStrat" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Model</label>
          <select
            id="backtestStrat"
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            {STRATEGIES_LIST.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-950 text-slate-300">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="backtestStake" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simulated Stake ($)</label>
          <input
            id="backtestStake"
            type="number"
            value={stake}
            onChange={(e) => setStake(Math.max(1, parseFloat(e.target.value) || 10))}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none font-mono"
          />
        </div>

        <button
          onClick={handleRunBacktest}
          disabled={running || candles.length < 50}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl py-3 px-4 text-xs transition-all disabled:bg-slate-900 disabled:text-slate-600 shadow-lg hover:shadow-rose-600/10 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest"
        >
          {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          Run Backtest
        </button>
      </div>

      {candles.length < 50 && (
        <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-300 text-[11px] leading-relaxed rounded-xl font-mono">
          ⚠️ Need at least 50 historical candles loaded to run indicator simulations. Loaded: {candles.length} candles.
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {results ? (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Win rate card */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl text-center space-y-1 relative overflow-hidden">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Win Rate</span>
              <span className={`text-xl font-black font-mono block ${getWinRateColor(results.winRate)}`}>
                {results.winRate.toFixed(1)}%
              </span>
              <div className="absolute -bottom-3 -right-3 p-1 text-slate-950/20">
                <Award className="w-12 h-12 stroke-[4]" />
              </div>
            </div>

            {/* Total trades */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Total Signals</span>
              <span className="text-xl font-black text-white font-mono block">
                {results.totalSignals}
              </span>
            </div>

            {/* Wins vs Losses */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Wins / Losses</span>
              <span className="text-sm font-bold text-slate-300 font-mono block">
                <span className="text-emerald-400 font-black">{results.wins}W</span> / <span className="text-rose-400 font-black">{results.losses}L</span>
              </span>
            </div>

            {/* Simulation profit */}
            <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Hypothetical P/L</span>
              <span className={`text-sm font-black font-mono block ${results.payoutProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {results.payoutProfit >= 0 ? '+' : ''}${results.payoutProfit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Table list of simulation matches */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-1">
              Simulated Execution Log (Recent Trades)
            </span>

            {results.details.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 uppercase tracking-wider font-mono">
                No trades matched thresholds. Try adjusting configurations.
              </div>
            ) : (
              <div className="max-h-[160px] overflow-y-auto border border-slate-900 rounded-xl">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-850 text-slate-500 font-semibold uppercase tracking-wider text-[9px] font-mono">
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Signal</th>
                      <th className="py-2 px-3 text-right">Close Price</th>
                      <th className="py-2 px-3 text-center">Result</th>
                      <th className="py-2 px-3 text-right">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50 font-mono">
                    {results.details.slice(-15).reverse().map((d, index) => (
                      <tr key={index} className="hover:bg-slate-900/20 text-slate-400">
                        <td className="py-2 px-3 text-[10px] text-slate-500">
                          {new Date(d.time * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            d.signal === 'BUY'
                              ? 'text-emerald-400 bg-emerald-950/10 border-emerald-900/20'
                              : 'text-rose-400 bg-rose-950/10 border-rose-900/20'
                          }`}>
                            {d.signal === 'BUY' ? 'BUY' : 'SELL'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 font-medium">{d.close.toFixed(4)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-black ${d.result === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {d.result}
                          </span>
                        </td>
                        <td className={`py-2 px-3 text-right font-bold ${d.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {d.profit >= 0 ? '+' : ''}${d.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-1.5">
          <BarChart2 className="w-8 h-8 text-slate-850" />
          <span className="font-bold uppercase tracking-wider font-mono text-slate-600">Simulation Deck Ready</span>
          <p className="max-w-sm font-mono text-[10px] text-slate-500">
            Choose a quantitative model, set the parameters, and hit Run to evaluate performance against the current session candle database.
          </p>
        </div>
      )}
    </div>
  );
}
