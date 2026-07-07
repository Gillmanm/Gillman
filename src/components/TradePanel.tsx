import React, { useState, useEffect } from 'react';
import { ContractProposal, RiskSettings, DerivAccount } from '../types';
import { ArrowUp, ArrowDown, Shield, Info, Percent, RefreshCw, Sparkles, CheckSquare, Square } from 'lucide-react';

interface TradePanelProps {
  symbol: string;
  currency: string;
  activeProposal: ContractProposal | null;
  fetchingProposal: boolean;
  account: DerivAccount | null;
  riskSettings: RiskSettings;
  dailyPL: number;
  openTradesCount: number;
  onFetchProposal: (params: {
    contract_type: string;
    amount: number;
    duration: number;
    duration_unit: string;
    barrier?: string;
    multiplier?: number;
    limit_order?: { take_profit?: number; stop_loss?: number };
  }) => void;
  onExecuteTrade: (proposalId: string) => void;
  prefilledSignal: { direction: 'BUY' | 'SELL'; source: string } | null;
  onClearPrefill: () => void;
}

const CONTRACT_TYPES = [
  { id: 'Rise/Fall', label: 'Rise / Fall', types: { buy: 'CALL', sell: 'PUT' } },
  { id: 'Matches/Differs', label: 'Matches / Differs', types: { buy: 'DIGITMATCH', sell: 'DIGITDIFF' }, barrierRequired: true, barrierLabel: 'Last Digit Prediction' },
  { id: 'Even/Odd', label: 'Even / Odd', types: { buy: 'DIGITEVEN', sell: 'DIGITODD' } },
  { id: 'Over/Under', label: 'Over / Under', types: { buy: 'DIGITOVER', sell: 'DIGITUNDER' }, barrierRequired: true, barrierLabel: 'Prediction Digit' },
  { id: 'Touch/No Touch', label: 'Touch / No Touch', types: { buy: 'ONETOUCH', sell: 'NOTOUCH' }, barrierRequired: true, barrierLabel: 'Offset (e.g. +0.5)' },
  { id: 'Multipliers', label: 'Multipliers', types: { buy: 'MULTUP', sell: 'MULTDOWN' }, multiplierRequired: true },
];

