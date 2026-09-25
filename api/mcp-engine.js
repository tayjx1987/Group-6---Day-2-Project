/**
 * Shared MCP Engine & MANNAG Stock Decision Engine
 * Model Context Protocol (MCP) JSON-RPC client, tool definitions, and technical indicator engine.
 */

export const MANNAG_STOCKS = {
  META: {
    symbol: 'META',
    companyName: 'Meta Platforms, Inc.',
    basePrice: 588.5,
    volatility: 0.022,
    trend: 0.0018,
    sector: 'Social Media & AI',
  },
  AMZN: {
    symbol: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    basePrice: 194.2,
    volatility: 0.019,
    trend: 0.0012,
    sector: 'E-Commerce & Cloud Computing',
  },
  AAPL: {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    basePrice: 236.8,
    volatility: 0.015,
    trend: 0.0009,
    sector: 'Consumer Electronics & Services',
  },
  NFLX: {
    symbol: 'NFLX',
    companyName: 'Netflix, Inc.',
    basePrice: 715.6,
    volatility: 0.025,
    trend: 0.0015,
    sector: 'Entertainment & Streaming',
  },
  GOOGL: {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    basePrice: 184.3,
    volatility: 0.018,
    trend: 0.0011,
    sector: 'Search & Cloud Infrastructure',
  },
};

export const VALID_TICKERS = Object.keys(MANNAG_STOCKS);

/**
 * Generates deterministic pseudo-random sequence for reproducible historical data
 */
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Calculates SMA and RSI for a price series
 */
export function calculateTechnicalIndicators(prices, smaPeriod = 50, rsiPeriod = 14) {
  const result = [];
  const n = prices.length;

  for (let i = 0; i < n; i++) {
    // SMA calculation
    const windowStart = Math.max(0, i - smaPeriod + 1);
    const window = prices.slice(windowStart, i + 1);
    const sma = window.reduce((acc, val) => acc + val, 0) / window.length;

    // RSI calculation
    let rsi = 50; // default baseline
    if (i >= 1) {
      const rsiStart = Math.max(1, i - rsiPeriod + 1);
      let gains = 0;
      let losses = 0;
      for (let j = rsiStart; j <= i; j++) {
        const diff = prices[j] - prices[j - 1];
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const count = i - rsiStart + 1;
      const avgGain = count > 0 ? gains / count : 0;
      const avgLoss = count > 0 ? losses / count : 0;
      if (avgLoss === 0) {
        rsi = avgGain > 0 ? 100 : 50;
      } else {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }
    }

    result.push({
      price: Number(prices[i].toFixed(2)),
      sma50: Number(sma.toFixed(2)),
      rsi: Number(Math.max(10, Math.min(90, rsi)).toFixed(2)),
    });
  }

  return result;
}

/**
 * Computes deterministic BUY / SELL / HOLD signal & reasoning
 */
export function computeDecision(price, sma50, rsi) {
  // Deterministic rule engine based on RSI & SMA-50 crossovers
  if (rsi < 36 && price >= sma50 * 0.985) {
    return {
      decision: 'BUY',
      reasoning: `Oversold RSI at ${rsi.toFixed(1)} holding firm above 50-day SMA ($${sma50.toFixed(2)}) signals strong accumulation opportunity.`,
    };
  }

  if (rsi > 68 || (rsi > 62 && price < sma50)) {
    return {
      decision: 'SELL',
      reasoning: `Overbought RSI at ${rsi.toFixed(1)} with negative divergence against the 50-day SMA ($${sma50.toFixed(2)}) indicates correction pressure.`,
    };
  }

  if (price > sma50 * 1.012 && rsi >= 48 && rsi <= 66) {
    return {
      decision: 'BUY',
      reasoning: `Bullish momentum intact with price trading above the 50-day SMA ($${sma50.toFixed(2)}) and healthy RSI at ${rsi.toFixed(1)}.`,
    };
  }

  if (price < sma50 * 0.982 && rsi < 48) {
    return {
      decision: 'SELL',
      reasoning: `Bearish trend established below the 50-day SMA ($${sma50.toFixed(2)}) with downward RSI momentum at ${rsi.toFixed(1)}.`,
    };
  }

  return {
    decision: 'HOLD',
    reasoning: `Market in equilibrium as price consolidates near the 50-day SMA ($${sma50.toFixed(2)}) with neutral RSI at ${rsi.toFixed(1)}.`,
  };
}

/**
 * Generates 45-60 data points of recent trading history for MANNAG ticker
 */
export function generateStockMarketData(ticker) {
  const stock = MANNAG_STOCKS[ticker] || MANNAG_STOCKS.AAPL;
  // Seed based on ticker characters to guarantee consistency + slight time drift
  let seed = 0;
  for (let c of stock.symbol) seed += c.charCodeAt(0);
  const now = new Date();
  // Quantize to 30-second block to simulate live ticking
  const timeBlock = Math.floor(now.getTime() / 30000);
  seed += timeBlock * 7;

  const rand = seededRandom(seed);
  const days = 45;
  const rawPrices = [];
  const dates = [];

  let currentP = stock.basePrice * (0.92 + rand() * 0.08);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // skip weekends for realistic date sequence
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      d.setDate(d.getDate() - (dayOfWeek === 0 ? 2 : 1));
    }
    const isoDate = d.toISOString().split('T')[0];
    dates.push(isoDate);

    const delta = (rand() - 0.485) * stock.volatility * currentP + stock.trend * currentP;
    currentP = Math.max(10, currentP + delta);
    rawPrices.push(currentP);
  }

  const indicators = calculateTechnicalIndicators(rawPrices, 50, 14);

  const chartData = indicators.map((ind, idx) => ({
    timestamp: dates[idx],
    price: ind.price,
    sma50: ind.sma50,
    rsi: ind.rsi,
  }));

  const latest = chartData[chartData.length - 1];
  const previous = chartData[chartData.length - 2] || chartData[0];
  const price = latest.price;
  const changePercent = Number((((price - previous.price) / previous.price) * 100).toFixed(2));

  const { decision, reasoning } = computeDecision(price, latest.sma50, latest.rsi);

  return {
    symbol: stock.symbol,
    companyName: stock.companyName,
    price,
    changePercent,
    decision,
    reasoning,
    chartData,
    latestIndicators: {
      sma50: latest.sma50,
      rsi: latest.rsi,
    },
    meta: {
      sector: stock.sector,
      updatedAt: now.toISOString(),
      dataSource: 'MCP (Model Context Protocol)',
    }
  };
}

