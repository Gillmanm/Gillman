import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, IPriceLine } from 'lightweight-charts';
import { Candle, StrategyParams } from '../types';
import {
  calculateEMA,
  calculateBollingerBands,
  calculatePivotLevels,
  calculateRSI,
  calculateMACD,
  calculateStochastic,
} from '../utils/indicators';
import { Eye, EyeOff, Sliders, TrendingUp, RefreshCw } from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  params: StrategyParams;
}

export default function TradingChart({ candles, symbol, timeframe, params }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const oscChartRef = useRef<HTMLDivElement>(null);

  // Chart instances
  const mainChartApi = useRef<any>(null);
  const oscChartApi = useRef<any>(null);

  // Series instances
  const candleSeries = useRef<any>(null);
  const emaFastSeries = useRef<any>(null);
  const emaSlowSeries = useRef<any>(null);
  const bbUpperSeries = useRef<any>(null);
  const bbMiddleSeries = useRef<any>(null);
  const bbLowerSeries = useRef<any>(null);

  // Oscillator Series
  const oscLine1Series = useRef<any>(null);
  const oscLine2Series = useRef<any>(null);
  const oscHistogramSeries = useRef<any>(null);

  // Active S/R Price Lines references to remove old ones
  const activePriceLines = useRef<any[]>([]);

  // Toggles state
  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showSR, setShowSR] = useState(true);
  const [selectedOscillator, setSelectedOscillator] = useState<'RSI' | 'MACD' | 'STOCH'>('RSI');

  // Trigger resize when layout shifts
  const triggerResize = () => {
    if (mainChartApi.current && oscChartApi.current && containerRef.current) {
      const width = containerRef.current.clientWidth;
      mainChartApi.current.resize(width, 320);
      oscChartApi.current.resize(width, 140);
    }
  };

  useEffect(() => {
    if (!mainChartRef.current || !oscChartRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;

    // 1. CREATE MAIN CHART
    const mainChart: any = createChart(mainChartRef.current, {
      width: width,
      height: 320,
      layout: {
        background: { color: '#020617' }, // slate-950
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.15)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.15)' },
      },
      crosshair: {
        mode: 1, // magnet
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    mainChartApi.current = mainChart;

    const mainCandle = mainChart.addCandlestickSeries({
      upColor: '#10b981', // emerald-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeries.current = mainCandle;

    const emaFast = mainChart.addLineSeries({
      color: '#0ea5e9', // sky-500
      lineWidth: 1.5,
      title: 'EMA Fast',
      priceLineVisible: false,
    });
    emaFastSeries.current = emaFast;

    const emaSlow = mainChart.addLineSeries({
      color: '#e0f2fe', // sky-100
      lineWidth: 1.5,
      title: 'EMA Slow',
      priceLineVisible: false,
    });
    emaSlowSeries.current = emaSlow;

    const bbUpper = mainChart.addLineSeries({
      color: '#f59e0b', // amber-500
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'BB Upper',
      priceLineVisible: false,
    });
    bbUpperSeries.current = bbUpper;

    const bbMiddle = mainChart.addLineSeries({
      color: '#d97706', // amber-600
      lineWidth: 1,
      lineStyle: LineStyle.SparseDotted,
      title: 'BB Basis',
      priceLineVisible: false,
    });
    bbMiddleSeries.current = bbMiddle;

    const bbLower = mainChart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'BB Lower',
      priceLineVisible: false,
    });
    bbLowerSeries.current = bbLower;

    // 2. CREATE OSCILLATOR CHART
    const oscChart: any = createChart(oscChartRef.current, {
      width: width,
      height: 140,
      layout: {
        background: { color: '#020617' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.1)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.1)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
      },
    });
    oscChartApi.current = oscChart;

    const oscLine1 = oscChart.addLineSeries({
      color: '#ec4899', // pink-500 (RSI line, MACD line, Stoch %K)
      lineWidth: 1.5,
      priceLineVisible: false,
    });
    oscLine1Series.current = oscLine1;

    const oscLine2 = oscChart.addLineSeries({
      color: '#3b82f6', // blue-500 (MACD signal, Stoch %D)
      lineWidth: 1.5,
      priceLineVisible: false,
    });
    oscLine2Series.current = oscLine2;

    const oscHist = oscChart.addHistogramSeries({
      color: 'rgba(16, 185, 129, 0.5)',
      priceLineVisible: false,
    });
    oscHistogramSeries.current = oscHist;

    // 3. SYNCHRONIZE TIME SCALES
    let isSyncing = false;
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncing || !oscChart) return;
      isSyncing = true;
      oscChart.timeScale().setVisibleLogicalRange(range);
      isSyncing = false;
    });

    oscChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncing || !mainChart) return;
      isSyncing = true;
      mainChart.timeScale().setVisibleLogicalRange(range);
      isSyncing = false;
    });

    // Resize Observer for Fluid layout
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return;
      triggerResize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      mainChart.remove();
      oscChart.remove();
      mainChartApi.current = null;
      oscChartApi.current = null;
    };
  }, []);

  // Update chart data when candles or selections change
  useEffect(() => {
    if (!candleSeries.current || !mainChartApi.current || candles.length === 0) return;

    const formattedCandles = candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    // Update main candlesticks
    candleSeries.current.setData(formattedCandles);

    const closes = candles.map((c) => c.close);

    // 1. EMAs
    if (showEMA && emaFastSeries.current && emaSlowSeries.current) {
      const fastValues = calculateEMA(closes, params.maFast);
      const slowValues = calculateEMA(closes, params.maSlow);

      const fastData = candles.map((c, idx) => ({ time: c.time, value: fastValues[idx] }));
      const slowData = candles.map((c, idx) => ({ time: c.time, value: slowValues[idx] }));

      emaFastSeries.current.setData(fastData);
      emaSlowSeries.current.setData(slowData);
    } else {
      emaFastSeries.current?.setData([]);
      emaSlowSeries.current?.setData([]);
    }

    // 2. Bollinger Bands
    if (showBB && bbUpperSeries.current && bbMiddleSeries.current && bbLowerSeries.current) {
      const bb = calculateBollingerBands(closes, params.bbPeriod, params.bbStdDev);
      
      const upperData = candles.map((c, idx) => ({ time: c.time, value: bb.upper[idx] }));
      const middleData = candles.map((c, idx) => ({ time: c.time, value: bb.middle[idx] }));
      const lowerData = candles.map((c, idx) => ({ time: c.time, value: bb.lower[idx] }));

      bbUpperSeries.current.setData(upperData);
      bbMiddleSeries.current.setData(middleData);
      bbLowerSeries.current.setData(lowerData);
    } else {
      bbUpperSeries.current?.setData([]);
      bbMiddleSeries.current?.setData([]);
      bbLowerSeries.current?.setData([]);
    }

    // 3. Support & Resistance price lines
    // Clear old price lines
    activePriceLines.current.forEach((pl) => {
      try {
        candleSeries.current?.removePriceLine(pl);
      } catch (err) {
        // ignore
      }
    });
    activePriceLines.current = [];

    if (showSR) {
      const pivots = calculatePivotLevels(candles, params.priceActionPeriod);
      
      // Plot latest 2 support and latest 2 resistance pivots
      pivots.recentSupports.slice(-2).forEach((sVal) => {
        const pl = candleSeries.current?.createPriceLine({
          price: sVal,
          color: '#10b981', // green support
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Support`,
        });
        if (pl) activePriceLines.current.push(pl);
      });

      pivots.recentResistances.slice(-2).forEach((rVal) => {
        const pl = candleSeries.current?.createPriceLine({
          price: rVal,
          color: '#f43f5e', // red resistance
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Resistance`,
        });
        if (pl) activePriceLines.current.push(pl);
      });
    }

    // Auto fit main chart content
    mainChartApi.current.timeScale().fitContent();
  }, [candles, showEMA, showBB, showSR, params]);

  // Update Oscillator Series based on tab selection
  useEffect(() => {
    if (!oscChartApi.current || !oscLine1Series.current || !oscLine2Series.current || !oscHistogramSeries.current || candles.length === 0) return;

    const closes = candles.map((c) => c.close);

    if (selectedOscillator === 'RSI') {
      const rsiVals = calculateRSI(closes, params.rsiPeriod);
      const rsiData = candles.map((c, idx) => ({ time: c.time, value: rsiVals[idx] }));

      oscLine1Series.current.setData(rsiData);
      oscLine1Series.current.applyOptions({ color: '#f472b6', title: 'RSI' });

      // Hide MACD/Stoch lines
      oscLine2Series.current.setData([]);
      oscLine2Series.current.applyOptions({ title: '' });
      oscHistogramSeries.current.setData([]);

      // Update right price scale to 0 - 100
      oscChartApi.current.priceScale('right').applyOptions({
        autoScale: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      });
    } else if (selectedOscillator === 'STOCH') {
      const stoch = calculateStochastic(candles, params.stochK, params.stochD, params.stochSlowing);
      
      const kData = candles.map((c, idx) => ({ time: c.time, value: stoch.kLine[idx] }));
      const dData = candles.map((c, idx) => ({ time: c.time, value: stoch.dLine[idx] }));

      oscLine1Series.current.setData(kData);
      oscLine1Series.current.applyOptions({ color: '#f97316', title: '%K' });

      oscLine2Series.current.setData(dData);
      oscLine2Series.current.applyOptions({ color: '#3b82f6', title: '%D' });

      oscHistogramSeries.current.setData([]);

      oscChartApi.current.priceScale('right').applyOptions({
        autoScale: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      });
    } else if (selectedOscillator === 'MACD') {
      const macd = calculateMACD(closes, params.macdFast, params.macdSlow, params.macdSignal);
      
      const macdLineData = candles.map((c, idx) => ({ time: c.time, value: macd.macdLine[idx] }));
      const signalLineData = candles.map((c, idx) => ({ time: c.time, value: macd.signalLine[idx] }));
      const histData = candles.map((c, idx) => ({
        time: c.time,
        value: macd.histogram[idx],
        color: macd.histogram[idx] >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
      }));

      oscLine1Series.current.setData(macdLineData);
      oscLine1Series.current.applyOptions({ color: '#a855f7', title: 'MACD' });

      oscLine2Series.current.setData(signalLineData);
      oscLine2Series.current.applyOptions({ color: '#38bdf8', title: 'Signal' });

      oscHistogramSeries.current.setData(histData);

      // Auto scale price axis for MACD values
      oscChartApi.current.priceScale('right').applyOptions({
        autoScale: true,
      });
    }
  }, [candles, selectedOscillator, params]);

  return (
    <div ref={containerRef} className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden p-4 flex flex-col h-full space-y-4">
      {/* Chart Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-rose-500 animate-pulse" />
          <div>
            <span className="text-sm font-bold text-slate-100 tracking-tight font-mono">{symbol}</span>
            <span className="ml-2 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-400 font-mono font-medium">
              {timeframe}
            </span>
          </div>
        </div>

        {/* Toggles & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Chart Overlays Toggles */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-400">
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                showEMA ? 'bg-slate-850 text-slate-100 font-medium border border-slate-800 shadow-sm' : 'hover:text-slate-200'
              }`}
              title="Toggle Exponential Moving Averages"
            >
              {showEMA ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              EMA
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`px-2 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                showBB ? 'bg-slate-850 text-slate-100 font-medium border border-slate-800 shadow-sm' : 'hover:text-slate-200'
              }`}
              title="Toggle Bollinger Bands"
            >
              {showBB ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              BB
            </button>
            <button
              onClick={() => setShowSR(!showSR)}
              className={`px-2 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                showSR ? 'bg-slate-850 text-slate-100 font-medium border border-slate-800 shadow-sm' : 'hover:text-slate-200'
              }`}
              title="Toggle Support / Resistance levels"
            >
              {showSR ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              S/R Pivot
            </button>
          </div>

          {/* Oscillator Tab Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-400">
            {(['RSI', 'MACD', 'STOCH'] as const).map((osc) => (
              <button
                key={osc}
                onClick={() => setSelectedOscillator(osc)}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  selectedOscillator === osc
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'hover:text-slate-200'
                }`}
              >
                {osc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Candlestick Chart Window */}
      <div className="relative flex-1 min-h-[280px]">
        {candles.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 rounded-xl space-y-3">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium font-mono">Streaming Live Deriv Market Candle Data...</p>
          </div>
        ) : null}
        <div ref={mainChartRef} className="w-full h-full rounded-xl" />
      </div>

      {/* Sync Oscillator Window */}
      <div className="border-t border-slate-900 pt-3 relative">
        <div ref={oscChartRef} className="w-full rounded-xl" />
        <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-400 font-mono font-bold tracking-wider">
          {selectedOscillator}
        </div>
      </div>
    </div>
  );
}
