import React, { useState } from 'react';
import { StrategyParams, StrategySignal, SignalType } from '../types';
import { Sliders, Settings, Zap, ArrowUpRight, ArrowDownRight, AlertCircle, HelpCircle, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface StrategyPanelProps {
  signals: StrategySignal[];
  params: StrategyParams;
  onParamsChange: (newParams: StrategyParams) => void;
  onPrefillTrade: (signal: SignalType, strategyName: string) => void;
}

export default function StrategyPanel({ signals, params, onParamsChange, onPrefillTrade }: StrategyPanelProps) {
  const [showSettings, setShowSettings] = useState(false);

  // Local state for params to make editing fluid
  const [localParams, setLocalParams] = useState<StrategyParams>({ ...params });

  const handleParamChange = (key: keyof StrategyParams, value: number) => {
    const updated = { ...localParams, [key]: value };
    setLocalParams(updated);
    onParamsChange(updated);
  };

  const confluenceSignal = signals.find((s) => s.id === 'confluence');
  const individualSignals = signals.filter((s) => s.id !== 'confluence');

  const getSignalColor = (sig: SignalType) => {
    switch (sig) {
      case 'BUY':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20';
      case 'SELL':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  const getConfidenceColor = (sig: SignalType) => {
    switch (sig) {
      case 'BUY':
        return 'bg-emerald-500';
      case 'SELL':
        return 'bg-rose-500';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-rose-500 fill-current" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Strategy Engine</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
            showSettings
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
          }`}
        >
          <Settings className={`w-3.5 h-3.5 ${showSettings ? 'animate-spin' : ''}`} />
          Config
        </button>
      </div>

      {/* Editable Strategy Parameters */}
      {showSettings && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-2">
            <span className="font-bold flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
              Adjust Indicators Parameter Thresholds
            </span>
            <button
              onClick={() => {
                const defaultParams: StrategyParams = {
                  maFast: 9,
                  maSlow: 21,
                  rsiPeriod: 14,
                  rsiOverbought: 70,
                  rsiOversold: 30,
                  macdFast: 12,
                  macdSlow: 26,
                  macdSignal: 9,
                  bbPeriod: 20,
                  bbStdDev: 2,
                  stochK: 14,
                  stochD: 3,
                  stochSlowing: 3,
                  stochOverbought: 80,
                  stochOversold: 20,
                  priceActionPeriod: 15,
                  adxPeriod: 14,
                  adxThreshold: 25,
                };
                setLocalParams(defaultParams);
                onParamsChange(defaultParams);
              }}
              className="text-[10px] text-rose-400 hover:text-rose-300 transition-all cursor-pointer font-semibold uppercase"
            >
              Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* MA Cross */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">EMA Fast / Slow</span>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={localParams.maFast}
                  onChange={(e) => handleParamChange('maFast', parseInt(e.target.value) || 9)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-center font-mono"
                />
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={localParams.maSlow}
                  onChange={(e) => handleParamChange('maSlow', parseInt(e.target.value) || 21)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-center font-mono"
                />
              </div>
            </div>

            {/* RSI */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">RSI Period / Limits</span>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={localParams.rsiPeriod}
                  onChange={(e) => handleParamChange('rsiPeriod', parseInt(e.target.value) || 14)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-center font-mono"
                  title="Period"
                />
                <input
                  type="number"
                  value={localParams.rsiOversold}
                  onChange={(e) => handleParamChange('rsiOversold', parseInt(e.target.value) || 30)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-emerald-400 text-center font-mono"
                  title="Oversold limit"
                />
                <input
                  type="number"
                  value={localParams.rsiOverbought}
                  onChange={(e) => handleParamChange('rsiOverbought', parseInt(e.target.value) || 70)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-rose-400 text-center font-mono"
                  title="Overbought limit"
                />
              </div>
            </div>

            {/* MACD */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">MACD (Fast, Slow, Signal)</span>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={localParams.macdFast}
                  onChange={(e) => handleParamChange('macdFast', parseInt(e.target.value) || 12)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-slate-200 text-center font-mono"
                />
                <input
                  type="number"
                  value={localParams.macdSlow}
                  onChange={(e) => handleParamChange('macdSlow', parseInt(e.target.value) || 26)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-slate-200 text-center font-mono"
                />
                <input
                  type="number"
                  value={localParams.macdSignal}
                  onChange={(e) => handleParamChange('macdSignal', parseInt(e.target.value) || 9)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-slate-200 text-center font-mono"
                />
              </div>
            </div>

            {/* Bollinger Bands */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">Bollinger Bands (Prd, Dev)</span>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={localParams.bbPeriod}
                  onChange={(e) => handleParamChange('bbPeriod', parseInt(e.target.value) || 20)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-center font-mono"
                  title="Period"
                />
                <input
                  type="number"
                  step="0.1"
                  value={localParams.bbStdDev}
                  onChange={(e) => handleParamChange('bbStdDev', parseFloat(e.target.value) || 2)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-center font-mono"
                  title="Standard Deviation"
                />
              </div>
            </div>

            {/* Stochastic */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">Stochastic (%K, %D, Slow)</span>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={localParams.stochK}
                  onChange={(e) => handleParamChange('stochK', parseInt(e.target.value) || 14)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-slate-200 text-center font-mono"
                />
                <input
                  type="number"
                  value={localParams.stochD}
                  onChange={(e) => handleParamChange('stochD', parseInt(e.target.value) || 3)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-slate-200 text-center font-mono"
                />
                <input
                  type="number"
                  value={localParams.stochSlowing}
                  onChange={(e) => handleParamChange('stochSlowing', parseInt(e.target.value) || 3)}
                  className="w-1/3 bg-slate-950 border border-slate-800 rounded px-1 py-1 text-slate-200 text-center font-mono"
                />
              </div>
            </div>

            {/* Price Action & ADX */}
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">S/R Period & ADX Thresh</span>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={localParams.priceActionPeriod}
                  onChange={(e) => handleParamChange('priceActionPeriod', parseInt(e.target.value) || 15)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-center font-mono"
                  title="S/R Period (candles lookup)"
                />
                <input
                  type="number"
                  value={localParams.adxThreshold}
                  onChange={(e) => handleParamChange('adxThreshold', parseInt(e.target.value) || 25)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-center font-mono"
                  title="ADX Trend Filter Threshold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. CONFLUENCE META-STRATEGY DISPLAY */}
      {confluenceSignal && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Consensus Confluence</span>
            <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-semibold">
              Calculated Real-Time
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-white leading-none">
                {confluenceSignal.signal === 'BUY' && 'Strong BUY Consensus'}
                {confluenceSignal.signal === 'SELL' && 'Strong SELL Consensus'}
                {confluenceSignal.signal === 'HOLD' && 'Neutral Consensus'}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs">{confluenceSignal.details}</p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className={`px-4 py-2 rounded-xl border text-sm font-black tracking-wider shadow-sm flex items-center gap-1.5 ${getSignalColor(confluenceSignal.signal)}`}>
                {confluenceSignal.signal === 'BUY' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                {confluenceSignal.signal === 'SELL' && <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                {confluenceSignal.signal}
              </div>
              <span className="text-[10px] text-slate-500 mt-2 font-bold font-mono">
                {confluenceSignal.confidence}% Conviction
              </span>
            </div>
          </div>

          {/* Bar Visualizer */}
          {confluenceSignal.signal !== 'HOLD' && (
            <div className="mt-4 space-y-1">
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80 p-0.5">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${getConfidenceColor(confluenceSignal.signal)}`}
                  style={{ width: `${confluenceSignal.confidence}%` }}
                />
              </div>
            </div>
          )}

          {confluenceSignal.signal !== 'HOLD' && (
            <button
              onClick={() => onPrefillTrade(confluenceSignal.signal, 'Confluence Aggregator')}
              className="mt-4 w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-100 hover:text-white rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-rose-500 fill-current" />
              Pre-fill Trade Box with this Consensus Signal
            </button>
          )}
        </div>
      )}

      {/* 2. INDIVIDUAL SIGNALS LIST */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">
          Individual Quantitative Engines
        </span>

        {individualSignals.map((sig) => (
          <div
            key={sig.id}
            className="p-3.5 bg-slate-900/40 border border-slate-900 rounded-xl hover:bg-slate-900 hover:border-slate-800 transition-all group flex items-start justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${sig.signal === 'BUY' ? 'bg-emerald-500' : sig.signal === 'SELL' ? 'bg-rose-500' : 'bg-slate-700'}`} />
                <span className="text-xs font-bold text-slate-100 group-hover:text-white transition-all">{sig.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1 group-hover:text-slate-300 transition-all font-mono">
                {sig.details}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider border font-mono ${getSignalColor(sig.signal)}`}>
                {sig.signal}
              </span>

              {sig.signal !== 'HOLD' ? (
                <button
                  onClick={() => onPrefillTrade(sig.signal, sig.name)}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded hover:bg-rose-600 hover:text-white hover:border-rose-500 text-slate-400 transition-all cursor-pointer"
                  title={`Pre-fill ${sig.signal} order for ${sig.name}`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              ) : (
                <div className="w-6" /> // spacer
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
