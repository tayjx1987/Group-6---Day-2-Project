import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { StockPayload, MannagTicker } from '../types';

interface StockCardProps {
  stock: StockPayload;
  isSelected: boolean;
  onSelect: (ticker: MannagTicker) => void;
}

export const StockCard: React.FC<StockCardProps> = ({ stock, isSelected, onSelect }) => {
  const isPositive = stock.changePercent >= 0;

  // Mini sparkline generation
  const prices = stock.chartData?.map((p) => p.price) || [];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 1;
  const range = maxPrice - minPrice || 1;

  const width = 120;
  const height = 36;
  const points = prices
    .slice(-18)
    .map((p, idx, arr) => {
      const x = (idx / (arr.length - 1 || 1)) * width;
      const y = height - ((p - minPrice) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Soft background & dark text for decision badge
  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'BUY':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            BUY
          </span>
        );
      case 'SELL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            SELL
          </span>
        );
      case 'HOLD':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            HOLD
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className={`group relative cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
        isSelected
          ? 'bg-slate-900/90 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
              {stock.symbol}
            </span>
            {getDecisionBadge(stock.decision)}
          </div>
          <p className="text-xs text-slate-400 truncate max-w-[140px] mt-0.5" title={stock.companyName}>
            {stock.companyName}
          </p>
        </div>

        {/* Mini Sparkline */}
        <div className="w-[100px] h-[36px] flex items-center justify-end">
          {prices.length > 1 ? (
            <svg width={width} height={height} className="overflow-visible w-full h-full">
              <polyline
                fill="none"
                stroke={isPositive ? '#10b981' : '#f43f5e'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          ) : (
            <div className="h-0.5 w-16 bg-slate-800 rounded" />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-800/80">
        <div>
          <span className="text-xl font-semibold text-slate-100">
            ${stock.price.toFixed(2)}
          </span>
        </div>

        <div
          className={`flex items-center gap-1 text-xs font-semibold ${
            isPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>
            {isPositive ? '+' : ''}
            {stock.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end text-[11px] text-slate-400 group-hover:text-blue-400 transition-colors">
        <span>Inspect chart</span>
        <ArrowRight className="w-3 h-3 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
};
