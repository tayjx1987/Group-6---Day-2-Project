/**
 * Type definitions for MANNAG Stock Tracker & MCP Decision Engine
 */

export type MannagTicker = 'META' | 'AMZN' | 'AAPL' | 'NFLX' | 'GOOGL';

export type DecisionType = 'BUY' | 'SELL' | 'HOLD';

export interface ChartPoint {
  timestamp: string;
  price: number;
  sma50: number;
  rsi: number;
}

export interface StockPayload {
  symbol: MannagTicker;
  companyName: string;
  price: number;
  changePercent: number;
  decision: DecisionType;
  reasoning: string;
  chartData: ChartPoint[];
  meta?: {
    mcpStatus?: string;
    generatedAt?: string;
  };
}

export interface McpHealthInfo {
  status: 'healthy' | 'connected' | 'degraded' | 'unreachable';
  mode: 'embedded_mcp_engine' | 'remote_mcp_server';
  mcpServerConfigured: boolean;
  mcpServerUrl: string | null;
  authTokenConfigured: boolean;
  toolsListSuccess: boolean;
  statusCode: number;
  toolsAvailable: string[];
  message: string;
  timestamp: string;
}
