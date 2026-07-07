import { Candle, StrategyParams, StrategySignal, SignalType } from '../types';

// Helper: Simple Moving Average (SMA)
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i]); // default or padding
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }
  return sma;
}

// Helper: Exponential Moving Average (EMA)
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length === 0) return [];
  
  const k = 2 / (period + 1);
  let prevEma = data[0];
  ema.push(prevEma);

  for (let i = 1; i < data.length; i++) {
    const currentEma = data[i] * k + prevEma * (1 - k);
    ema.push(currentEma);
    prevEma = currentEma;
  }
  return ema;
}

// Helper: Relative Strength Index (RSI)
export function calculateRSI(data: number[], period: number): number[] {
  const rsi: number[] = [];
  if (data.length < 2) return Array(data.length).fill(50);

  let avgGain = 0;
  let avgLoss = 0;

  // Initialize first average gain/loss
  for (let i = 1; i <= period && i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) {
      avgGain += diff;
    } else {
      avgLoss -= diff;
    }
  }

  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < data.length; i++) {
    if (i <= period) {
      rsi.push(50); // standard baseline
      continue;
    }

    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

// Helper: Bollinger Bands
export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateBollingerBands(data: number[], period: number, stdDevMultiplier: number): BollingerBandsResult {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(data[i]);
      lower.push(data[i]);
      continue;
    }

    let sumOfSquares = 0;
    const currentMiddle = middle[i];
    for (let j = 0; j < period; j++) {
      const dev = data[i - j] - currentMiddle;
      sumOfSquares += dev * dev;
    }

    const stdDev = Math.sqrt(sumOfSquares / period);
    upper.push(currentMiddle + stdDevMultiplier * stdDev);
    lower.push(currentMiddle - stdDevMultiplier * stdDev);
  }

  return { upper, middle, lower };
}

