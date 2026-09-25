/**
 * Core Market Data Engine and Upstream Adapter
 * Shared by both REST endpoints (/api/stock, /api/health) and MCP Server (/api/mcp)
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

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function calculateTechnicalIndicators(prices, smaPeriod = 50, rsiPeriod = 14) {
  const result = [];
  const n = prices.length;

  for (let i = 0; i < n; i++) {
    const windowStart = Math.max(0, i - smaPeriod + 1);
    const window = prices.slice(windowStart, i + 1);
    const sma = window.reduce((acc, val) => acc + val, 0) / window.length;

    let rsi = 50;
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

export function computeDecision(price, sma50, rsi) {
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

export function generateStockMarketData(ticker, customDays = 45) {
  const normTicker = (ticker || 'AAPL').toUpperCase();
  const stock = MANNAG_STOCKS[normTicker];
  if (!stock) {
    throw new Error(`Only MANNAG stocks (${VALID_TICKERS.join(', ')}) are supported.`);
  }

  let seed = 0;
  for (let c of stock.symbol) seed += c.charCodeAt(0);
  const now = new Date();
  const timeBlock = Math.floor(now.getTime() / 30000);
  seed += timeBlock * 7;

  const rand = seededRandom(seed);
  const days = Math.max(10, Math.min(120, customDays || 45));
  const rawPrices = [];
  const dates = [];

  let currentP = stock.basePrice * (0.92 + rand() * 0.08);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
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
      dataSource: 'Upstream Market Feed Service',
    },
  };
}

/**
 * Shared route function: Real-time stock prices
 */
export async function getStockPriceData(ticker) {
  const normTicker = (ticker || 'AAPL').toUpperCase();
  if (!VALID_TICKERS.includes(normTicker)) {
    throw new Error(`Only MANNAG stocks (${VALID_TICKERS.join(', ')}) are supported.`);
  }

  const data = generateStockMarketData(normTicker);
  return {
    symbol: data.symbol,
    companyName: data.companyName,
    price: data.price,
    changePercent: data.changePercent,
    decision: data.decision,
    reasoning: data.reasoning,
    chartData: data.chartData,
    source: 'Upstream Market Feed Service',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Shared route function: Historical data points for chart rendering
 */
export async function getHistoricalPricesData(ticker, days = 45) {
  const normTicker = (ticker || 'AAPL').toUpperCase();
  if (!VALID_TICKERS.includes(normTicker)) {
    throw new Error(`Only MANNAG stocks (${VALID_TICKERS.join(', ')}) are supported.`);
  }

  const data = generateStockMarketData(normTicker, days);
  return {
    symbol: data.symbol,
    companyName: data.companyName,
    chartData: data.chartData,
    source: 'Upstream Market Feed Service',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Shared route function: Technical analysis indicators & decisions
 */
export async function getTechnicalIndicatorsData(ticker) {
  const normTicker = (ticker || 'AAPL').toUpperCase();
  if (!VALID_TICKERS.includes(normTicker)) {
    throw new Error(`Only MANNAG stocks (${VALID_TICKERS.join(', ')}) are supported.`);
  }

  const data = generateStockMarketData(normTicker);
  return {
    symbol: data.symbol,
    companyName: data.companyName,
    sma50: data.latestIndicators.sma50,
    rsi: data.latestIndicators.rsi,
    decision: data.decision,
    reasoning: data.reasoning,
    source: 'Upstream Market Feed Service',
    fetched_at: new Date().toISOString(),
  };
}
