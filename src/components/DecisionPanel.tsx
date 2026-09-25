import React from 'react';
import { TrendingUp, TrendingDown, Cpu, Activity, ShieldCheck } from 'lucide-react';
import { StockPayload } from '../types';

interface DecisionPanelProps {
  stock: StockPayload;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({ stock }) => {
  const isPositive = stock.changePercent >= 0;
  const latestPoint = stock.chartData?.[stock.chartData.length - 1];
  const sma50 = latestPoint ? latestPoint.sma50 : stock.price;
  const rsi = latestPoint ? latestPoint.rsi : 50;

  // Prominent Decision Badge with soft background and dark text
  const renderDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'BUY':
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-bold tracking-wide bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm shadow-emerald-500/10 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            BUY SIGNAL
          </div>
        );
      case 'SELL':
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-bold tracking-wide bg-rose-100 text-rose-900 border border-rose-300 shadow-sm shadow-rose-500/10 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            SELL SIGNAL
          </div>
        );
      case 'HOLD':
      default:
        return (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-bold tracking-wide bg-amber-100 text-amber-900 border border-amber-300 shadow-sm shadow-amber-500/10 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
            HOLD SIGNAL
          </div>
        );
    }
  };

  const getRsiStateLabel = (val: number) => {
    if (val < 30) return { label: 'Oversold (< 30)', color: 'text-emerald-400' };
    if (val > 70) return { label: 'Overbought (> 70)', color: 'text-rose-400' };
    return { label: 'Neutral Band (30-70)', color: 'text-slate-400' };
  };

  const rsiInfo = getRsiStateLabel(rsi);
  const priceVsSma = ((stock.price - sma50) / sma50) * 100;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Decorative gradient blur */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {stock.symbol}
            </h2>
            <span className="text-sm font-medium text-slate-400 px-2.5 py-0.5 rounded-md bg-slate-800">
              NASDAQ
            </span>
            <span className="hidden sm:inline-block text-slate-400 text-sm">
              • {stock.companyName}
            </span>
          </div>
          <p className="text-sm text-slate-400 sm:hidden mt-0.5">
            {stock.companyName}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-extrabold text-white">
              ${stock.price.toFixed(2)}
            </div>
            <div
              className={`flex items-center justify-end gap-1 text-sm font-semibold mt-0.5 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {isPositive ? '+' : ''}
                {stock.changePercent.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-500 ml-1">Today</span>
            </div>
          </div>

          <div>{renderDecisionBadge(stock.decision)}</div>
        </div>
      </div>

      {/* 1-sentence reasoning provided by MCP */}
      <div className="mt-5 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>MCP Decision Rule Engine Reasoning</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Deterministic Output
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-200 font-medium mt-1 leading-relaxed">
            "{stock.reasoning}"
          </p>
        </div>
      </div>

      {/* Technical metrics summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-xs text-slate-400">50-Day SMA</div>
          <div className="text-base font-bold text-slate-100 mt-0.5">
            ${sma50.toFixed(2)}
          </div>
          <div
            className={`text-[11px] mt-0.5 ${
              priceVsSma >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {priceVsSma >= 0 ? '+' : ''}
            {priceVsSma.toFixed(2)}% vs price
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-xs text-slate-400">14-Day RSI</div>
          <div className="text-base font-bold text-slate-100 mt-0.5">
            {rsi.toFixed(1)}
          </div>
          <div className={`text-[11px] mt-0.5 font-medium ${rsiInfo.color}`}>
            {rsiInfo.label}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-xs text-slate-400">Trend Alignment</div>
          <div className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>{stock.price >= sma50 ? 'Above SMA-50' : 'Below SMA-50'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {stock.price >= sma50 ? 'Bullish bias' : 'Correction bias'}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-xs text-slate-400">Execution Protocol</div>
          <div className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>JSON-RPC 2.0</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            MCP Tool: callTool
          </div>
        </div>
      </div>
    </div>
  );
};
