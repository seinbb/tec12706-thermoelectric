import React, { useState, useMemo } from 'react';
import { ExperimentRun, CalculatedDataPoint } from '../../types/experiment';
import { filterPointsByDeltaT, computeConditionStats } from '../../utils/physics';
import { Layers, Plus, Trash2, Sliders, Info, Check, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

interface ComparativeAnalysisPanelProps {
  currentPoints: CalculatedDataPoint[];
  currentStats: any;
  currentSourceType: 'serial' | 'file' | 'simulation';
  savedRuns: ExperimentRun[];
  onSaveCurrentRun: (label: string, notes?: string) => void;
  onDeleteRun: (id: string) => void;
  onLoadRunToActive?: (run: ExperimentRun) => void;
}

export const ComparativeAnalysisPanel: React.FC<ComparativeAnalysisPanelProps> = ({
  currentPoints,
  currentStats,
  currentSourceType,
  savedRuns,
  onSaveCurrentRun,
  onDeleteRun,
}) => {
  const [newRunLabel, setNewRunLabel] = useState('');
  const [targetDeltaT, setTargetDeltaT] = useState<number>(30.0);
  const [tolerance, setTolerance] = useState<number>(1.5);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);

  // Initialize selected runs when runs change
  const activeRuns = useMemo(() => {
    if (savedRuns.length === 0) return [];
    if (selectedRunIds.length === 0) {
      return savedRuns; // select all by default
    }
    return savedRuns.filter(r => selectedRunIds.includes(r.id));
  }, [savedRuns, selectedRunIds]);

  const toggleRunSelection = (id: string) => {
    setSelectedRunIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSaveCurrent = () => {
    const label = newRunLabel.trim() || `실험 회차 #${savedRuns.length + 1} (${currentStats.avgTAvg.toFixed(1)}°C)`;
    onSaveCurrentRun(label);
    setNewRunLabel('');
  };

  // Compute sliced condition stats for each selected run
  const comparativeResults = useMemo(() => {
    return activeRuns.map(run => {
      const matchedPoints = filterPointsByDeltaT(run.dataPoints, targetDeltaT, tolerance);
      const conditionStats = computeConditionStats(matchedPoints);
      return {
        runId: run.id,
        runName: run.name,
        conditionLabel: run.conditionLabel,
        sourceType: run.sourceType,
        matchedCount: matchedPoints.length,
        meanTAvg: conditionStats.meanTAvg,
        meanDeltaT: conditionStats.meanDeltaT,
        meanVoltage: conditionStats.meanVoltage,
        meanAlpha: conditionStats.meanAlpha,
        stdVoltage: conditionStats.stdVoltage,
        matchedPoints
      };
    });
  }, [activeRuns, targetDeltaT, tolerance]);

  // Sort comparative results by Tavg ascending for clear trend analysis
  const sortedByTAvg = useMemo(() => {
    return [...comparativeResults].filter(r => r.matchedCount > 0).sort((a, b) => a.meanTAvg - b.meanTAvg);
  }, [comparativeResults]);

  // Viewbox calculation for comparative bar/scatter chart
  const chartHeight = 220;
  const chartWidth = 650;
  const pad = { top: 20, right: 30, bottom: 40, left: 60 };

  const maxVolt = Math.max(0.1, ...sortedByTAvg.map(r => r.meanVoltage * 1.2));
  const minT = sortedByTAvg.length > 0 ? Math.min(...sortedByTAvg.map(r => r.meanTAvg)) - 5 : 10;
  const maxT = sortedByTAvg.length > 0 ? Math.max(...sortedByTAvg.map(r => r.meanTAvg)) + 5 : 70;

  return (
    <div className="space-y-6">
      {/* Top Section: Save current run & Core Research Question Notice */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900">
                핵심 연구 과제: 평균 온도(Tavg)에 따른 열전 출력 특성 비교 분석
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              <strong>연구 가설 질문:</strong> "동일한 온도차(ΔT) 조건에서 양면의 평균 온도(Tavg)가 다르면 열전소자의 발생 전압(V)과 유효 제벡 계수(α)도 달라질까?"
            </p>
          </div>

          {/* Save Current Active Run */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="예: 저온 평균 조건 (얼음물)"
              value={newRunLabel}
              onChange={e => setNewRunLabel(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
            />
            <button
              onClick={handleSaveCurrent}
              disabled={currentPoints.length < 5}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs ${currentPoints.length >= 5 ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Plus className="w-4 h-4" />
              <span>현재 실험 보관</span>
            </button>
          </div>
        </div>

        {/* Saved Runs Pill Filter List */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
            <span>보관된 세션 실험 목록 ({savedRuns.length}개):</span>
            <span className="text-slate-400 font-normal">비교할 실험을 클릭하여 선택/해제</span>
          </div>

          {savedRuns.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">
              보관된 실험이 없습니다. 서로 다른 비커 온도(얼음물, 상온수, 온수)에서 측정한 후 [현재 실험 보관]을 눌러주세요.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedRuns.map(run => {
                const isSelected = selectedRunIds.length === 0 || selectedRunIds.includes(run.id);
                return (
                  <div
                    key={run.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold' : 'bg-white border-slate-200 text-slate-500 opacity-60'}`}
                    onClick={() => toggleRunSelection(run.id)}
                  >
                    <span>{run.name}</span>
                    <span className="text-[11px] text-slate-400">
                      (Tavg {run.stats.avgTAvg.toFixed(1)}°C · N={run.dataPoints.length})
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${run.sourceType === 'serial' ? 'bg-emerald-100 text-emerald-800' : run.sourceType === 'simulation' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                      {run.sourceType === 'serial' ? '실제' : run.sourceType === 'simulation' ? '가상' : 'CSV'}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteRun(run.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 rounded"
                      title="실험 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Condition Tolerance Slider & Filter */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h4 className="text-sm font-semibold text-slate-900">비교 기준 온도차(ΔT) 및 오차 허용 범위(Tolerance) 설정</h4>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          서로 다른 실험에서 완전히 동일한 소수점 단위의 ΔT를 직접 비교할 수 없으므로, 설정된 허용 오차 범위 내의 유효 데이터를 추출하여 통계적 평균 전압을 비교합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-700 font-semibold">목표 온도차 (Target ΔT):</span>
              <span className="text-indigo-700 font-bold text-sm">{targetDeltaT.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="5"
              max="70"
              step="0.5"
              value={targetDeltaT}
              onChange={e => setTargetDeltaT(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
              <span>5.0 °C</span>
              <span>35.0 °C</span>
              <span>70.0 °C</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-700 font-semibold">온도차 허용 오차 (Tolerance ±ε):</span>
              <span className="text-indigo-700 font-bold text-sm">± {tolerance.toFixed(1)} °C</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="4.0"
              step="0.1"
              value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
              <span>±0.2 °C (엄격)</span>
              <span>±1.5 °C (권장)</span>
              <span>±4.0 °C (넓음)</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded p-2 flex items-center justify-between">
          <span>
            추출 대상 구간: <strong className="text-indigo-700 font-bold">{(targetDeltaT - tolerance).toFixed(1)}°C ~ {(targetDeltaT + tolerance).toFixed(1)}°C</strong>
          </span>
          <span className="text-slate-500">
            총 {sortedByTAvg.reduce((acc, cur) => acc + cur.matchedCount, 0)}개 측정 포인트 필터링됨
          </span>
        </div>
      </div>

      {/* Sliced Condition Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">
            동일 온도차(ΔT ≈ {targetDeltaT.toFixed(1)} ± {tolerance.toFixed(1)}°C) 조건 추출 통계 요약
          </h4>
          <span className="text-xs font-mono text-slate-500">
            실험별 N수 및 평균 전압 정량 비교
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">실험명 및 조건</th>
                <th className="py-2.5 px-3 text-center">출처</th>
                <th className="py-2.5 px-3 text-center">추출 표본수 (N)</th>
                <th className="py-2.5 px-3 text-center">구간 평균 ΔT</th>
                <th className="py-2.5 px-3 text-center text-slate-900">구간 평균 온도 (Tavg)</th>
                <th className="py-2.5 px-3 text-center text-amber-700">평균 발생 전압 (V) ± σ</th>
                <th className="py-2.5 px-3 text-center text-emerald-700">평균 순간 제벡 (α_eff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparativeResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic font-sans">
                    비교 분석할 실험 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                comparativeResults.map(r => (
                  <tr key={r.runId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{r.runName}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.sourceType === 'serial' ? 'bg-emerald-100 text-emerald-800' : r.sourceType === 'simulation' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {r.sourceType === 'serial' ? '실제' : r.sourceType === 'simulation' ? '가상' : 'CSV'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums">
                      {r.matchedCount > 0 ? (
                        <span className={`font-semibold ${r.matchedCount < 3 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {r.matchedCount}개 {r.matchedCount < 3 && '(표본 부족)'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">해당 구간 데이터 없음</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums">
                      {r.matchedCount > 0 ? `${r.meanDeltaT.toFixed(2)} °C` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-slate-900">
                      {r.matchedCount > 0 ? `${r.meanTAvg.toFixed(2)} °C` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-amber-700 font-bold">
                      {r.matchedCount > 0 ? `${r.meanVoltage.toFixed(4)} ± ${r.stdVoltage.toFixed(4)} V` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-emerald-700 font-semibold">
                      {r.matchedCount > 0 && r.meanAlpha !== null ? `${r.meanAlpha.toFixed(5)} V/K` : '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparative Visualization: Tavg vs Voltage */}
      {sortedByTAvg.length >= 2 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                평균 온도(Tavg)에 따른 발생 전압(V) 비교 차트 (ΔT ≈ {targetDeltaT.toFixed(1)}°C 고정)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                가로축: 각 실험의 평균 온도(Tavg), 세로축: 해당 온도차 조건에서의 평균 전압(V)
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>평균 전압 (V)</span>
            </div>
          </div>

          <div className="relative w-full overflow-hidden select-none">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              {/* Axes */}
              <line x1={pad.left} y1={pad.top} x2={pad.left} y2={chartHeight - pad.bottom} stroke="#94A3B8" strokeWidth="1.5" />
              <line x1={pad.left} y1={chartHeight - pad.bottom} x2={chartWidth - pad.right} y2={chartHeight - pad.bottom} stroke="#94A3B8" strokeWidth="1.5" />

              <text x={pad.left} y={14} className="text-[11px] font-mono fill-slate-500 font-semibold">발생 전압 V (V)</text>
              <text x={chartWidth - pad.right} y={chartHeight - 10} textAnchor="end" className="text-[11px] font-mono fill-slate-500 font-semibold">평균 온도 Tavg (°C)</text>

              {/* Data points and line */}
              {sortedByTAvg.map((pt, i) => {
                const cx = pad.left + ((pt.meanTAvg - minT) / (maxT - minT)) * (chartWidth - pad.left - pad.right);
                const cy = pad.top + (chartHeight - pad.top - pad.bottom) - (pt.meanVoltage / maxVolt) * (chartHeight - pad.top - pad.bottom);
                const nextPt = sortedByTAvg[i + 1];

                let lineSegment = null;
                if (nextPt) {
                  const nextX = pad.left + ((nextPt.meanTAvg - minT) / (maxT - minT)) * (chartWidth - pad.left - pad.right);
                  const nextY = pad.top + (chartHeight - pad.top - pad.bottom) - (nextPt.meanVoltage / maxVolt) * (chartHeight - pad.top - pad.bottom);
                  lineSegment = (
                    <line
                      key={`seg-${i}`}
                      x1={cx}
                      y1={cy}
                      x2={nextX}
                      y2={nextY}
                      stroke="#F59E0B"
                      strokeWidth="2"
                      strokeDasharray="4,3"
                    />
                  );
                }

                return (
                  <g key={pt.runId}>
                    {lineSegment}
                    <circle cx={cx} cy={cy} r="6" fill="#F59E0B" stroke="#78350F" strokeWidth="2" />
                    <text x={cx} y={cy - 12} textAnchor="middle" className="text-[10px] font-mono fill-slate-800 font-bold">
                      {pt.meanVoltage.toFixed(4)}V
                    </text>
                    <text x={cx} y={chartHeight - pad.bottom + 16} textAnchor="middle" className="text-[10px] font-mono fill-slate-600">
                      {pt.meanTAvg.toFixed(1)}°C
                    </text>
                    <text x={cx} y={chartHeight - pad.bottom + 28} textAnchor="middle" className="text-[9px] font-mono fill-slate-400">
                      ({pt.runName})
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Scientific Analysis Discussion Box (Open-ended, objective) */}
      <div className="bg-slate-900 text-slate-100 rounded-lg p-5 space-y-3 font-sans">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>과학적 고찰 및 실험 데이터 해석 가이드</span>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            <strong>결과 단정 금지 원칙:</strong> 본 도구는 결과를 사전에 단정하지 않고 실제 측정된 정량적 데이터(N수, 표본 표준편차, 평균값)를 그대로 보여줍니다.
          </p>
          <p>
            <strong>이론적 배경 참고:</strong> 열전 반도체(Bi₂Te₃ 계열 TEC1-12706)의 제벡 계수 S(T)는 절대온도 T에 따라 다음과 같은 복합적 요인에 의해 영향을 받습니다:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2 font-mono text-[11px]">
            <li>반도체의 페르미 준위(E_F)와 가전자대/전도대 사이의 열적 에너지 준위 변동</li>
            <li>온도 상승 시 진성 캐리어(Electron-Hole) 열적 생성에 의한 바이폴라 전도(Bipolar conduction)</li>
            <li>톰슨 효과(Thomson Effect, dα/dT) 및 소자 내부 저항의 온도 계수 변화</li>
          </ul>
          <p className="text-[11px] text-slate-400 italic">
            * 동일한 ΔT에서도 평균 온도가 달라질 때 전압 변화의 경향성(증가, 감소 또는 미세 변동)을 확인하고, 오차 범위(±σ)와 샘플 수(N)를 고려하여 신뢰성 있는 탐구 결론을 도출하세요.
          </p>
        </div>
      </div>
    </div>
  );
};
