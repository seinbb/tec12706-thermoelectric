import React, { useState, useRef, useMemo } from 'react';

export interface SeriesConfig {
  key: string;
  name: string;
  color: string;
  unit: string;
  data: { x: number; y: number | null }[]; // x: seconds, y: value or null
}

interface InteractiveLineChartProps {
  title: string;
  subtitle?: string;
  series: SeriesConfig[];
  xLabel: string;
  yLabel: string;
  height?: number;
  timeWindow?: 'all' | '60s' | '180s';
  onTimeWindowChange?: (w: 'all' | '60s' | '180s') => void;
  showZeroBaseline?: boolean;
}

export const InteractiveLineChart: React.FC<InteractiveLineChartProps> = ({
  title,
  subtitle,
  series,
  xLabel,
  yLabel,
  height = 280,
  timeWindow = 'all',
  onTimeWindowChange,
  showZeroBaseline = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter series data according to time window
  const processedSeries = useMemo(() => {
    // Find maximum x across all series
    let maxX = 0;
    series.forEach(s => {
      s.data.forEach(d => {
        if (d.x > maxX) maxX = d.x;
      });
    });

    let minXThreshold = 0;
    if (timeWindow === '60s') minXThreshold = Math.max(0, maxX - 60);
    if (timeWindow === '180s') minXThreshold = Math.max(0, maxX - 180);

    return series.map(s => ({
      ...s,
      data: s.data.filter(d => d.x >= minXThreshold)
    }));
  }, [series, timeWindow]);

  // Compute scale boundaries
  const { minX, maxX, minY, maxY } = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    processedSeries.forEach(s => {
      s.data.forEach(d => {
        if (d.x < minX) minX = d.x;
        if (d.x > maxX) maxX = d.x;
        if (d.y !== null && isFinite(d.y)) {
          if (d.y < minY) minY = d.y;
          if (d.y > maxY) maxY = d.y;
        }
      });
    });

    if (minX === Infinity) minX = 0;
    if (maxX === -Infinity) maxX = 10;
    if (minX === maxX) maxX = minX + 10;

    if (minY === Infinity) minY = 0;
    if (maxY === -Infinity) maxY = 10;
    if (showZeroBaseline && minY > 0) minY = 0;
    if (minY === maxY) {
      minY = Math.max(0, minY - 1);
      maxY = maxY + 1;
    }

    // Add 8% padding to Y axis
    const yRange = maxY - minY;
    maxY += yRange * 0.08;
    if (!showZeroBaseline) {
      minY -= yRange * 0.08;
    }

    return { minX, maxX, minY, maxY };
  }, [processedSeries, showZeroBaseline]);

  // ViewBox dimensions
  const svgWidth = 800;
  const svgHeight = height;
  const padding = { top: 20, right: 30, bottom: 42, left: 65 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const getSvgX = (x: number) => {
    return padding.left + ((x - minX) / (maxX - minX)) * chartWidth;
  };

  const getSvgY = (y: number) => {
    return padding.top + chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;
  };

  // Generate SVG path for a series
  const buildPath = (data: { x: number; y: number | null }[]) => {
    let path = '';
    let inSegment = false;

    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      if (pt.y === null || !isFinite(pt.y)) {
        inSegment = false;
        continue;
      }

      const sx = getSvgX(pt.x);
      const sy = getSvgY(pt.y);

      if (!inSegment) {
        path += `M ${sx.toFixed(1)} ${sy.toFixed(1)} `;
        inSegment = true;
      } else {
        path += `L ${sx.toFixed(1)} ${sy.toFixed(1)} `;
      }
    }
    return path;
  };

  // Generate Y axis ticks (5 ticks)
  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minY + (i / count) * (maxY - minY);
      ticks.push({ value: val, y: getSvgY(val) });
    }
    return ticks;
  }, [minY, maxY, chartHeight]);

  // Generate X axis ticks (6 ticks)
  const xTicks = useMemo(() => {
    const ticks: { value: number; x: number }[] = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minX + (i / count) * (maxX - minX);
      ticks.push({ value: val, x: getSvgX(val) });
    }
    return ticks;
  }, [minX, maxX, chartWidth]);

  // Determine hover point
  const allPoints = processedSeries[0]?.data || [];
  const activeHoverPoint = hoverIndex !== null && allPoints[hoverIndex] ? allPoints[hoverIndex] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || allPoints.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseXRatio = (e.clientX - rect.left - (padding.left / svgWidth) * rect.width) / ((chartWidth / svgWidth) * rect.width);
    const targetX = minX + mouseXRatio * (maxX - minX);

    // Find closest index
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < allPoints.length; i++) {
      const diff = Math.abs(allPoints[i].x - targetX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hasData = processedSeries.some(s => s.data.length > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {series.map(s => (
              <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>

          {onTimeWindowChange && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md text-xs font-mono">
              <button
                onClick={() => onTimeWindowChange('all')}
                className={`px-2 py-0.5 rounded transition-colors ${timeWindow === 'all' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                전체
              </button>
              <button
                onClick={() => onTimeWindowChange('180s')}
                className={`px-2 py-0.5 rounded transition-colors ${timeWindow === '180s' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                3분
              </button>
              <button
                onClick={() => onTimeWindowChange('60s')}
                className={`px-2 py-0.5 rounded transition-colors ${timeWindow === '60s' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                60초
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Background grid lines */}
          {yTicks.map((t, idx) => (
            <g key={`ytick-${idx}`}>
              <line
                x1={padding.left}
                y1={t.y}
                x2={svgWidth - padding.right}
                y2={t.y}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="2,3"
              />
              <text
                x={padding.left - 8}
                y={t.y + 4}
                textAnchor="end"
                className="text-[11px] font-mono fill-slate-400"
              >
                {t.value >= 100 ? t.value.toFixed(0) : t.value >= 1 ? t.value.toFixed(2) : t.value.toFixed(4)}
              </text>
            </g>
          ))}

          {xTicks.map((t, idx) => (
            <g key={`xtick-${idx}`}>
              <line
                x1={t.x}
                y1={padding.top}
                x2={t.x}
                y2={svgHeight - padding.bottom}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="2,3"
              />
              <text
                x={t.x}
                y={svgHeight - padding.bottom + 16}
                textAnchor="middle"
                className="text-[11px] font-mono fill-slate-400"
              >
                {t.value.toFixed(0)}s
              </text>
            </g>
          ))}

          {/* Coordinate Axes */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={svgHeight - padding.bottom}
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={svgHeight - padding.bottom}
            x2={svgWidth - padding.right}
            y2={svgHeight - padding.bottom}
            stroke="#94A3B8"
            strokeWidth="1.5"
          />

          {/* Axis Labels */}
          <text
            x={padding.left}
            y={12}
            textAnchor="start"
            className="text-[11px] font-mono fill-slate-500 font-semibold"
          >
            {yLabel}
          </text>
          <text
            x={svgWidth - padding.right}
            y={svgHeight - 10}
            textAnchor="end"
            className="text-[11px] font-mono fill-slate-500 font-semibold"
          >
            {xLabel}
          </text>

          {/* Render Series Lines */}
          {processedSeries.map(s => {
            const pathStr = buildPath(s.data);
            return (
              <g key={s.key}>
                <path
                  d={pathStr}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Interactive Hover Crosshair */}
          {activeHoverPoint && (
            <g>
              <line
                x1={getSvgX(activeHoverPoint.x)}
                y1={padding.top}
                x2={getSvgX(activeHoverPoint.x)}
                y2={svgHeight - padding.bottom}
                stroke="#0F172A"
                strokeWidth="1.5"
                strokeDasharray="3,3"
              />
              {processedSeries.map(s => {
                const val = s.data[hoverIndex!]?.y;
                if (val === null || val === undefined || !isFinite(val)) return null;
                const cx = getSvgX(activeHoverPoint.x);
                const cy = getSvgY(val);
                return (
                  <circle
                    key={`hover-dot-${s.key}`}
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill={s.color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Empty state overlay */}
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs">
            <span className="text-xs font-mono text-slate-400">데이터 대기 중 (시리얼 연결 또는 측정 시작 필요)</span>
          </div>
        )}

        {/* Interactive HUD Readout */}
        {activeHoverPoint && (
          <div className="absolute top-2 right-2 bg-slate-900/90 text-white text-xs font-mono px-2.5 py-1.5 rounded-md shadow-md border border-slate-700 pointer-events-none flex flex-col gap-1">
            <div className="text-slate-300 border-b border-slate-700 pb-0.5">
              시간: <span className="text-white font-bold">{activeHoverPoint.x.toFixed(2)}s</span>
            </div>
            {processedSeries.map(s => {
              const pt = s.data[hoverIndex!];
              const val = pt ? pt.y : null;
              return (
                <div key={`hud-${s.key}`} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-300">{s.name}:</span>
                  </span>
                  <span className="font-semibold text-white">
                    {val !== null && isFinite(val) ? `${val.toFixed(val >= 10 ? 2 : 4)} ${s.unit}` : '온도차 부족'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
