/**
 * Types and interfaces for the Deriv Trading Dashboard.
 */

export interface DerivAccount {
  loginid: string;
  currency: string;
  balance: number;
  email: string;
  is_virtual: boolean; // true = Demo, false = Real
  fullname?: string;
  token: string;
}

export interface ActiveSymbol {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  submarket_display_name: string;
  is_active: boolean;
  exchange_is_open: boolean;
}

export interface Candle {
  time: number; // UTC Epoch timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export type TimeframeUnit = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface StrategyParams {
  maFast: number;
  maSlow: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  bbPeriod: number;
  bbStdDev: number;
  stochK: number;
  stochD: number;
  stochSlowing: number;
  stochOverbought: number;
  stochOversold: number;
  priceActionPeriod: number;
  adxPeriod: number;
  adxThreshold: number;
}

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface StrategySignal {
  id: string;
  name: string;
  signal: SignalType;
  confidence: number; // 0 to 100
  details: string;
  enabled: boolean;
}

export interface RiskSettings {
  maxStake: number;
  maxDailyLoss: number;
  maxConcurrentTrades: number;
}

export interface OpenPosition {
  contract_id: number;
  symbol: string;
  display_name: string;
  contract_type: string;
  currency: string;
  stake: number;
  entry_price: number;
  current_price: number;
  profit: number; // profit/loss
  purchase_time: number;
  barrier?: string;
  is_expired: boolean;
}

export interface HistoricalTrade {
  id: string;
  contract_id: number;
  symbol: string;
  display_name: string;
  contract_type: string;
  stake: number;
  payout: number;
  profit: number;
  entry_price: number;
  exit_price: number;
  timestamp: number;
  strategy: string;
}

export interface AlertNotification {
  id: string;
  symbol: string;
  strategyName: string;
  signal: SignalType;
  confidence: number;
  timestamp: number;
  read: boolean;
}

export interface ContractProposal {
  proposal_id: string;
  ask_price: number;
  payout: number;
  spot: number;
  display_value: string;
  error?: string;
}
