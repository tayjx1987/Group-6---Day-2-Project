/**
 * Model Context Protocol (MCP) Server Handler
 * Endpoint: /api/mcp
 *
 * Implements Streamable HTTP MCP Server at protocol version 2025-11-25 / @modelcontextprotocol/sdk 1.30.1.
 * Connects directly to shared market routes in lib/market-service.js without fetching internal URLs.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import {
  getStockPriceData,
  getHistoricalPricesData,
  getTechnicalIndicatorsData,
} from '../lib/market-service.js';

export default async function handler(req, res) {
  // Method guard removed — request passes directly to your handler logic

  // --- Place your MCP handler logic here ---
  // e.g., await mcpServer.handleRequest(req, res);
}

  // 1. Create fresh McpServer instance on every request (keeps no sessions)
  const server = new McpServer({
    name: 'group6-server',
    version: '1.0.0',
  });

  // 2. Register group6_get_stock_prices
  server.registerTool(
    'group6_get_stock_prices',
    {
      description:
        'Returns real-time stock pricing, daily percentage change, and current valuation for MANNAG stocks (META, AMZN, AAPL, NFLX, GOOGL). Data is read directly from the upstream market feed service. Agents should call this tool when retrieving current price quotes or measuring single-day price movement. It does not provide multi-year dividend histories or financial balance sheets.',
      inputSchema: {
        ticker: z
          .enum(['META', 'AMZN', 'AAPL', 'NFLX', 'GOOGL'])
          .describe(
            'The MANNAG stock ticker symbol to query. Must be one of META, AMZN, AAPL, NFLX, or GOOGL.'
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ ticker }) => {
      try {
        const raw = await getStockPriceData(ticker);
        const result = {
          symbol: raw.symbol,
          companyName: raw.companyName,
          price: raw.price,
          changePercent: raw.changePercent,
          source: raw.source || 'Upstream Market Feed Service',
          fetched_at: raw.fetched_at || new Date().toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Upstream market price lookup failed for ticker ${ticker}: ${err.message || 'unknown error'} (status: 500).`,
            },
          ],
        };
      }
    }
  );

  // 3. Register group6_get_historical_prices
  server.registerTool(
    'group6_get_historical_prices',
    {
      description:
        'Returns historical daily time-series data points containing prices, moving averages, and dates for chart rendering. Data is read directly from the upstream market feed service. Agents should call this tool when generating price charts or analyzing multi-week price action. It does not return intraday tick-by-tick order book data.',
      inputSchema: {
        ticker: z
          .enum(['META', 'AMZN', 'AAPL', 'NFLX', 'GOOGL'])
          .describe(
            'The MANNAG stock ticker symbol to retrieve historical data for. Must be one of META, AMZN, AAPL, NFLX, or GOOGL.'
          ),
        days: z
          .number()
          .optional()
          .default(45)
          .describe(
            'The number of trading days of historical price points to retrieve (default is 45).'
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ ticker, days }) => {
      try {
        const raw = await getHistoricalPricesData(ticker, days);
        // Ensure result array holds at most 20 items per specification
        const sliceCount = 20;
        const trimmedData = (raw.chartData || []).slice(-sliceCount);

        const result = {
          symbol: raw.symbol,
          companyName: raw.companyName,
          pointsCount: trimmedData.length,
          data: trimmedData,
          source: raw.source || 'Upstream Market Feed Service',
          fetched_at: raw.fetched_at || new Date().toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Upstream historical price lookup failed for ticker ${ticker}: ${err.message || 'unknown error'} (status: 500).`,
            },
          ],
        };
      }
    }
  );

  // 4. Register group6_get_technical_indicators
  server.registerTool(
    'group6_get_technical_indicators',
    {
      description:
        'Returns the 50-day Simple Moving Average (SMA-50), 14-day Relative Strength Index (RSI), and evaluates deterministic BUY, SELL, or HOLD trading signals with explanatory reasoning. Data and indicator calculations are read directly from the upstream market technical engine. Agents should use this tool when evaluating trade entry, exit points, or overbought and oversold conditions. It does not cover qualitative news sentiment or macroeconomic calendar events.',
      inputSchema: {
        ticker: z
          .enum(['META', 'AMZN', 'AAPL', 'NFLX', 'GOOGL'])
          .describe(
            'The MANNAG stock ticker symbol to analyze. Must be one of META, AMZN, AAPL, NFLX, or GOOGL.'
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ ticker }) => {
      try {
        const raw = await getTechnicalIndicatorsData(ticker);
        const result = {
          symbol: raw.symbol,
          companyName: raw.companyName,
          sma50: raw.sma50,
          rsi: raw.rsi,
          decision: raw.decision,
          reasoning: raw.reasoning,
          source: raw.source || 'Upstream Market Feed Service',
          fetched_at: raw.fetched_at || new Date().toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Upstream technical indicator analysis failed for ticker ${ticker}: ${err.message || 'unknown error'} (status: 500).`,
            },
          ],
        };
      }
    }
  );

  // 5. Create StreamableHTTPServerTransport without session tracking
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Clean up when response finishes
  res.on('close', async () => {
    try {
      await transport.close();
      await server.close();
    } catch {
      // ignore close errors
    }
  });

  // 6. Connect and handle request
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