/**
 * Standard MCP Tools Definition for MANNAG Stock Server
 */
export const MCP_TOOLS = [
  {
    name: 'get_stock_price',
    description: 'Fetches real-time price and daily change for a MANNAG stock ticker (META, AMZN, AAPL, NFLX, GOOGL).',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'One of the five MANNAG tickers: META, AMZN, AAPL, NFLX, GOOGL',
          enum: ['META', 'AMZN', 'AAPL', 'NFLX', 'GOOGL'],
        },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'get_historical_prices',
    description: 'Retrieves historical daily stock prices for charting (at least 30 points).',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', enum: ['META', 'AMZN', 'AAPL', 'NFLX', 'GOOGL'] },
        days: { type: 'number', description: 'Number of trading days (default 45)' },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'get_technical_indicators',
    description: 'Calculates 50-day Simple Moving Average (SMA50), RSI, and returns BUY/SELL/HOLD decision.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', enum: ['META', 'AMZN', 'AAPL', 'NFLX, GOOGL'] },
      },
      required: ['ticker'],
    },
  },
];

/**
 * Executes an MCP tool locally or validates arguments
 */
export function executeLocalMcpTool(toolName, args = {}) {
  const ticker = (args.ticker || 'AAPL').toUpperCase();
  if (!VALID_TICKERS.includes(ticker)) {
    throw new Error(`Only MANNAG stocks (${VALID_TICKERS.join(', ')}) are supported.`);
  }

  const stockData = generateStockMarketData(ticker);

  switch (toolName) {
    case 'get_stock_price':
      return {
        symbol: stockData.symbol,
        companyName: stockData.companyName,
        price: stockData.price,
        changePercent: stockData.changePercent,
      };
    case 'get_historical_prices':
      return {
        symbol: stockData.symbol,
        chartData: stockData.chartData,
      };
    case 'get_technical_indicators':
      return {
        symbol: stockData.symbol,
        sma50: stockData.latestIndicators.sma50,
        rsi: stockData.latestIndicators.rsi,
        decision: stockData.decision,
        reasoning: stockData.reasoning,
      };
    default:
      return stockData;
  }
}

/**
 * Connects to remote MCP server if configured, or falls back to local MCP engine
 */
export async function fetchStockViaMcp(ticker) {
  const mcpServerUrl = process.env.MCP_SERVER_URL?.trim();
  const mcpAuthToken = process.env.MCP_AUTH_TOKEN?.trim();

  // If MCP_SERVER_URL is not set or empty, fallback gracefully to mock MCP engine
  if (!mcpServerUrl) {
    return generateStockMarketData(ticker);
  }

  // If MCP_SERVER_URL is configured, call tool via JSON-RPC 2.0
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (mcpAuthToken) {
      headers['Authorization'] = `Bearer ${mcpAuthToken}`;
    }

    const jsonRpcBody = {
      jsonrpc: '2.0',
      id: `mcp-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: 'get_stock_price',
        arguments: { ticker },
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(jsonRpcBody),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[MCP] Remote server returned HTTP ${response.status}. Falling back to MCP engine.`);
      return generateStockMarketData(ticker);
    }

    const data = await response.json();
    if (data.error) {
      console.warn(`[MCP] Remote server JSON-RPC error:`, data.error);
      return generateStockMarketData(ticker);
    }

    // If remote returned standard MCP result content
    const result = data.result?.content?.[0]?.text ? JSON.parse(data.result.content[0].text) : data.result;
    if (result && result.price && result.chartData) {
      return result;
    }

    return generateStockMarketData(ticker);
  } catch (err) {
    console.warn(`[MCP] Failed to connect to ${mcpServerUrl}: ${err.message}. Using fallback MCP engine.`);
    return generateStockMarketData(ticker);
  }
}
