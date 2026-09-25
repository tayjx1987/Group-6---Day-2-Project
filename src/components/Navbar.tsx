import React from 'react';
import { RefreshCw, Radio, Server, Activity } from 'lucide-react';
import { MannagTicker } from '../types';

interface NavbarProps {
  selectedTicker: MannagTicker;
  onSelectTicker: (ticker: MannagTicker) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  secondsUntilRefresh: number;
  sseConnected: boolean;
  onOpenMcpModal: () => void;
}

const MANNAG_LIST: { ticker: MannagTicker; label: string; logo: string }[] = [
  { ticker: 'META', label: 'Meta', logo: 'M' },
  { ticker: 'AMZN', label: 'Amazon', logo: 'A' },
  { ticker: 'AAPL', label: 'Apple', logo: '🍎' },
  { ticker: 'NFLX', label: 'Netflix', logo: 'N' },
  { ticker: 'GOOGL', label: 'Google', logo: 'G' },
];

export const Navbar: React.FC<NavbarProps> = ({
  selectedTicker,
  onSelectTicker,
  onRefresh,
  isRefreshing,
  secondsUntilRefresh,
  sseConnected,
  onOpenMcpModal,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-3">
          {/* Logo & Platform Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                M
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    MANNAG Stock Tracker
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    MCP Powered
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Model Context Protocol Decision & Chart Engine
                </p>
              </div>
            </div>

            {/* Mobile MCP pill */}
            <button
              onClick={onOpenMcpModal}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>MCP</span>
            </button>
          </div>

          {/* Quick-Select Pills exclusively for MANNAG stocks */}
          <div className="flex items-center overflow-x-auto py-1 sm:py-0 scrollbar-none gap-1.5 sm:gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80">
            {MANNAG_LIST.map(({ ticker, label }) => {
              const active = selectedTicker === ticker;
              return (
                <button
                  key={ticker}
                  onClick={() => onSelectTicker(ticker)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <span>{ticker}</span>
                  <span
                    className={`text-[10px] font-normal ${
                      active ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Controls: MCP Health Button & Auto-refresh */}
          <div className="hidden md:flex items-center gap-3">
            {/* MCP Diagnostic Button */}
            <button
              onClick={onOpenMcpModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors"
              title="Inspect Model Context Protocol connection"
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>MCP Status:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {sseConnected ? 'SSE Active' : 'Connecting'}
              </span>
            </button>

            {/* Auto-refresh timer button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors disabled:opacity-60"
              title="Auto-refreshes every 30 seconds. Click to refresh immediately."
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-400 ${
                  isRefreshing ? 'animate-spin text-blue-400' : ''
                }`}
              />
              <span>
                {isRefreshing ? 'Refreshing...' : `${secondsUntilRefresh}s`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
