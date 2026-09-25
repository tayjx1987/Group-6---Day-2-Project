/**
 * MANNAG Stock Decision & Chart Dashboard
 * Powered via Model Context Protocol (MCP) JSON-RPC standard.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
  Code2,
  Terminal,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { MannagTicker, StockPayload, McpHealthInfo } from './types';
import { Navbar } from './components/Navbar';
import { StockCard } from './components/StockCard';
import { DecisionPanel } from './components/DecisionPanel';
import { StockChart } from './components/StockChart';
import { McpStatusModal } from './components/McpStatusModal';

const ALL_TICKERS: MannagTicker[] = ['META', 'AMZN', 'AAPL', 'NFLX', 'GOOGL'];

export default function App() {
  const [selectedTicker, setSelectedTicker] = useState<MannagTicker>('AAPL');
  const [stocksMap, setStocksMap] = useState<Record<MannagTicker, StockPayload | null>>({
    META: null,
    AMZN: null,
    AAPL: null,
    NFLX: null,
    GOOGL: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(30);
  const [healthInfo, setHealthInfo] = useState<McpHealthInfo | null>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // SSE connection state
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [ssePingCount, setSsePingCount] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch individual stock through server backend
  const fetchSingleStock = async (ticker: MannagTicker): Promise<StockPayload | null> => {
    try {
      const res = await fetch(`/api/stock?ticker=${ticker}`);
      if (!res.ok) {
        console.error(`Failed to fetch stock for ${ticker}: HTTP ${res.status}`);
        return null;
      }
      const data: StockPayload = await res.json();
      return data;
    } catch (err) {
      console.error(`Error loading ${ticker}:`, err);
      return null;
    }
  };

  // Fetch all 5 MANNAG stocks
  const fetchAllStocks = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const promises = ALL_TICKERS.map((t) => fetchSingleStock(t));
      const results = await Promise.all(promises);

      const nextMap: Record<MannagTicker, StockPayload | null> = { ...stocksMap };
      results.forEach((stk, idx) => {
        if (stk) {
          nextMap[ALL_TICKERS[idx]] = stk;
        }
      });
      setStocksMap(nextMap);

      // Check MCP health status as well
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealthInfo(hData);
      }
    } catch (err) {
      console.error('Error refreshing MANNAG stocks:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setSecondsUntilRefresh(30);
    }
  }, []);

  // Connect to SSE stream at /api/mcp
  useEffect(() => {
    try {
      const es = new EventSource('/api/mcp');
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.addEventListener('endpoint', (evt) => {
        setSseConnected(true);
      });

      es.addEventListener('ping', () => {
        setSseConnected(true);
        setSsePingCount((prev) => prev + 1);
      });

      es.onerror = () => {
        setSseConnected(false);
      };

      return () => {
        es.close();
      };
    } catch (e) {
      console.warn('SSE not supported or connection error:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllStocks();
  }, [fetchAllStocks]);

  // 30-Second Auto-refresh countdown & trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchAllStocks();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchAllStocks]);

  const activeStock = stocksMap[selectedTicker];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Navigation & Header */}
      <Navbar
        selectedTicker={selectedTicker}
        onSelectTicker={(ticker) => setSelectedTicker(ticker)}
        onRefresh={fetchAllStocks}
        isRefreshing={isRefreshing}
        secondsUntilRefresh={secondsUntilRefresh}
        sseConnected={sseConnected}
        onOpenMcpModal={() => setIsHealthModalOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Hero / Context Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  MANNAG Asset Decision Desk
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  Live MCP Feed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tracking Meta (META), Amazon (AMZN), Apple (AAPL), Netflix (NFLX), and Google (GOOGL) with deterministic rule evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>MCP JSON-RPC Tools</span>
            </button>

            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                showRawJson
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showRawJson ? 'Hide RPC Payload' : 'Inspect Payload'}</span>
            </button>
          </div>
        </div>

        {/* OVERVIEW GRID: All 5 MANNAG stocks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                MANNAG Overview Grid (Select to Inspect)
              </h3>
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Auto-refreshes in {secondsUntilRefresh}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ALL_TICKERS.map((ticker) => {
              const stock = stocksMap[ticker];
              if (!stock) {
                return (
                  <div
                    key={ticker}
                    className="h-32 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse p-4 flex flex-col justify-between"
                  >
                    <div className="h-4 bg-slate-800 rounded w-16" />
                    <div className="h-6 bg-slate-800 rounded w-24" />
                    <div className="h-3 bg-slate-800 rounded w-20" />
                  </div>
                );
              }
              return (
                <StockCard
                  key={ticker}
                  stock={stock}
                  isSelected={selectedTicker === ticker}
                  onSelect={(t) => setSelectedTicker(t)}
                />
              );
            })}
          </div>
        </section>

        {/* DETAILED VIEW: Selected MANNAG Stock */}
        {activeStock ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Decision & Technical Summary Panel */}
            <DecisionPanel stock={activeStock} />

            {/* Interactive Chart Section */}
            <StockChart
              data={activeStock.chartData}
              symbol={activeStock.symbol}
              currentPrice={activeStock.price}
            />

            {/* Optional Raw JSON-RPC Response Inspector */}
            {showRawJson && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-hidden">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Raw JSON-RPC /api/stock Payload ({activeStock.symbol})</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Endpoint: /api/stock?ticker={activeStock.symbol}
                  </span>
                </div>
                <pre className="p-3 bg-slate-950 rounded-lg text-emerald-400/90 overflow-x-auto max-h-60 scrollbar-thin">
                  {JSON.stringify(activeStock, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              Loading MANNAG stock technical data via MCP...
            </p>
          </div>
        )}
      </main>

      {/* FOOTER with Required Educational Disclaimer & Working Links */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Stock decision algorithms and chart data are for educational/informational purposes only and do not constitute financial advice. MANNAG data powered via{' '}
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-0.5"
              >
                <span>Model Context Protocol (MCP)</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
              . This is a course project and not an endorsed trading platform.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>MANNAG: META • AMZN • AAPL • NFLX • GOOGL</span>
            <span>•</span>
            <button
              onClick={() => setIsHealthModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 underline"
            >
              MCP Diagnostics
            </button>
          </div>
        </div>
      </footer>

      {/* Diagnostics Modal */}
      <McpStatusModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        health={healthInfo}
        sseConnected={sseConnected}
        ssePingCount={ssePingCount}
      />
    </div>
  );
}
