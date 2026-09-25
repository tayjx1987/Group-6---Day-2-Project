import React, { useState, useMemo, useRef } from 'react';
import { Sliders, Eye, TrendingUp, BarChart2 } from 'lucide-react';
import { ChartPoint } from '../types';

interface StockChartProps {
  data: ChartPoint[];
  symbol: string;
  currentPrice: number;
}

export const StockChart: React.FC<StockChartProps> = ({ data, symbol, currentPrice }) => {
  const [timeRange, setTimeRange] = useState<'1M' | '2M' | 'ALL'>('ALL');
  const [showSma, setShowSma] = useState<boolean>(true);
  const [showRsi, setShowRsi] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter data according to timeRange
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (timeRange === '1M') return data.slice(-22);
    if (timeRange === '2M') return data.slice(-44);
    return data;
  }, [data, timeRange]);

  // Price line calculations
  const priceStats = useMemo(() => {
    if (filteredData.length === 0) return { min: 0, max: 100, range: 100 };
    const allPrices = filteredData.map((d) => d.price);
    if (showSma) {
      filteredData.forEach((d) => allPrices.push(d.sma50));
    }
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.08 || 1;
    return {
      min: Math.max(0, min - padding),
      max: max + padding,
      range: (max + padding) - Math.max(0, min - padding) || 1,
    };
  }, [filteredData, showSma]);

  // SVG dimensions
  const svgWidth = 800;
  const mainHeight = showRsi ? 240 : 320;
  const rsiHeight = 110;
  const totalSvgHeight = showRsi ? mainHeight + rsiHeight + 30 : mainHeight;

  // Map data to SVG points
  const points = useMemo(() => {
    const len = filteredData.length;
    if (len === 0) return [];
    return filteredData.map((d, i) => {
      const x = 50 + (i / Math.max(1, len - 1)) * (svgWidth - 70);
      const y = mainHeight - 20 - ((d.price - priceStats.min) / priceStats.range) * (mainHeight - 40);
      const smaY = mainHeight - 20 - ((d.sma50 - priceStats.min) / priceStats.range) * (mainHeight - 40);
      // RSI maps between 0 and 100 in rsiHeight space
      const rsiY = mainHeight + 25 + (rsiHeight - 20) - (d.rsi / 100) * (rsiHeight - 30);
      return { x, y, smaY, rsiY, data: d };
    });
  }, [filteredData, priceStats, mainHeight, rsiHeight, svgWidth]);

  // Paths
  const pricePath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  }, [points]);

  const priceAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${pricePath} L ${last.x.toFixed(1)} ${mainHeight - 15} L ${first.x.toFixed(1)} ${mainHeight - 15} Z`;
  }, [points, pricePath, mainHeight]);

  const smaPath = useMemo(() => {
    if (points.length < 2 || !showSma) return '';
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.smaY.toFixed(1)}`, '');
  }, [points, showSma]);

  const rsiPath = useMemo(() => {
    if (points.length < 2 || !showRsi) return '';
    return points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.rsiY.toFixed(1)}`, '');
  }, [points, showRsi]);

  // Hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;

    // Find nearest point
    let nearestIdx = 0;
    let minDist = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = idx;
      }
    });

    setHoverIndex(nearestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];
  const isUp = filteredData.length > 1 && filteredData[filteredData.length - 1].price >= filteredData[0].price;

  // Horizontal price grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = priceStats.min + (priceStats.range / count) * i;
      const y = mainHeight - 20 - (i / count) * (mainHeight - 40);
      lines.push({ val, y });
    }
    return lines;
  }, [priceStats, mainHeight]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Chart Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white text-base sm:text-lg">
            Interactive Price & Technical Indicator Chart
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Overlays Toggle */}
          <button
            onClick={() => setShowSma(!showSma)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showSma
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-0.5 bg-amber-400 inline-block rounded" />
            50-Day SMA
          </button>

          <button
            onClick={() => setShowRsi(!showRsi)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showRsi
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-0.5 bg-purple-400 inline-block rounded" />
            RSI Oscillator
          </button>

          {/* Time range selector */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80">
            {(['1M', '2M', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === r
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Crosshair Inspection Bar */}
      {activePoint && (
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 bg-slate-950/70 border-b border-slate-800/80 rounded-lg mt-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Date:</span>
            <span className="font-mono font-semibold text-slate-200">
              {activePoint.data.timestamp}
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 font-mono">
            <div>
              <span className="text-slate-400 mr-1.5">Price:</span>
              <span className="font-bold text-white">${activePoint.data.price.toFixed(2)}</span>
            </div>

            {showSma && (
              <div>
                <span className="text-amber-400 mr-1.5">SMA50:</span>
                <span className="font-bold text-amber-200">${activePoint.data.sma50.toFixed(2)}</span>
              </div>
            )}

            {showRsi && (
              <div>
                <span className="text-purple-400 mr-1.5">RSI(14):</span>
                <span
                  className={`font-bold ${
                    activePoint.data.rsi < 30
                      ? 'text-emerald-400'
                      : activePoint.data.rsi > 70
                      ? 'text-rose-400'
                      : 'text-purple-200'
                  }`}
                >
                  {activePoint.data.rsi.toFixed(1)}
                </span>
                <span className="text-[10px] ml-1 text-slate-400">
                  {activePoint.data.rsi < 30
                    ? '[Oversold Buy Trigger]'
                    : activePoint.data.rsi > 70
                    ? '[Overbought Sell Trigger]'
                    : '[Neutral]'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative mt-4 select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? '#10b981' : '#3b82f6'} stopOpacity="0.35" />
              <stop offset="100%" stopColor={isUp ? '#10b981' : '#3b82f6'} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="rsiOverboughtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="rsiOversoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {/* MAIN PRICE CHART BACKGROUND & GRID */}
          <rect
            x="50"
            y="10"
            width={svgWidth - 70}
            height={mainHeight - 25}
            fill="#090d16"
            rx="6"
            className="stroke-slate-800/60"
            strokeWidth="1"
          />

          {/* Price grid lines & Y labels */}
          {gridLines.map((line, i) => (
            <g key={i}>
              <line
                x1="50"
                y1={line.y}
                x2={svgWidth - 20}
                y2={line.y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x="44"
                y={line.y + 4}
                textAnchor="end"
                className="fill-slate-500 font-mono text-[10px]"
              >
                ${line.val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Price Area Fill */}
          {priceAreaPath && <path d={priceAreaPath} fill="url(#priceGradient)" />}

          {/* SMA 50 Line */}
          {showSma && smaPath && (
            <path
              d={smaPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
          )}

          {/* Price Line */}
          {pricePath && (
            <path
              d={pricePath}
              fill="none"
              stroke={isUp ? '#10b981' : '#38bdf8'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Date ticks on X axis */}
          {points.length > 0 &&
            [0, Math.floor(points.length / 2), points.length - 1].map((idx) => {
              const p = points[idx];
              if (!p) return null;
              return (
                <text
                  key={idx}
                  x={p.x}
                  y={mainHeight}
                  textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {p.data.timestamp}
                </text>
              );
            })}

          {/* RSI SUB-CHART */}
          {showRsi && (
            <g transform={`translate(0, ${mainHeight + 15})`}>
              {/* RSI background box */}
              <rect
                x="50"
                y="10"
                width={svgWidth - 70}
                height={rsiHeight}
                fill="#090d16"
                rx="6"
                className="stroke-slate-800/60"
                strokeWidth="1"
              />

              {/* Overbought trigger band (> 70) */}
              <rect
                x="50"
                y={10 + rsiHeight * 0.1}
                width={svgWidth - 70}
                height={rsiHeight * 0.2}
                fill="url(#rsiOverboughtGrad)"
              />
              {/* Oversold trigger band (< 30) */}
              <rect
                x="50"
                y={10 + rsiHeight * 0.7}
                width={svgWidth - 70}
                height={rsiHeight * 0.2}
                fill="url(#rsiOversoldGrad)"
              />

              {/* 70 Level Line */}
              <line
                x1="50"
                y1={10 + rsiHeight * 0.3}
                x2={svgWidth - 20}
                y2={10 + rsiHeight * 0.3}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              <text
                x="44"
                y={14 + rsiHeight * 0.3}
                textAnchor="end"
                className="fill-rose-400 font-mono text-[10px]"
              >
                70 (OB)
              </text>

              {/* 50 Equilibrium Line */}
              <line
                x1="50"
                y1={10 + rsiHeight * 0.5}
                x2={svgWidth - 20}
                y2={10 + rsiHeight * 0.5}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <text
                x="44"
                y={14 + rsiHeight * 0.5}
                textAnchor="end"
                className="fill-slate-500 font-mono text-[10px]"
              >
                50
              </text>

              {/* 30 Level Line */}
              <line
                x1="50"
                y1={10 + rsiHeight * 0.7}
                x2={svgWidth - 20}
                y2={10 + rsiHeight * 0.7}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              <text
                x="44"
                y={14 + rsiHeight * 0.7}
                textAnchor="end"
                className="fill-emerald-400 font-mono text-[10px]"
              >
                30 (OS)
              </text>

              {/* RSI Curve */}
              {rsiPath && (
                <path
                  d={rsiPath}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}

              <text
                x="60"
                y="24"
                className="fill-purple-400 font-semibold text-[11px] tracking-wide"
              >
                RSI (14) Indicator • Signal Trigger Zones
              </text>
            </g>
          )}

          {/* ACTIVE CROSSHAIR */}
          {activePoint && hoverIndex !== null && (
            <g>
              {/* Vertical line across price chart and RSI */}
              <line
                x1={activePoint.x}
                y1={10}
                x2={activePoint.x}
                y2={totalSvgHeight - 10}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Dot on price line */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="4.5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Dot on SMA line */}
              {showSma && (
                <circle
                  cx={activePoint.x}
                  cy={activePoint.smaY}
                  r="3.5"
                  fill="#fbbf24"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                />
              )}

              {/* Dot on RSI line */}
              {showRsi && (
                <circle
                  cx={activePoint.x}
                  cy={activePoint.rsiY}
                  r="3.5"
                  fill="#c084fc"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Chart Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-0.5 rounded ${isUp ? 'bg-emerald-400' : 'bg-sky-400'}`} />
            <span>Price Trend</span>
          </div>
          {showSma && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-amber-400 border-b border-dashed border-amber-300" />
              <span>50-Day SMA Overlay</span>
            </div>
          )}
          {showRsi && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-purple-400" />
              <span>14-Day RSI Oscillator (30/70 triggers)</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-400">
          Hover to inspect historical data points & crosshairs
        </div>
      </div>
    </div>
  );
};
