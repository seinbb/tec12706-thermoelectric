import React, { useState } from 'react';
import { CalculatedDataPoint, RunSummaryStats } from '../../types/experiment';
import { Download, Trash2, Search, ArrowUpDown } from 'lucide-react';

interface DataTablePanelProps {
  dataPoints: CalculatedDataPoint[];
  stats: RunSummaryStats;
  onClearData: () => void;
  onDownloadCsv: () => void;
  sourceType: 'serial' | 'file' | 'simulation';
}

export const DataTablePanel: React.FC<DataTablePanelProps> = ({
  dataPoints,
  stats,
  onClearData,
  onDownloadCsv,
  sourceType,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filter
  const filtered = dataPoints.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.relativeTimeSec.toString().includes(term) ||
      p.th.toString().includes(term) ||
      p.tc.toString().includes(term) ||
      p.voltage.toString().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const currentItems = filtered.slice(startIdx, startIdx + pageSize);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">전체 실험 측정값 및 물리 계산 데이터 테이블</h3>
            <span className="text-xs font-mono text-slate-500">총 {dataPoints.length}개 포인트</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${sourceType === 'serial' ? 'bg-emerald-100 text-emerald-800' : sourceType === 'simulation' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
              {sourceType === 'serial' ? '실제 센서 측정' : sourceType === 'simulation' ? '가상 시뮬레이션' : 'CSV 파일'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            센서 원본 신호로부터 자동 계산된 ΔT, Tavg 및 순간 유효 제벡 계수(α_eff = V/ΔT) 전수 기록
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="수치 검색..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="bg-white border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <button
            onClick={onDownloadCsv}
            disabled={dataPoints.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors shadow-xs ${dataPoints.length > 0 ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 다운로드</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('현재 실험의 모든 측정 데이터와 그래프를 초기화하시겠습니까?')) {
                onClearData();
              }
            }}
            disabled={dataPoints.length === 0}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors border ${dataPoints.length > 0 ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* Summary Row */}
      {dataPoints.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs font-mono grid grid-cols-7 gap-2 text-center border-b border-slate-800">
          <div><span className="text-slate-400 block text-[10px]">측정 시간</span>{stats.durationSec.toFixed(1)}s</div>
          <div><span className="text-slate-400 block text-[10px]">평균 Th</span>{stats.avgTh.toFixed(1)}°C</div>
          <div><span className="text-slate-400 block text-[10px]">평균 Tc</span>{stats.avgTc.toFixed(1)}°C</div>
          <div><span className="text-slate-400 block text-[10px]">평균 ΔT</span>{stats.avgDeltaT.toFixed(1)}°C</div>
          <div><span className="text-slate-400 block text-[10px]">평균 Tavg</span>{stats.avgTAvg.toFixed(1)}°C</div>
          <div><span className="text-slate-400 block text-[10px]">평균 전압</span>{stats.avgVoltage.toFixed(4)}V</div>
          <div><span className="text-slate-400 block text-[10px]">회귀 α_reg</span>{stats.regressionSlope > 0 ? `${stats.regressionSlope.toFixed(5)} V/K` : '--'}</div>
        </div>
      )}

      {/* Table Data Container */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 text-center">시간 (s)</th>
              <th className="py-2.5 px-4 text-center text-red-600">Th (°C)</th>
              <th className="py-2.5 px-4 text-center text-blue-600">Tc (°C)</th>
              <th className="py-2.5 px-4 text-center text-purple-600">ΔT (°C)</th>
              <th className="py-2.5 px-4 text-center text-slate-700">Tavg (°C)</th>
              <th className="py-2.5 px-4 text-center text-amber-600">발생 전압 V (V)</th>
              <th className="py-2.5 px-4 text-center text-emerald-600">순간 제벡 α_eff (V/K)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic font-sans">
                  측정 데이터가 비어 있습니다. 아두이노 연결 후 측정을 시작해 주세요.
                </td>
              </tr>
            ) : (
              currentItems.map((p, idx) => (
                <tr key={p.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-4 text-center text-slate-600 tabular-nums">{p.relativeTimeSec.toFixed(2)}</td>
                  <td className="py-2 px-4 text-center text-red-600 font-medium tabular-nums">{p.th.toFixed(2)}</td>
                  <td className="py-2 px-4 text-center text-blue-600 font-medium tabular-nums">{p.tc.toFixed(2)}</td>
                  <td className="py-2 px-4 text-center text-purple-700 font-semibold tabular-nums">{p.deltaT.toFixed(2)}</td>
                  <td className="py-2 px-4 text-center text-slate-800 tabular-nums">{p.tAvg.toFixed(2)}</td>
                  <td className="py-2 px-4 text-center text-amber-700 font-semibold tabular-nums">{p.voltage.toFixed(4)}</td>
                  <td className="py-2 px-4 text-center tabular-nums">
                    {p.alpha !== null ? (
                      <span className="text-emerald-700 font-medium">{p.alpha.toFixed(5)}</span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-sans">온도차 부족</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-mono text-slate-600">
          <span>
            {startIdx + 1} - {Math.min(filtered.length, startIdx + pageSize)} of {filtered.length} 개
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
            >
              이전
            </button>
            <span className="font-semibold">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