// Helper: MACD
export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export function calculateMACD(data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MACDResult {
  const fastEma = calculateEMA(data, fastPeriod);
  const slowEma = calculateEMA(data, slowPeriod);
  
  const macdLine: number[] = [];
  for (let i = 0; i < data.length; i++) {
    macdLine.push(fastEma[i] - slowEma[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];
  for (let i = 0; i < data.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return { macdLine, signalLine, histogram };
}

// Helper: Stochastic Oscillator
export interface StochasticResult {
  kLine: number[];
  dLine: number[];
}

export function calculateStochastic(
  candles: Candle[],
  kPeriod: number,
  dPeriod: number,
  slowing: number
): StochasticResult {
  const rawK: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      rawK.push(50);
      continue;
    }

    let lowestLow = Infinity;
    let highestHigh = -Infinity;

    for (let j = 0; j < kPeriod; j++) {
      const candle = candles[i - j];
      if (candle.low < lowestLow) lowestLow = candle.low;
      if (candle.high > highestHigh) highestHigh = candle.high;
    }

    const denominator = highestHigh - lowestLow;
    if (denominator === 0) {
      rawK.push(50);
    } else {
      rawK.push(((candles[i].close - lowestLow) / denominator) * 100);
    }
  }

  // Smooth rawK to get K line
  const kLine = calculateSMA(rawK, slowing);
  // Smooth K line to get D line
  const dLine = calculateSMA(kLine, dPeriod);

  return { kLine, dLine };
}

// Helper: ADX (Average Directional Index)
export interface ADXResult {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

export function calculateADX(candles: Candle[], period: number): ADXResult {
  const n = candles.length;
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  if (n === 0) {
    return { adx: [], plusDI: [], minusDI: [] };
  }

  tr.push(candles[0].high - candles[0].low);
  plusDM.push(0);
  minusDM.push(0);

  for (let i = 1; i < n; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    // True Range (TR)
    const tr1 = curr.high - curr.low;
    const tr2 = Math.abs(curr.high - prev.close);
    const tr3 = Math.abs(curr.low - prev.close);
    tr.push(Math.max(tr1, tr2, tr3));

    // Directional Movement (+DM / -DM)
    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  // Wilder's Smoothing
  const smoothedTR = calculateEMA(tr, period);
  const smoothedPlusDM = calculateEMA(plusDM, period);
  const smoothedMinusDM = calculateEMA(minusDM, period);

  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];

  for (let i = 0; i < n; i++) {
    const trVal = smoothedTR[i];
    const pDM = smoothedPlusDM[i];
    const mDM = smoothedMinusDM[i];

    if (trVal === 0) {
      plusDI.push(0);
      minusDI.push(0);
      dx.push(0);
    } else {
      const pDI = (pDM / trVal) * 100;
      const mDI = (mDM / trVal) * 100;
      plusDI.push(pDI);
      minusDI.push(mDI);

      const sum = pDI + mDI;
      const diff = Math.abs(pDI - mDI);
      dx.push(sum === 0 ? 0 : (diff / sum) * 100);
    }
  }

  const adx = calculateEMA(dx, period);

  return { adx, plusDI, minusDI };
}

// Helper: Support & Resistance Pivot Levels
export interface PivotLevels {
  support: number[];
  resistance: number[];
  recentSupports: number[];
  recentResistances: number[];
}

export function calculatePivotLevels(candles: Candle[], windowSize: number): PivotLevels {
  const n = candles.length;
  const support = Array(n).fill(0);
  const resistance = Array(n).fill(0);

  const localSupports: number[] = [];
  const localResistances: number[] = [];

  for (let i = windowSize; i < n - windowSize; i++) {
    let isSupport = true;
    let isResistance = true;

    for (let j = -windowSize; j <= windowSize; j++) {
      if (j === 0) continue;
      if (candles[i].low > candles[i + j].low) {
        isSupport = false;
      }
      if (candles[i].high < candles[i + j].high) {
        isResistance = false;
      }
    }

    if (isSupport) {
      localSupports.push(candles[i].low);
    }
    if (isResistance) {
      localResistances.push(candles[i].high);
    }

    // Keep active support & resistance (latest values)
    support[i] = localSupports.length > 0 ? localSupports[localSupports.length - 1] : candles[i].low;
    resistance[i] = localResistances.length > 0 ? localResistances[localResistances.length - 1] : candles[i].high;
  }

  // Forward fill the end
  let lastSupport = localSupports.length > 0 ? localSupports[localSupports.length - 1] : (n > 0 ? candles[n-1].low : 0);
  let lastResistance = localResistances.length > 0 ? localResistances[localResistances.length - 1] : (n > 0 ? candles[n-1].high : 0);

  for (let i = 0; i < n; i++) {
    if (i < windowSize) {
      support[i] = candles[i].low;
      resistance[i] = candles[i].high;
    } else if (i >= n - windowSize) {
      support[i] = lastSupport;
      resistance[i] = lastResistance;
    }
  }

  // Extract top 3 unique values for visual/math S-R lines
  const uniqueS = Array.from(new Set(localSupports)).slice(-4);
  const uniqueR = Array.from(new Set(localResistances)).slice(-4);

  return {
    support,
    resistance,
    recentSupports: uniqueS,
    recentResistances: uniqueR,
  };
}

// STRATEGY CALCULATIONS
export function runAllStrategies(candles: Candle[], params: StrategyParams): StrategySignal[] {
  const signals: StrategySignal[] = [];
  const closes = candles.map((c) => c.close);
  const n = candles.length;

  if (n < 30) {
    // Insufficient candles to run indicators safely
    return [
      { id: 'ma_cross', name: 'Moving Average Crossover', signal: 'HOLD', confidence: 0, details: 'Insufficient data (< 30 candles)', enabled: true },
      { id: 'rsi', name: 'RSI Oscillation', signal: 'HOLD', confidence: 0, details: 'Insufficient data', enabled: true },
      { id: 'macd', name: 'MACD Momentum', signal: 'HOLD', confidence: 0, details: 'Insufficient data', enabled: true },
      { id: 'bb', name: 'Bollinger Band Reversion', signal: 'HOLD', confidence: 0, details: 'Insufficient data', enabled: true },
      { id: 'stoch', name: 'Stochastic Oscillator', signal: 'HOLD', confidence: 0, details: 'Insufficient data', enabled: true },
      { id: 'price_action', name: 'Price Action S/R Breakout', signal: 'HOLD', confidence: 0, details: 'Insufficient data', enabled: true },
      { id: 'trend_strength', name: 'ADX Trend Strength', signal: 'HOLD', confidence: 0, details: 'Insufficient data', enabled: true },
      { id: 'confluence', name: 'Confluence Aggregator', signal: 'HOLD', confidence: 0, details: 'Insufficient data', enabled: true },
    ];
  }

  const latestClose = closes[n - 1];
  const prevClose = closes[n - 2];

  // 1. Moving Average Crossover Strategy
  const fastMA = calculateEMA(closes, params.maFast);
  const slowMA = calculateEMA(closes, params.maSlow);
  const currentFast = fastMA[n - 1];
  const currentSlow = slowMA[n - 1];
  const prevFast = fastMA[n - 2];
  const prevSlow = slowMA[n - 2];

  let maSignal: SignalType = 'HOLD';
  let maConfidence = 0;
  let maDetails = '';

  if (prevFast <= prevSlow && currentFast > currentSlow) {
    maSignal = 'BUY';
    maConfidence = 80;
    maDetails = `Fast EMA (${currentFast.toFixed(4)}) crossed above Slow EMA (${currentSlow.toFixed(4)})`;
  } else if (prevFast >= prevSlow && currentFast < currentSlow) {
    maSignal = 'SELL';
    maConfidence = 80;
    maDetails = `Fast EMA (${currentFast.toFixed(4)}) crossed below Slow EMA (${currentSlow.toFixed(4)})`;
  } else {
    maSignal = currentFast > currentSlow ? 'BUY' : 'SELL';
    maConfidence = 40; // weaker signal for continuation
    maDetails = `Fast EMA is currently ${currentFast > currentSlow ? 'above' : 'below'} Slow EMA (no recent cross)`;
  }
  signals.push({ id: 'ma_cross', name: 'Moving Average Crossover', signal: maSignal, confidence: maConfidence, details: maDetails, enabled: true });

  // 2. RSI Strategy
  const rsiValues = calculateRSI(closes, params.rsiPeriod);
  const currentRSI = rsiValues[n - 1];
  const prevRSI = rsiValues[n - 2];

  let rsiSignal: SignalType = 'HOLD';
  let rsiConfidence = 0;
  let rsiDetails = `RSI is currently ${currentRSI.toFixed(1)}`;

  if (currentRSI <= params.rsiOversold) {
    rsiSignal = 'BUY';
    rsiConfidence = Math.min(100, Math.round(50 + (params.rsiOversold - currentRSI) * 3));
    rsiDetails = `Oversold condition: RSI (${currentRSI.toFixed(1)}) <= ${params.rsiOversold}`;
  } else if (currentRSI >= params.rsiOverbought) {
    rsiSignal = 'SELL';
    rsiConfidence = Math.min(100, Math.round(50 + (currentRSI - params.rsiOverbought) * 3));
    rsiDetails = `Overbought condition: RSI (${currentRSI.toFixed(1)}) >= ${params.rsiOverbought}`;
  } else if (prevRSI <= params.rsiOversold && currentRSI > params.rsiOversold) {
    rsiSignal = 'BUY';
    rsiConfidence = 75;
    rsiDetails = `RSI exiting oversold region: ${currentRSI.toFixed(1)}`;
  } else if (prevRSI >= params.rsiOverbought && currentRSI < params.rsiOverbought) {
    rsiSignal = 'SELL';
    rsiConfidence = 75;
    rsiDetails = `RSI exiting overbought region: ${currentRSI.toFixed(1)}`;
  } else {
    rsiSignal = 'HOLD';
    rsiConfidence = 0;
  }
  signals.push({ id: 'rsi', name: 'RSI Oscillation', signal: rsiSignal, confidence: rsiConfidence, details: rsiDetails, enabled: true });

  // 3. MACD Strategy
  const macdRes = calculateMACD(closes, params.macdFast, params.macdSlow, params.macdSignal);
  const currMacd = macdRes.macdLine[n - 1];
  const currSignal = macdRes.signalLine[n - 1];
  const prevMacd = macdRes.macdLine[n - 2];
  const prevSignal = macdRes.signalLine[n - 2];
  const currHist = macdRes.histogram[n - 1];
  const prevHist = macdRes.histogram[n - 2];

  let macdSignal: SignalType = 'HOLD';
  let macdConfidence = 0;
  let macdDetails = '';

  if (prevMacd <= prevSignal && currMacd > currSignal) {
    macdSignal = 'BUY';
    macdConfidence = 85;
    macdDetails = 'MACD line crossed above signal line';
  } else if (prevMacd >= prevSignal && currMacd < currSignal) {
    macdSignal = 'SELL';
    macdConfidence = 85;
    macdDetails = 'MACD line crossed below signal line';
  } else if (currHist > 0 && currHist > prevHist) {
    macdSignal = 'BUY';
    macdConfidence = 50;
    macdDetails = 'MACD histogram showing increasing bullish momentum';
  } else if (currHist < 0 && currHist < prevHist) {
    macdSignal = 'SELL';
    macdConfidence = 50;
    macdDetails = 'MACD histogram showing increasing bearish momentum';
  } else {
    macdSignal = currMacd > currSignal ? 'BUY' : 'SELL';
    macdConfidence = 30;
    macdDetails = `MACD line is ${currMacd > currSignal ? 'above' : 'below'} signal line (flat momentum)`;
  }
  signals.push({ id: 'macd', name: 'MACD Momentum', signal: macdSignal, confidence: macdConfidence, details: macdDetails, enabled: true });

  // 4. Bollinger Band Strategy
  const bbRes = calculateBollingerBands(closes, params.bbPeriod, params.bbStdDev);
  const currUpper = bbRes.upper[n - 1];
  const currLower = bbRes.lower[n - 1];
  const currMiddle = bbRes.middle[n - 1];

  let bbSignal: SignalType = 'HOLD';
  let bbConfidence = 0;
  let bbDetails = '';

  if (latestClose <= currLower) {
    bbSignal = 'BUY';
    bbConfidence = 80;
    bbDetails = `Price closed below lower Bollinger Band (${currLower.toFixed(4)}) - Mean reversion candidate`;
  } else if (latestClose >= currUpper) {
    bbSignal = 'SELL';
    bbConfidence = 80;
    bbDetails = `Price closed above upper Bollinger Band (${currUpper.toFixed(4)}) - Mean reversion candidate`;
  } else {
    const distToLower = latestClose - currLower;
    const distToUpper = currUpper - latestClose;
    const range = currUpper - currLower;

    if (distToLower / range < 0.15) {
      bbSignal = 'BUY';
      bbConfidence = 55;
      bbDetails = `Price approaching lower Bollinger Band (within ${(distToLower / range * 100).toFixed(0)}% of range)`;
    } else if (distToUpper / range < 0.15) {
      bbSignal = 'SELL';
      bbConfidence = 55;
      bbDetails = `Price approaching upper Bollinger Band (within ${(distToUpper / range * 100).toFixed(0)}% of range)`;
    } else {
      bbSignal = 'HOLD';
      bbConfidence = 0;
      bbDetails = `Price trading in middle Bollinger Band channel`;
    }
  }
  signals.push({ id: 'bb', name: 'Bollinger Band Reversion', signal: bbSignal, confidence: bbConfidence, details: bbDetails, enabled: true });

  // 5. Stochastic Oscillator Strategy
  const stochRes = calculateStochastic(candles, params.stochK, params.stochD, params.stochSlowing);
  const currK = stochRes.kLine[n - 1];
  const currD = stochRes.dLine[n - 1];
  const prevK = stochRes.kLine[n - 2];
  const prevD = stochRes.dLine[n - 2];

  let stochSignal: SignalType = 'HOLD';
  let stochConfidence = 0;
  let stochDetails = `Stochastic: %K=${currK.toFixed(1)}, %D=${currD.toFixed(1)}`;

  if (currK <= params.stochOversold && prevK <= prevD && currK > currD) {
    stochSignal = 'BUY';
    stochConfidence = 85;
    stochDetails = `Bullish cross in oversold region (%K=${currK.toFixed(1)} crossed above %D=${currD.toFixed(1)})`;
  } else if (currK >= params.stochOverbought && prevK >= prevD && currK < currD) {
    stochSignal = 'SELL';
    stochConfidence = 85;
    stochDetails = `Bearish cross in overbought region (%K=${currK.toFixed(1)} crossed below %D=${currD.toFixed(1)})`;
  } else if (currK <= params.stochOversold) {
    stochSignal = 'BUY';
    stochConfidence = 50;
    stochDetails = `Stochastic oversold (%K=${currK.toFixed(1)} < ${params.stochOversold})`;
  } else if (currK >= params.stochOverbought) {
    stochSignal = 'SELL';
    stochConfidence = 50;
    stochDetails = `Stochastic overbought (%K=${currK.toFixed(1)} > ${params.stochOverbought})`;
  } else {
    stochSignal = 'HOLD';
    stochConfidence = 0;
  }
  signals.push({ id: 'stoch', name: 'Stochastic Oscillator', signal: stochSignal, confidence: stochConfidence, details: stochDetails, enabled: true });

  // 6. Price Action / Support-Resistance Strategy
  const pivots = calculatePivotLevels(candles, params.priceActionPeriod);
  const currentSupport = pivots.support[n - 1];
  const currentResistance = pivots.resistance[n - 1];

  let paSignal: SignalType = 'HOLD';
  let paConfidence = 0;
  let paDetails = `Support: ${currentSupport.toFixed(4)}, Resistance: ${currentResistance.toFixed(4)}`;

  const breakoutThreshold = 0.0005; // 0.05% margin

  if (latestClose > currentResistance * (1 + breakoutThreshold) && prevClose <= currentResistance) {
    paSignal = 'BUY';
    paConfidence = 85;
    paDetails = `Resistance breakout! Price (${latestClose.toFixed(4)}) closed above pivot resistance (${currentResistance.toFixed(4)})`;
  } else if (latestClose < currentSupport * (1 - breakoutThreshold) && prevClose >= currentSupport) {
    paSignal = 'SELL';
    paConfidence = 85;
    paDetails = `Support breakout! Price (${latestClose.toFixed(4)}) closed below pivot support (${currentSupport.toFixed(4)})`;
  } else {
    // Check for bounce
    const distToS = latestClose - currentSupport;
    const distToR = currentResistance - latestClose;
    const totalDist = currentResistance - currentSupport;

    if (distToS / totalDist < 0.05 && latestClose > prevClose) {
      paSignal = 'BUY';
      paConfidence = 70;
      paDetails = `Pivot Support Bounce: Price (${latestClose.toFixed(4)}) bouncing off support (${currentSupport.toFixed(4)})`;
    } else if (distToR / totalDist < 0.05 && latestClose < prevClose) {
      paSignal = 'SELL';
      paConfidence = 70;
      paDetails = `Pivot Resistance Rejection: Price (${latestClose.toFixed(4)}) dropping off resistance (${currentResistance.toFixed(4)})`;
    } else {
      paSignal = 'HOLD';
      paConfidence = 0;
      paDetails = `Price in middle of S/R channel. Close: ${latestClose.toFixed(4)}`;
    }
  }
  signals.push({ id: 'price_action', name: 'Price Action S/R Breakout', signal: paSignal, confidence: paConfidence, details: paDetails, enabled: true });

  // 7. Trend Strength Strategy (ADX filter)
  const adxRes = calculateADX(candles, params.adxPeriod);
  const currentADX = adxRes.adx[n - 1];
  const plusDI = adxRes.plusDI[n - 1];
  const minusDI = adxRes.minusDI[n - 1];

  let adxSignal: SignalType = 'HOLD';
  let adxConfidence = 0;
  let adxDetails = `ADX Trend Indicator: ADX is ${currentADX.toFixed(1)}`;

  if (currentADX >= params.adxThreshold) {
    if (plusDI > minusDI) {
      adxSignal = 'BUY';
      adxConfidence = Math.min(100, Math.round(50 + (currentADX - params.adxThreshold) * 2));
      adxDetails = `Strong Bullish Trend: ADX is ${currentADX.toFixed(1)} (> ${params.adxThreshold}) with +DI > -DI`;
    } else {
      adxSignal = 'SELL';
      adxConfidence = Math.min(100, Math.round(50 + (currentADX - params.adxThreshold) * 2));
      adxDetails = `Strong Bearish Trend: ADX is ${currentADX.toFixed(1)} (> ${params.adxThreshold}) with -DI > +DI`;
    }
  } else {
    adxSignal = 'HOLD';
    adxConfidence = 20; // suggests high osc viability
    adxDetails = `Weak/Choppy Market: ADX is ${currentADX.toFixed(1)} (< ${params.adxThreshold}). Ideal for Range Oscillators.`;
  }
  signals.push({ id: 'trend_strength', name: 'ADX Trend Strength', signal: adxSignal, confidence: adxConfidence, details: adxDetails, enabled: true });

  // 8. Confluence / Combined Meta-Strategy
  // Aggregates all other active strategies
  let buyWeight = 0;
  let sellWeight = 0;
  let activeCount = 0;

  for (const s of signals) {
    if (s.id === 'confluence') continue;
    if (!s.enabled) continue;

    if (s.signal === 'BUY') {
      buyWeight += s.confidence / 100;
    } else if (s.signal === 'SELL') {
      sellWeight += s.confidence / 100;
    }
    activeCount++;
  }

  let confluenceSignal: SignalType = 'HOLD';
  let confluenceConfidence = 0;
  let confluenceDetails = '';

  if (activeCount > 0) {
    const buyScore = buyWeight / activeCount;
    const sellScore = sellWeight / activeCount;

    if (buyScore > sellScore && buyScore > 0.3) {
      confluenceSignal = 'BUY';
      confluenceConfidence = Math.round(buyScore * 100);
      confluenceDetails = `Weighted Consensus: BUY Signal based on confluence of active models (${(buyScore * 100).toFixed(0)}% conviction)`;
    } else if (sellScore > buyScore && sellScore > 0.3) {
      confluenceSignal = 'SELL';
      confluenceConfidence = Math.round(sellScore * 100);
      confluenceDetails = `Weighted Consensus: SELL Signal based on confluence of active models (${(sellScore * 100).toFixed(0)}% conviction)`;
    } else {
      confluenceSignal = 'HOLD';
      confluenceConfidence = 0;
      confluenceDetails = 'No consensus. Signals are mixed or inconclusive.';
    }
  } else {
    confluenceSignal = 'HOLD';
    confluenceConfidence = 0;
    confluenceDetails = 'No active strategies selected';
  }

  signals.push({
    id: 'confluence',
    name: 'Confluence Aggregator',
    signal: confluenceSignal,
    confidence: confluenceConfidence,
    details: confluenceDetails,
    enabled: true,
  });

  return signals;
}

// BACKTEST ENGINE
export interface BacktestResults {
  winRate: number;
  totalSignals: number;
  wins: number;
  losses: number;
  payoutProfit: number;
  initialBalance: number;
  finalBalance: number;
  details: {
    time: number;
    close: number;
    signal: SignalType;
    result: 'WIN' | 'LOSS' | 'HOLD';
    profit: number;
  }[];
}

export function runBacktest(
  candles: Candle[],
  strategyId: string,
  params: StrategyParams,
  stake: number,
  contractType: 'Rise/Fall' | 'Rise' | 'Fall'
): BacktestResults {
  const initialBalance = 1000;
  let currentBalance = initialBalance;
  let wins = 0;
  let losses = 0;
  const details: BacktestResults['details'] = [];

  // Slide a window across the historical candles to generate signals and determine success
  // A simple backtest: at each candle i, compute strategies on slice 0..i.
  // If signal matches, look ahead 5 candles to determine if close price is higher (for CALL/Rise) or lower (for PUT/Fall)
  const lookAhead = 5; // e.g., 5-bar expiry contract

  for (let i = 40; i < candles.length - lookAhead; i++) {
    const historicalSlice = candles.slice(0, i + 1);
    const activeSignals = runAllStrategies(historicalSlice, params);
    const targetSignal = activeSignals.find((s) => s.id === strategyId);

    if (!targetSignal || targetSignal.signal === 'HOLD') continue;

    // Check if confidence is above a threshold for backtesting (e.g. 50%)
    if (targetSignal.confidence < 45) continue;

    const entryPrice = candles[i].close;
    const exitPrice = candles[i + lookAhead].close;
    const signal = targetSignal.signal;

    let isWin = false;
    // Determine win/loss based on Rise/Fall
    if (signal === 'BUY') {
      isWin = exitPrice > entryPrice;
    } else if (signal === 'SELL') {
      isWin = exitPrice < entryPrice;
    }

    const profitMultiplier = 0.95; // Assume 95% payout for standard Deriv options
    const profit = isWin ? stake * profitMultiplier : -stake;

    if (isWin) {
      wins++;
    } else {
      losses++;
    }

    currentBalance += profit;

    details.push({
      time: candles[i].time,
      close: entryPrice,
      signal,
      result: isWin ? 'WIN' : 'LOSS',
      profit,
    });
  }

  const totalSignals = wins + losses;
  const winRate = totalSignals > 0 ? (wins / totalSignals) * 100 : 0;

  return {
    winRate,
    totalSignals,
    wins,
    losses,
    payoutProfit: currentBalance - initialBalance,
    initialBalance,
    finalBalance: currentBalance,
    details,
  };
}
