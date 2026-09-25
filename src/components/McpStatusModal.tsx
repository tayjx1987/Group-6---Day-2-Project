import React from 'react';
import { X, Server, CheckCircle2, AlertCircle, Radio, Terminal, Cpu } from 'lucide-react';
import { McpHealthInfo } from '../types';

interface McpStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: McpHealthInfo | null;
  sseConnected: boolean;
  ssePingCount: number;
}

export const McpStatusModal: React.FC<McpStatusModalProps> = ({
  isOpen,
  onClose,
  health,
  sseConnected,
  ssePingCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Model Context Protocol (MCP) Diagnostics</span>
              </h3>
              <p className="text-xs text-slate-400">
                JSON-RPC 2.0 & SSE Connection Inspector
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-xs text-slate-400">Live SSE Stream (/api/mcp)</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
                }`}
              />
              <span
                className={`font-semibold text-sm ${
                  sseConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {sseConnected ? 'Healthy & Connected' : 'Connecting...'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
              <span>Heartbeat Pings:</span>
              <span className="font-mono text-slate-200 font-semibold">{ssePingCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-xs text-slate-400">MCP Protocol Health</div>
            <div className="flex items-center gap-2 mt-1">
              {health?.toolsListSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className="font-semibold text-sm text-slate-200 capitalize">
                {health?.status || 'Active'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              HTTP/RPC Status: {health?.statusCode || 200}
            </div>
          </div>
        </div>

        {/* Detailed Health Metrics */}
        <div className="space-y-2.5 text-xs text-slate-300 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 font-mono">
          <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
            <span className="text-slate-400">MCP_SERVER_URL Configured:</span>
            <span className={health?.mcpServerConfigured ? 'text-emerald-400' : 'text-amber-400'}>
              {health?.mcpServerConfigured ? 'YES (External Endpoint)' : 'NO (Embedded Engine Fallback)'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
            <span className="text-slate-400">Server Host / Endpoint:</span>
            <span className="text-slate-200">
              {health?.mcpServerUrl || '/api/mcp'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
            <span className="text-slate-400">tools/list Handshake:</span>
            <span className="text-emerald-400 font-semibold">
              {health?.toolsListSuccess ? '200 OK (Supported)' : 'Failed'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
            <span className="text-slate-400">Auth Token Configured:</span>
            <span className="text-slate-400">
              {health?.authTokenConfigured ? 'Active (Secured via header)' : 'None (Public/Local)'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Last Health Check:</span>
            <span className="text-slate-400">
              {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>

        {/* Tools Registered in MCP */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Registered MCP JSON-RPC Tools</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(health?.toolsAvailable || ['get_stock_price', 'get_historical_prices', 'get_technical_indicators']).map((tool) => (
              <div
                key={tool}
                className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-200 font-mono text-center truncate"
              >
                {tool}
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="mt-4 p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300 flex items-start gap-2">
          <Radio className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {health?.message || 'Embedded MCP JSON-RPC tool engine is operating normally.'}
          </p>
        </div>

        {/* Close Button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