export default function TradePanel({
  symbol,
  currency,
  activeProposal,
  fetchingProposal,
  account,
  riskSettings,
  dailyPL,
  openTradesCount,
  onFetchProposal,
  onExecuteTrade,
  prefilledSignal,
  onClearPrefill,
}: TradePanelProps) {
  // Inputs State
  const [selectedContract, setSelectedContract] = useState('Rise/Fall');
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy'); // buy = up/matches, sell = down/differs
  const [stake, setStake] = useState<number>(10);
  const [duration, setDuration] = useState<number>(5);
  const [durationUnit, setDurationUnit] = useState<string>('t'); // 't' = ticks, 's', 'm', 'h', 'd'
  const [barrier, setBarrier] = useState<string>('5'); // prediction digit or offset
  const [multiplier, setMultiplier] = useState<number>(10); // multipliers leverage
  
  // Multipliers Stop Loss & Take Profit
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');

  // Consent & Real Account State
  const [realAccountAgreed, setRealAccountAgreed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Prefill hook
  useEffect(() => {
    if (prefilledSignal) {
      setTradeDirection(prefilledSignal.direction === 'BUY' ? 'buy' : 'sell');
      onClearPrefill();
    }
  }, [prefilledSignal]);

  // Handle contract selections
  const activeContractInfo = CONTRACT_TYPES.find((c) => c.id === selectedContract);

  // Auto-fetch proposal when inputs update
  useEffect(() => {
    if (!activeContractInfo) return;

    setValidationError(null);

    // Basic Risk Checks
    if (stake > riskSettings.maxStake) {
      setValidationError(`Stake exceeds Max Stake Limit ($${riskSettings.maxStake})`);
      return;
    }

    if (openTradesCount >= riskSettings.maxConcurrentTrades) {
      setValidationError(`Max Concurrent Positions reached (${riskSettings.maxConcurrentTrades})`);
      return;
    }

    if (dailyPL <= -riskSettings.maxDailyLoss) {
      setValidationError(`Daily Loss Limit exceeded ($${riskSettings.maxDailyLoss}). Trading disabled.`);
      return;
    }

    const directionType = tradeDirection === 'buy' ? activeContractInfo.types.buy : activeContractInfo.types.sell;

    const requestParams: any = {
      contract_type: directionType,
      amount: stake,
      duration: duration,
      duration_unit: durationUnit,
    };

    if (activeContractInfo.barrierRequired) {
      requestParams.barrier = barrier;
    }

    if (activeContractInfo.multiplierRequired) {
      requestParams.multiplier = multiplier;
      
      const tpNum = parseFloat(takeProfit);
      const slNum = parseFloat(stopLoss);
      if (!isNaN(tpNum) || !isNaN(slNum)) {
        requestParams.limit_order = {};
        if (!isNaN(tpNum)) requestParams.limit_order.take_profit = tpNum;
        if (!isNaN(slNum)) requestParams.limit_order.stop_loss = slNum;
      }
    }

    onFetchProposal(requestParams);
  }, [
    selectedContract,
    tradeDirection,
    stake,
    duration,
    durationUnit,
    barrier,
    multiplier,
    takeProfit,
    stopLoss,
    symbol,
    riskSettings,
    dailyPL,
    openTradesCount,
  ]);

  const handlePlaceTradeClick = () => {
    if (validationError) return;

    // Consent check for real account
    if (account && !account.is_virtual && !realAccountAgreed) {
      setValidationError('You must check the consent checkbox before trading with real money.');
      return;
    }

    if (!activeProposal || activeProposal.error) {
      setValidationError(activeProposal?.error || 'No valid contract proposal loaded.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmTrade = () => {
    if (!activeProposal) return;
    onExecuteTrade(activeProposal.proposal_id);
    setShowConfirmModal(false);
  };

  const calculateROI = () => {
    if (!activeProposal) return 0;
    const ask = activeProposal.ask_price;
    const payout = activeProposal.payout;
    if (ask === 0) return 0;
    return ((payout - ask) / ask) * 100;
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-rose-500" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Execute Trade</h2>
        </div>
        <span className="text-xs text-slate-500 font-bold font-mono">
          Positions: {openTradesCount}/{riskSettings.maxConcurrentTrades}
        </span>
      </div>

      {/* Real Account consent banner */}
      {account && !account.is_virtual && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-amber-200 text-xs leading-relaxed space-y-2">
          <div className="flex gap-2 font-bold">
            <span className="text-amber-500 font-extrabold uppercase tracking-wider">⚠️ REAL MONEY ACCOUNT ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRealAccountAgreed(!realAccountAgreed)}
              className="text-amber-500 hover:text-amber-400 transition-all cursor-pointer shrink-0"
            >
              {realAccountAgreed ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span className="text-[10px] text-slate-300">
              I understand this action places a real trade with financial risk of loss.
            </span>
          </div>
        </div>
      )}

      {/* Account Balance Safety Checks */}
      {account && account.balance < stake && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/50 text-rose-200 text-[11px] rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span>Insufficient Account Balance! Stake is higher than your current balance (${account.balance.toFixed(2)}).</span>
        </div>
      )}

      {/* Contract type Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contract Type</label>
        <div className="grid grid-cols-2 gap-1.5">
          {CONTRACT_TYPES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedContract(c.id);
                // Reset defaults per type
                if (c.id === 'Matches/Differs') setBarrier('5');
                if (c.id === 'Over/Under') setBarrier('5');
                if (c.id === 'Touch/No Touch') setBarrier('+0.5');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                selectedContract === c.id
                  ? 'bg-rose-600 border-rose-500 text-white font-extrabold'
                  : 'bg-slate-900/40 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Direction Toggle */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trade Direction</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTradeDirection('buy')}
            className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              tradeDirection === 'buy'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-extrabold shadow-sm'
                : 'bg-slate-900/30 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
            }`}
          >
            <ArrowUp className="w-4 h-4 text-emerald-400" />
            {selectedContract === 'Rise/Fall' && 'Rise'}
            {selectedContract === 'Matches/Differs' && 'Matches'}
            {selectedContract === 'Even/Odd' && 'Even'}
            {selectedContract === 'Over/Under' && 'Over'}
            {selectedContract === 'Touch/No Touch' && 'Touch'}
            {selectedContract === 'Multipliers' && 'Up'}
          </button>

          <button
            onClick={() => setTradeDirection('sell')}
            className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              tradeDirection === 'sell'
                ? 'bg-rose-600/20 border-rose-500 text-rose-400 font-extrabold shadow-sm'
                : 'bg-slate-900/30 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
            }`}
          >
            <ArrowDown className="w-4 h-4 text-rose-400" />
            {selectedContract === 'Rise/Fall' && 'Fall'}
            {selectedContract === 'Matches/Differs' && 'Differs'}
            {selectedContract === 'Even/Odd' && 'Odd'}
            {selectedContract === 'Over/Under' && 'Under'}
            {selectedContract === 'Touch/No Touch' && 'No Touch'}
            {selectedContract === 'Multipliers' && 'Down'}
          </button>
        </div>
      </div>

      {/* Numeric Params Layout */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Stake */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stake ({currency})</label>
          <input
            type="number"
            min="0.35"
            step="1"
            value={stake}
            onChange={(e) => setStake(Math.max(0.35, parseFloat(e.target.value) || 0.35))}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
          />
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</label>
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value)}
              className="bg-transparent text-[10px] text-rose-400 font-bold focus:outline-none hover:text-rose-300 cursor-pointer"
            >
              <option value="t" className="bg-slate-950 text-slate-300">Ticks</option>
              <option value="s" className="bg-slate-950 text-slate-300">Secs</option>
              <option value="m" className="bg-slate-950 text-slate-300">Mins</option>
              <option value="h" className="bg-slate-950 text-slate-300">Hours</option>
              <option value="d" className="bg-slate-950 text-slate-300">Days</option>
            </select>
          </div>
          <input
            type="number"
            min="1"
            max={durationUnit === 't' ? 10 : 3600}
            value={duration}
            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
          />
        </div>
      </div>

      {/* Dynamic Barriers */}
      {activeContractInfo?.barrierRequired && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {activeContractInfo.barrierLabel}
          </label>
          <input
            type="text"
            value={barrier}
            onChange={(e) => setBarrier(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
          />
        </div>
      )}

      {/* Dynamic Multipliers Leverage / TP-SL */}
      {activeContractInfo?.multiplierRequired && (
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leverage Multiplier</label>
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
            >
              {[10, 20, 50, 100, 200, 500].map((m) => (
                <option key={m} value={m} className="bg-slate-950 text-slate-300">
                  x{m} Leverage
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Take Profit ({currency})</label>
              <input
                type="number"
                placeholder="Optional"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stop Loss ({currency})</label>
              <input
                type="number"
                placeholder="Optional"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. PROPOSAL PAYOUT PREVIEW */}
      <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-4 flex flex-col space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-2">
          <span className="font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
            Dynamic Payout Preview
          </span>
          {fetchingProposal && <RefreshCw className="w-3 h-3 text-rose-500 animate-spin" />}
        </div>

        {activeProposal ? (
          activeProposal.error ? (
            <div className="text-center py-2 text-rose-400 text-xs">
              ⚠️ {activeProposal.error}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 border border-slate-900 rounded-xl space-y-0.5">
                <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">Ask Price</span>
                <span className="font-extrabold text-white font-mono">
                  {currency} {activeProposal.ask_price.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 border border-slate-900 rounded-xl space-y-0.5">
                <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">Potential Payout</span>
                <span className="font-extrabold text-slate-100 font-mono">
                  {currency} {activeProposal.payout.toFixed(2)}
                </span>
              </div>
              <div className="col-span-2 bg-slate-950 p-2.5 border border-slate-900 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block">Net Return</span>
                  <span className="font-extrabold text-emerald-400 font-mono">
                    +{currency} {(activeProposal.payout - activeProposal.ask_price).toFixed(2)}
                  </span>
                </div>
                <div className="px-2 py-1 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 font-black text-[10px] rounded font-mono flex items-center">
                  <Percent className="w-2.5 h-2.5 mr-0.5" />
                  {calculateROI().toFixed(1)}% ROI
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-6 text-slate-500 text-[10px] font-semibold uppercase tracking-wider font-mono">
            Waiting for proposal specs...
          </div>
        )}
      </div>

      {/* ValidationError Alert */}
      {validationError && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs rounded-xl text-center">
          {validationError}
        </div>
      )}

      {/* MAIN PLACE TRADE BUTTON */}
      <button
        onClick={handlePlaceTradeClick}
        disabled={fetchingProposal || !!validationError || !activeProposal || (account && !account.is_virtual && !realAccountAgreed)}
        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl px-4 py-3.5 text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-rose-600/10 disabled:bg-slate-900 disabled:text-slate-600 disabled:shadow-none cursor-pointer"
      >
        Buy Contract Now
      </button>

      {/* DISK DISCLOSURE */}
      <div className="text-[9px] text-slate-600 leading-relaxed text-center">
        Trading is highly volatile and involves substantial risk of asset loss. Proceed with caution.
      </div>

      {/* CONFIRMATION OVERLAY MODAL */}
      {showConfirmModal && activeProposal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-3 flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-rose-500" />
              Confirm Trade Execution
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <p className="leading-relaxed">
                You are about to execute a <span className="font-bold text-white uppercase">{selectedContract}</span> contract on <span className="font-mono text-white">{symbol}</span>.
              </p>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contract Direction:</span>
                  <span className={`font-bold ${tradeDirection === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tradeDirection === 'buy' ? 'UP' : 'DOWN'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration Limit:</span>
                  <span className="font-semibold text-slate-200">
                    {duration} {durationUnit === 't' ? 'Ticks' : durationUnit === 's' ? 'Secs' : durationUnit === 'm' ? 'Mins' : 'Units'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-500">Total Risk (Stake):</span>
                  <span className="font-black text-rose-400">
                    {currency} {activeProposal.ask_price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Return:</span>
                  <span className="font-black text-emerald-400">
                    {currency} {activeProposal.payout.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTrade}
                className="py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-rose-600/15"
              >
                Accept & Place
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
