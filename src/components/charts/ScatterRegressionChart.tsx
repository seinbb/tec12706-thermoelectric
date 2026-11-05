import React, { useState, useRef, useMemo } from 'react';
import { CalculatedDataPoint } from '../../types/experiment';
import { calculateLinearRegression } from '../../utils/physics';
import { Info, Sparkles } from 'lucide-react';

interface ScatterRegressionChartProps {
  points: CalculatedDataPoint[];
  title?: string;
  height?: number;
}

export const ScatterRegressionChart: React.FC<ScatterRegressionChartProps> = ({
  points,
  title = '그래프 E: 전압과 온도차의 관계 (V vs ΔT) 및 선형 회귀 분석',
  height = 340,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<CalculatedDataPoint | null>(null);

  // Filter valid points (non-zero deltaT)
  const validPoints = useMemo(() => {
    return points.filter(p => !p.isLowDeltaT && isFinite(p.deltaT) && isFinite(p.voltage));
  }, [points]);

  // Compute linear regression
  const regression = useMemo(() => {
    return calculateLinearRegression(validPoints);
  }, [validPoints]);

  // Scale ranges
  const { minX, maxX, minY, maxY } = useMemo(() => {
    if (validPoints.length === 0) {
      return { minX: 0, maxX: 50, minY: 0, maxY: 1.5 };
    }

    let minX = 0; // standard zero baseline for deltaT
    let maxX = 0;
    let minY = 0;
    let maxY = 0;

    validPoints.forEach(p => {
      if (p.deltaT > maxX) maxX = p.deltaT;
      if (p.voltage > maxY) maxY = p.voltage;
      if (p.voltage < minY) minY = p.voltage;
    });

    maxX = Math.max(10, maxX * 1.1);
    maxY = Math.max(0.1, maxY * 1.15);

    return { minX, maxX, minY, maxY };
  }, [validPoints]);

  const svgWidth = 800;
  const svgHeight = height;
  const padding = { top: 25, right: 35, bottom: 45, left: 65 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const getSvgX = (x: number) => {
    return padding.left + ((x - minX) / (maxX - minX)) * chartWidth;
  };

  const getSvgY = (y: number) => {
    return padding.top + chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;
  };

  // Generate regression line endpoints
  const regLine = useMemo(() => {
    if (regression.pointCount < 2) return null;
    const x1 = minX;
    const y1 = regression.slope * x1 + regression.intercept;
    const x2 = maxX;
    const y2 = regression.slope * x2 + regression.intercept;
    return {
      x1: getSvgX(x1),
      y1: getSvgY(y1),
      x2: getSvgX(x2),
      y2: getSvgY(y2)
    };
  }, [regression, minX, maxX, chartWidth, chartHeight]);

  // Y axis ticks (5 ticks)
  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minY + (i / count) * (maxY - minY);
      ticks.push({ value: val, y: getSvgY(val) });
    }
    return ticks;
  }, [minY, maxY, chartHeight]);

  // X axis ticks (6 ticks)
  const xTicks = useMemo(() => {
    const ticks: { value: number; x: number }[] = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minX + (i / count) * (maxX - minX);
      ticks.push({ value: val, x: getSvgX(val) });
    }
    return ticks;
  }, [minX, maxX, chartWidth]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            가로축 온도차(ΔT)에 따른 세로축 발생 전압(V) 산점도와 최소자승법 선형 회귀 추세선
          </p>
        </div>

        {/* Regression Result Badge Box */}
        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-md text-xs font-mono shadow-xs">
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
            <span className="text-slate-400">회귀 기울기(α_reg):</span>
            <span className="text-emerald-400 font-bold">
              {regression.pointCount >= 2 ? `${regression.slope.toFixed(5)} V/K` : '데이터 부족'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
            <span className="text-slate-400">절편(C):</span>
            <span className="text-white font-semibold">
              {regression.pointCount >= 2 ? `${regression.intercept.toFixed(4)} V` : '-'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">결정계수(R²):</span>
            <span className={`font-bold ${regression.r2 >= 0.9 ? 'text-emerald-400' : regression.r2 >= 0.7 ? 'text-amber-400' : 'text-rose-400'}`}>
              {regression.pointCount >= 2 ? regression.r2.toFixed(4) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none my-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
        >
          {/* Background grid */}
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
                {t.value.toFixed(3)}
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
                {t.value.toFixed(1)}°C
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
            y={14}
            textAnchor="start"
            className="text-[11px] font-mono fill-slate-600 font-semibold"
          >
            발생 전압 V (V)
          </text>
          <text
            x={svgWidth - padding.right}
            y={svgHeight - 10}
            textAnchor="end"
            className="text-[11px] font-mono fill-slate-600 font-semibold"
          >
            온도차 ΔT (°C 또는 K)
          </text>

          {/* Fitted Linear Regression Line */}
          {regLine && (
            <g>
              <line
                x1={regLine.x1}
                y1={regLine.y1}
                x2={regLine.x2}
                y2={regLine.y2}
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeDasharray="6,4"
              />
            </g>
          )}

          {/* Scatter Points */}
          {validPoints.map(p => {
            const cx = getSvgX(p.deltaT);
            const cy = getSvgY(p.voltage);
            const isHovered = hoveredPoint?.id === p.id;
            return (
              <circle
                key={p.id}
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 3.5}
                fill="#3B82F6"
                stroke={isHovered ? '#1E3A8A' : '#FFFFFF'}
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all duration-75 cursor-pointer opacity-85 hover:opacity-100"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>

        {validPoints.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs">
            <span className="text-xs font-mono text-slate-400">회귀 분석을 위한 측정 데이터 대기 중</span>
          </div>
        )}

        {/* Hover Point Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 left-2 bg-slate-900/95 text-white text-xs font-mono p-2.5 rounded-md shadow-lg border border-slate-700 pointer-events-none">
            <div className="text-amber-400 font-bold mb-1">측정점 상세</div>
            <div>시간: {hoveredPoint.relativeTimeSec.toFixed(2)}s</div>
            <div>온도차(ΔT): {hoveredPoint.deltaT.toFixed(2)}°C</div>
            <div>발생 전압(V): {hoveredPoint.voltage.toFixed(4)}V</div>
            <div>순간 제벡(α_eff): {hoveredPoint.alpha !== null ? `${hoveredPoint.alpha.toFixed(5)} V/K` : '온도차 부족'}</div>
            <div>평균 온도(Tavg): {hoveredPoint.tAvg.toFixed(2)}°C</div>
          </div>
        )}
      </div>

      {/* Physics distinction guidance callout */}
      <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-900">제벡 계수 계산의 과학적 구분:</span>{' '}
          <strong className="text-blue-700">순간 유효 제벡 계수(α_eff = V / ΔT)</strong>는 각 측정 시점의 순간 물리적 응답비이며,{' '}
          <strong className="text-rose-700">선형 회귀 기울기(α_reg)</strong>는 전체 실험 구간의 최소자승법 피팅 추세선 기울기입니다.
          소자 내부 저항, 열 접촉 저항 및 온도 의존성 때문에 두 값은 완전히 일치하지 않으며, 결정계수(R²={regression.r2.toFixed(4)})를 통해 비례 관계의 신뢰도를 검증합니다.
        </div>
      </div>
    </div>
  );
};
