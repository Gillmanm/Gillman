import React, { useState, useEffect, useRef } from 'react';
import ConnectScreen from './components/ConnectScreen';
import TradingChart from './components/TradingChart';
import StrategyPanel from './components/StrategyPanel';
import TradePanel from './components/TradePanel';
import PositionsPanel from './components/PositionsPanel';
import BacktestPanel from './components/BacktestPanel';
import WatchlistPanel from './components/WatchlistPanel';
import {
  DerivAccount,
  ActiveSymbol,
  Candle,
  TimeframeUnit,
  StrategyParams,
  StrategySignal,
  RiskSettings,
  OpenPosition,
  HistoricalTrade,
  AlertNotification,
  ContractProposal,
  SignalType,
} from './types';
import { runAllStrategies } from './utils/indicators';
import {
  Activity,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  Sliders,
  DollarSign,
  AlertTriangle,
  User,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

const DEFAULT_STRATEGY_PARAMS: StrategyParams = {
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

const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxStake: 100,
  maxDailyLoss: 250,
  maxConcurrentTrades: 5,
};

export default function App() {
  // Theme Management
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Authentication & Session
  const [token, setToken] = useState<string | null>(null);
  const [appId, setAppId] = useState<string>('36544');
  const [account, setAccount] = useState<DerivAccount | null>(null);
  const [authorizedAccounts, setAuthorizedAccounts] = useState<any[]>([]);
  const [connStatus, setConnStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [authError, setAuthError] = useState<string | null>(null);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const activeCandlesSubId = useRef<string | null>(null);
  const activeOpenContractsSubId = useRef<string | null>(null);

  // Markets & Active Symbols
  const [activeSymbols, setActiveSymbols] = useState<ActiveSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('R_100'); // Default to Volatility 100
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeUnit>('1m');

  // Candle Data & Current Signal State
  const [candles, setCandles] = useState<Candle[]>([]);
  const [strategyParams, setStrategyParams] = useState<StrategyParams>(DEFAULT_STRATEGY_PARAMS);
  const [signals, setSignals] = useState<StrategySignal[]>([]);

  // Watchlist & alerts state
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('deriv_watchlist');
    return saved ? JSON.parse(saved) : ['R_10', 'R_25', 'R_50', 'R_75'];
  });
  const [watchlistSignals, setWatchlistSignals] = useState<{ [symbol: string]: { signal: string; confidence: number; price: number } }>({});
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Trade Execution & Proposal State
  const [activeProposal, setActiveProposal] = useState<ContractProposal | null>(null);
  const [fetchingProposal, setFetchingProposal] = useState(false);
  const [prefilledTrade, setPrefilledTrade] = useState<{ direction: 'BUY' | 'SELL'; source: string } | null>(null);

  // Risk Management & Positions State
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(DEFAULT_RISK_SETTINGS);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [tradeHistory, setTradeHistory] = useState<HistoricalTrade[]>(() => {
    const saved = localStorage.getItem('deriv_trade_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [dailyPL, setDailyPL] = useState<number>(0);

  // Sound synthesis
  const playAlertSound = (type: string) => {
    if (type !== 'BUY' && type !== 'SELL') return;
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'BUY') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440.0, audioCtx.currentTime); // A4
        osc.frequency.setValueAtTime(349.23, audioCtx.currentTime + 0.15); // F4
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn('AudioContext chimes disabled', err);
    }
  };

  // Persist watchlist & trade logs
  useEffect(() => {
    localStorage.setItem('deriv_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('deriv_trade_history', JSON.stringify(tradeHistory));
    // Calculate daily PL from completed trades today
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const todayTrades = tradeHistory.filter((t) => t.timestamp >= startOfDay);
    const sum = todayTrades.reduce((acc, t) => acc + t.profit, 0);
    setDailyPL(sum);
  }, [tradeHistory]);

  // Map timeframe name to seconds granularity
  const getGranularitySeconds = (tf: TimeframeUnit): number => {
    switch (tf) {
      case '1m': return 60;
      case '5m': return 300;
      case '15m': return 900;
      case '30m': return 1800;
      case '1h': return 3600;
      case '4h': return 14400;
      case '1d': return 86400;
      default: return 60;
    }
  };

  // WebSocket connection & lifecycle controller
  const connectToDeriv = (authToken: string, app_id: string) => {
    setAuthError(null);
    setConnStatus('connecting');

    const socketUrl = `wss://ws.derivws.com/websockets/v3?app_id=${app_id}`;
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnStatus('connected');
      // Authorize session immediately
      ws.send(JSON.stringify({ authorize: authToken }));
    };

    ws.onclose = () => {
      setConnStatus('disconnected');
    };

    ws.onerror = (err) => {
      console.error('Deriv WebSocket Error:', err);
      setAuthError('Connection dropped. Please verify your internet connection or Token permissions.');
      setConnStatus('disconnected');
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        const msgType = response.msg_type;

        if (response.error) {
          if (msgType === 'authorize') {
            setAuthError(response.error.message || 'Invalid API Token supplied.');
            setConnStatus('disconnected');
            setToken(null);
          } else if (msgType === 'proposal') {
            setActiveProposal({
              proposal_id: '',
              ask_price: 0,
              payout: 0,
              spot: 0,
              display_value: '',
              error: response.error.message,
            });
            setFetchingProposal(false);
          }
          return;
        }

        // Router
        switch (msgType) {
          case 'authorize': {
            const auth = response.authorize;
            setAccount({
              loginid: auth.loginid,
              currency: auth.currency || 'USD',
              balance: parseFloat(auth.balance),
              email: auth.email,
              is_virtual: !!auth.is_virtual,
              fullname: auth.fullname,
              token: authToken,
            });
            setToken(authToken);
            setAppId(app_id);
            setAuthorizedAccounts(auth.account_list || []);

            // Request market assets
            ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));

            // Subscribe to live balance
            ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));

            // Subscribe to active contract states
            ws.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));

            // Subscribe to ticks of watchlist assets to get background prices
            if (watchlist.length > 0) {
              watchlist.forEach((sym) => {
                ws.send(JSON.stringify({ ticks: sym }));
              });
            }
            break;
          }

          case 'active_symbols':
            setActiveSymbols(
              (response.active_symbols || []).map((s: any) => ({
                symbol: s.symbol,
                display_name: s.display_name,
                market: s.market,
                market_display_name: s.market_display_name,
                submarket: s.submarket,
                submarket_display_name: s.submarket_display_name,
                is_active: s.is_active === 1,
                exchange_is_open: s.exchange_is_open === 1,
              }))
            );
            break;

          case 'balance': {
            const bal = response.balance;
            setAccount((prev) => (prev ? { ...prev, balance: parseFloat(bal.balance) } : null));
            break;
          }

          case 'candles': {
            // Initial historic data
            const loadedCandles = (response.candles || []).map((c: any) => ({
              time: c.epoch,
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
            }));
            setCandles(loadedCandles);
            break;
          }

          case 'ohlc': {
            // Live continuous ticks update
            const ohlc = response.ohlc;
            if (ohlc.symbol !== selectedSymbol) return;

            const nextCandle: Candle = {
              time: ohlc.open_time,
              open: parseFloat(ohlc.open),
              high: parseFloat(ohlc.high),
              low: parseFloat(ohlc.low),
              close: parseFloat(ohlc.close),
            };

            setCandles((prev) => {
              if (prev.length === 0) return [nextCandle];
              const last = prev[prev.length - 1];
              if (last.time === nextCandle.time) {
                return [...prev.slice(0, -1), nextCandle];
              } else {
                return [...prev, nextCandle];
              }
            });
            break;
          }

          case 'tick': {
            const tick = response.tick;
            setWatchlistSignals((prev) => {
              const prevSym = prev[tick.symbol] || { signal: 'HOLD', confidence: 0, price: 0 };
              return {
                ...prev,
                [tick.symbol]: { ...prevSym, price: parseFloat(tick.quote) },
              };
            });
            break;
          }

          case 'proposal': {
            const prop = response.proposal;
            setActiveProposal({
              proposal_id: prop.id,
              ask_price: parseFloat(prop.ask_price),
              payout: parseFloat(prop.payout),
              spot: parseFloat(prop.spot),
              display_value: prop.display_value,
            });
            setFetchingProposal(false);
            break;
          }

          case 'buy': {
            // Contract execution confirmation received
            const buy = response.buy;
            // Fetch live balances and positions again
            wsRef.current?.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
            break;
          }

          case 'proposal_open_contract': {
            const contract = response.proposal_open_contract;
            if (!contract) return;

            const isCompleted = contract.is_expired === 1 || contract.is_settleable === 1 || contract.status !== 'open';

            if (isCompleted) {
              // Settlement finished! Remove from active and add to history
              setOpenPositions((prev) => prev.filter((p) => p.contract_id !== contract.contract_id));

              // Avoid duplicate append
              setTradeHistory((prev) => {
                const exists = prev.some((t) => t.contract_id === contract.contract_id);
                if (exists) return prev;

                const completed: HistoricalTrade = {
                  id: String(contract.contract_id),
                  contract_id: contract.contract_id,
                  symbol: contract.underlying,
                  display_name: contract.display_name,
                  contract_type: contract.contract_type,
                  stake: parseFloat(contract.buy_price),
                  payout: parseFloat(contract.payout),
                  profit: parseFloat(contract.profit),
                  entry_price: parseFloat(contract.entry_spot),
                  exit_price: parseFloat(contract.exit_tick || contract.current_spot || '0'),
                  timestamp: Date.now(),
                  strategy: 'Confluence Aggregator',
                };
                return [...prev, completed];
              });
            } else {
              // Append or update existing open position
              setOpenPositions((prev) => {
                const idx = prev.findIndex((p) => p.contract_id === contract.contract_id);
                const active: OpenPosition = {
                  contract_id: contract.contract_id,
                  symbol: contract.underlying,
                  display_name: contract.display_name,
                  contract_type: contract.contract_type,
                  currency: contract.currency,
                  stake: parseFloat(contract.buy_price),
                  entry_price: parseFloat(contract.entry_spot),
                  current_price: parseFloat(contract.current_spot),
                  profit: parseFloat(contract.profit),
                  purchase_time: contract.date_start,
                  barrier: contract.barrier,
                  is_expired: false,
                };

                if (idx > -1) {
                  const updated = [...prev];
                  updated[idx] = active;
                  return updated;
                } else {
                  return [...prev, active];
                }
              });
            }
            break;
          }
        }
      } catch (err) {
        console.error('Failed parsing WebSocket message:', err);
      }
    };
  };

  // Clean disconnect
  const disconnectSession = () => {
    wsRef.current?.close();
    setAccount(null);
    setToken(null);
    setCandles([]);
    setOpenPositions([]);
    setSignals([]);
  };

  // Subscribe/Unsubscribe candles on active symbol change
  useEffect(() => {
    if (!token || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setCandles([]);

    // Unsubscribe previous candles if active
    if (activeCandlesSubId.current) {
      wsRef.current.send(JSON.stringify({ forget: activeCandlesSubId.current }));
      activeCandlesSubId.current = null;
    }

    // Subscribe to new symbol candles
    const gran = getGranularitySeconds(selectedTimeframe);
    wsRef.current.send(
      JSON.stringify({
        ticks_history: selectedSymbol,
        adjust_start_time: 1,
        count: 500,
        end: 'latest',
        style: 'candles',
        granularity: gran,
        subscribe: 1,
      })
    );

    // Capture subscription ID from subsequent message if needed, or forget by handle
    activeCandlesSubId.current = selectedSymbol; // proxy
  }, [selectedSymbol, selectedTimeframe, token]);

  // Compute live strategies on current candles updates
  useEffect(() => {
    if (candles.length < 30) {
      setSignals([]);
      return;
    }

    const nextSignals = runAllStrategies(candles, strategyParams);
    setSignals(nextSignals);

    // Check if the overall confluence meta-signal has changed to generate alerts
    const confluence = nextSignals.find((s) => s.id === 'confluence');
    if (confluence && confluence.signal !== 'HOLD' && confluence.confidence >= 65) {
      // Check if this alert was already triggered recently to avoid spam
      const recentLimit = Date.now() - 60000; // 1-minute throttle per symbol
      const alreadyFired = alerts.some(
        (a) => a.symbol === selectedSymbol && a.signal === confluence.signal && a.timestamp > recentLimit
      );

      if (!alreadyFired) {
        const nextAlert: AlertNotification = {
          id: String(Date.now()),
          symbol: selectedSymbol,
          strategyName: 'Confluence Aggregator',
          signal: confluence.signal,
          confidence: confluence.confidence,
          timestamp: Date.now(),
          read: false,
        };
        setAlerts((prev) => [...prev, nextAlert]);
        playAlertSound(confluence.signal);
      }
    }
  }, [candles, strategyParams]);

  // Background Scanning for Watchlist signals
  useEffect(() => {
    if (!token || !wsRef.current || watchlist.length === 0) return;

    const backgroundScanner = setInterval(() => {
      watchlist.forEach((sym) => {
        if (sym === selectedSymbol) return; // skip active

        // Request brief static candle history for background analysis
        wsRef.current?.send(
          JSON.stringify({
            ticks_history: sym,
            adjust_start_time: 1,
            count: 40,
            end: 'latest',
            style: 'candles',
            granularity: 60, // 1m candles for background speed
          })
        );
      });
    }, 45000); // scan every 45 seconds

    // Capture temporary handler for response
    const handleBackgroundMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'candles' && data.echo_req.ticks_history !== selectedSymbol) {
          const bgSym = data.echo_req.ticks_history;
          const bgCandles = (data.candles || []).map((c: any) => ({
            time: c.epoch,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
          }));

          if (bgCandles.length >= 30) {
            const bgSigs = runAllStrategies(bgCandles, strategyParams);
            const conf = bgSigs.find((s) => s.id === 'confluence');
            if (conf) {
              setWatchlistSignals((prev) => {
                const prevPrice = prev[bgSym]?.price || 0;
                return {
                  ...prev,
                  [bgSym]: { signal: conf.signal, confidence: conf.confidence, price: prevPrice },
                };
              });

              // Fire Background alert warning!
              if (conf.signal !== 'HOLD' && conf.confidence >= 65) {
                setAlerts((prev) => {
                  const recent = Date.now() - 60000;
                  const already = prev.some((a) => a.symbol === bgSym && a.signal === conf.signal && a.timestamp > recent);
                  if (already) return prev;

                  const nextAlert: AlertNotification = {
                    id: String(Date.now()),
                    symbol: bgSym,
                    strategyName: 'Confluence Aggregator',
                    signal: conf.signal,
                    confidence: conf.confidence,
                    timestamp: Date.now(),
                    read: false,
                  };
                  // trigger background alert sounds!
                  playAlertSound(conf.signal);
                  return [...prev, nextAlert];
                });
              }
            }
          }
        }
      } catch (err) {
        // ignore background parsing errors
      }
    };

    wsRef.current.addEventListener('message', handleBackgroundMessage);

    return () => {
      clearInterval(backgroundScanner);
      wsRef.current?.removeEventListener('message', handleBackgroundMessage);
    };
  }, [watchlist, token, selectedSymbol, strategyParams]);

  // Request pricing proposal for Trade box
  const handleFetchProposal = (params: any) => {
    if (!token || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setFetchingProposal(true);
    const request = {
      proposal: 1,
      amount: params.amount,
      basis: 'stake',
      contract_type: params.contract_type,
      currency: account?.currency || 'USD',
      duration: params.duration,
      duration_unit: params.duration_unit,
      symbol: selectedSymbol,
      ...(params.barrier ? { barrier: params.barrier } : {}),
      ...(params.multiplier ? { multiplier: params.multiplier } : {}),
      ...(params.limit_order ? { limit_order: params.limit_order } : {}),
    };

    wsRef.current.send(JSON.stringify(request));
  };

  // Place actual buy contract
  const handleExecuteTrade = (proposalId: string) => {
    if (!token || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        buy: proposalId,
        price: activeProposal?.ask_price || 0,
      })
    );
  };

  // Sell/Close open position early
  const handleClosePosition = (contractId: number) => {
    if (!token || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        sell: contractId,
        price: 0, // close at current live market rate
      })
    );
  };

  // Switch accounts if linked (Demo <-> Real)
  const handleSwitchAccount = (tgtLoginId: string) => {
    if (!token || !wsRef.current) return;
    // Simple alert asking the user to reconnect with the linked token if it is different,
    // or request authorize session again if token covers both.
    const tgtAcc = authorizedAccounts.find((a) => a.loginid === tgtLoginId);
    if (tgtAcc) {
      disconnectSession();
      // Ask user to enter appropriate token for target account, or re-authorize
      setAuthError(`Switching to account ${tgtLoginId}. Please enter the corresponding API Token.`);
    }
  };

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900'}`}>
      {!token ? (
        <ConnectScreen
          onConnect={connectToDeriv}
          isLoading={connStatus === 'connecting'}
          error={authError}
        />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* HEADER BAR */}
          <header className={`border-b ${isDarkMode ? 'bg-slate-900/60 border-slate-900' : 'bg-white border-slate-200'} sticky top-0 z-40 backdrop-blur-md px-6 py-4`}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Branding and Connectivity info */}
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-rose-600 rounded-xl shadow-lg shadow-rose-600/10">
                  <span className="text-lg font-black text-white tracking-wider font-mono">D</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-md font-extrabold tracking-tight">Deriv Strategy Terminal</h1>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                      WS Server Status: {connStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account, Balance info and switchers */}
              {account && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Account detail Badge */}
                  <div className={`flex items-center space-x-3 px-4 py-2 rounded-2xl border ${
                    account.is_virtual
                      ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400'
                      : 'bg-rose-950/20 border-rose-900/30 text-rose-400'
                  }`}>
                    <div className="space-y-0.5 text-left">
                      <span className="text-[9px] font-black uppercase tracking-widest block font-mono">
                        {account.is_virtual ? 'Demo Sandbox' : 'Real Account'}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-300">
                        {account.loginid} ({account.currency})
                      </span>
                    </div>

                    <div className="border-l border-slate-800 h-6 mx-1" />

                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Live Balance</span>
                      <span className="text-sm font-extrabold font-mono text-slate-100">
                        {account.currency} {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Settings Toggle, Logout, Theme */}
                  <div className="flex items-center bg-slate-900/50 border border-slate-800 p-0.5 rounded-xl">
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                      title="Switch Light/Dark Theme"
                    >
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={disconnectSession}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                      title="Disconnect trading session"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* MAIN GRID DASHBOARD */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* LEFT PANEL: Market Selector & Watchlist */}
            <section className="lg:col-span-1 space-y-6">
              {/* Market Selection widget */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                  <Activity className="w-5 h-5 text-rose-500" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Asset Catalog</h2>
                </div>

                {activeSymbols.length === 0 ? (
                  <div className="flex justify-center items-center py-6 text-xs text-slate-500 font-semibold uppercase tracking-wider font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Loading Asset Feed...
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* Active Asset Selector */}
                    <div className="space-y-1.5">
                      <label htmlFor="assetSelect" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Market</label>
                      <select
                        id="assetSelect"
                        value={selectedSymbol}
                        onChange={(e) => setSelectedSymbol(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                      >
                        {/* Grouped by market */}
                        {Array.from(new Set(activeSymbols.map((s) => s.market_display_name))).map((mkt) => (
                          <optgroup key={mkt} label={mkt} className="bg-slate-950 text-slate-400">
                            {activeSymbols
                              .filter((s) => s.market_display_name === mkt && s.exchange_is_open)
                              .map((s) => (
                                <option key={s.symbol} value={s.symbol} className="text-slate-200 font-mono">
                                  {s.display_name}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Candle Interval</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as TimeframeUnit[]).map((tf) => (
                          <button
                            key={tf}
                            onClick={() => setSelectedTimeframe(tf)}
                            className={`py-1.5 rounded text-[10px] font-bold border font-mono transition-all cursor-pointer ${
                              selectedTimeframe === tf
                                ? 'bg-rose-600 border-rose-500 text-white font-extrabold'
                                : 'bg-slate-900/40 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Watchlist & Alerts log Panel */}
              <WatchlistPanel
                watchlist={watchlist}
                watchlistSignals={watchlistSignals}
                activeSymbols={activeSymbols}
                alerts={alerts}
                audioEnabled={audioEnabled}
                onToggleAudio={() => setAudioEnabled(!audioEnabled)}
                onAddWatchlist={(sym) => setWatchlist((prev) => [...prev, sym])}
                onRemoveWatchlist={(sym) => setWatchlist((prev) => prev.filter((s) => s !== sym))}
                onClearAlerts={() => setAlerts([])}
                onSelectSymbol={(sym) => setSelectedSymbol(sym)}
              />
            </section>

            {/* CENTER PANEL: Main Live Chart & Simulators */}
            <section className="lg:col-span-2 space-y-6 flex flex-col">
              
              {/* Daily Risk Management Tracker Banner */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-rose-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">Daily Trading Session Limits</span>
                </div>
                
                <div className="flex flex-wrap gap-4 text-xs font-mono font-bold">
                  <div className="flex gap-1">
                    <span className="text-slate-500">Stake Limit:</span>
                    <span className="text-slate-200">${riskSettings.maxStake}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-slate-500">Daily Loss Limit:</span>
                    <span className="text-rose-400">${riskSettings.maxDailyLoss}</span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-slate-500">Session P/L:</span>
                    <span className={dailyPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {dailyPL >= 0 ? '+' : ''}${dailyPL.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Candle chart */}
              <div className="flex-1 min-h-[480px]">
                <TradingChart
                  candles={candles}
                  symbol={selectedSymbol}
                  timeframe={selectedTimeframe}
                  params={strategyParams}
                />
              </div>

              {/* Backtesting Simulator Panel */}
              <BacktestPanel
                candles={candles}
                symbol={selectedSymbol}
                timeframe={selectedTimeframe}
                params={strategyParams}
              />
            </section>

            {/* RIGHT PANEL: Strategy Signals & Orders Panel */}
            <section className="lg:col-span-1 space-y-6">
              {/* Strategy Engine Card */}
              <StrategyPanel
                signals={signals}
                params={strategyParams}
                onParamsChange={(p) => setStrategyParams(p)}
                onPrefillTrade={(sig, src) => setPrefilledTrade({ direction: sig === 'BUY' ? 'BUY' : 'SELL', source: src })}
              />

              {/* Order execute entry box */}
              <TradePanel
                symbol={selectedSymbol}
                currency={account?.currency || 'USD'}
                activeProposal={activeProposal}
                fetchingProposal={fetchingProposal}
                account={account}
                riskSettings={riskSettings}
                dailyPL={dailyPL}
                openTradesCount={openPositions.length}
                onFetchProposal={handleFetchProposal}
                onExecuteTrade={handleExecuteTrade}
                prefilledSignal={prefilledTrade}
                onClearPrefill={() => setPrefilledTrade(null)}
              />
            </section>

            {/* BOTTOM PANEL: Positions and trade history ledger */}
            <section className="lg:col-span-4 mt-2">
              <PositionsPanel
                openPositions={openPositions}
                tradeHistory={tradeHistory}
                currency={account?.currency || 'USD'}
                onClosePosition={handleClosePosition}
              />
            </section>
          </main>

          {/* SYSTEM DISCLAIMER FOOTER */}
          <footer className={`mt-auto border-t py-6 px-8 text-center text-[10px] text-slate-500 leading-relaxed font-mono ${
            isDarkMode ? 'bg-slate-950 border-slate-900' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="max-w-7xl mx-auto space-y-1.5">
              <p>Trading financial markets involves high risk of capital loss and is not suitable for all investors.</p>
              <p>
                All quantitative signals are generated algorithmically for assistance purposes only and do not constitute professional investment advice.
              </p>
              <p className="text-slate-600">
                Deriv Multi-Strategy Terminal &copy; 2026. Connected natively to wss://ws.derivws.com/websockets/v3.
              </p>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
