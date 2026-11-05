import React from 'react';
import { CalculatedDataPoint, ConnectionStatus, RunSummaryStats } from '../../types/experiment';
import { InteractiveLineChart, SeriesConfig } from '../charts/InteractiveLineChart';
import { ScatterRegressionChart } from '../charts/ScatterRegressionChart';
import { Activity, Thermometer, Zap, Layers, Play, Square, RotateCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface DashboardTabProps {
  dataPoints: CalculatedDataPoint[];
  stats: RunSummaryStats;
  connectionStatus: ConnectionStatus;
  isRecording: boolean;
  onToggleRecording: () => void;
  onResetData: () => void;
  onNavigateTab: (tabKey: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  dataPoints,
  stats,
  connectionStatus,
  isRecording,
  onToggleRecording,
  onResetData,
  onNavigateTab,
}) => {
  // Recent 60 data points for quick overview
  const recentPoints = dataPoints.slice(-60);

  const seriesOverview: SeriesConfig[] = [
    {
      key: 'deltaT',
      name: '온도차 ΔT (°C)',
      color: '#8B5CF6',
      unit: '°C',
      data: recentPoints.map(p => ({ x: p.relativeTimeSec, y: p.deltaT }))
    },
    {
      key: 'volt100',
      name: '전압 V x 20 (스케일 조정)',
      color: '#F59E0B',
      unit: 'V (x20)',
      data: recentPoints.map(p => ({ x: p.relativeTimeSec, y: p.voltage * 20 }))
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Quick Experiment Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleRecording}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-xs ${isRecording ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
          >
            {isRecording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>측정 일시 중지</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>실험 측정 시작 (Record)</span>
              </>
            )}
          </button>

          <button
            onClick={onResetData}
            disabled={dataPoints.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>실험 데이터 초기화</span>
          </button>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => onNavigateTab('charts')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium transition-colors"
          >
            실시간 5대 그래프 보기 →
          </button>
          <button
            onClick={() => onNavigateTab('comparison')}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-medium transition-colors"
          >
            온도 조건별 비교 분석 →
          </button>
          <button
            onClick={() => onNavigateTab('table')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-medium transition-colors"
          >
            CSV 데이터 테이블 →
          </button>
        </div>
      </div>

      {/* Main Overview Visual Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-time Multi-Channel Overview */}
        <div className="lg:col-span-2 space-y-4">
          <InteractiveLineChart
            title="실시간 복합 모니터: 온도차(ΔT)와 발생 전압(V)의 동기화 변화"
            subtitle="온도차가 발생함에 따라 전압이 실시간으로 비례 생성되는 과정을 관찰합니다."
            series={seriesOverview}
            xLabel="경과 시간 (s)"
            yLabel="상대 수치"
            height={260}
          />

          <ScatterRegressionChart
            points={dataPoints}
            title="선형 회귀 분석: V = α_reg · ΔT + C"
            height={280}
          />
        </div>

        {/* Right 1 Col: Experiment Status & Hardware Sensor Health */}
        <div className="space-y-4">
          {/* Hardware & Sensor Status Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider text-slate-400">
              센서 하드웨어 진단 상태
            </h4>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dataPoints.length > 0 ? 'bg-red-500' : 'bg-slate-400'}`} />
                  <span>MAX6675 #1 (Th 고온부)</span>
                </span>
                <span className="font-semibold text-red-600">
                  {dataPoints.length > 0 ? `${dataPoints[dataPoints.length - 1].th.toFixed(1)}°C` : '신호 대기'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dataPoints.length > 0 ? 'bg-blue-500' : 'bg-slate-400'}`} />
                  <span>MAX6675 #2 (Tc 저온부)</span>
                </span>
                <span className="font-semibold text-blue-600">
                  {dataPoints.length > 0 ? `${dataPoints[dataPoints.length - 1].tc.toFixed(1)}°C` : '신호 대기'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dataPoints.length > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <span>ADS1115 ADC (전압 V)</span>
                </span>
                <span className="font-semibold text-amber-600">
                  {dataPoints.length > 0 ? `${dataPoints[dataPoints.length - 1].voltage.toFixed(4)}V` : '신호 대기'}
                </span>
              </div>
            </div>
          </div>

          {/* TEC1-12706 Technical Spec Specs */}
          <div className="bg-slate-900 text-white rounded-lg p-4 shadow-xs space-y-2.5 font-mono text-xs">
            <div className="text-slate-400 text-[11px] font-semibold tracking-wider">
              TEC1-12706 열전소자 레퍼런스 규격
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">P-N 접합 커플 수:</span>
                <span className="font-bold text-white">127 couples</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">소자 치수:</span>
                <span className="text-white">40 x 40 x 3.8 mm</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">이론적 제벡 계수:</span>
                <span className="text-emerald-400 font-bold">~ 0.045 ~ 0.053 V/K</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-400">최대 허용 작동 온도:</span>
                <span className="text-white">138 °C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">최대 온도차 (ΔTmax):</span>
                <span className="text-white">67 °C</span>
              </div>
            </div>
          </div>

          {/* Experiment Tips Card */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-blue-950">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>실험 탐구 유의사항</span>
            </div>
            <p className="leading-relaxed text-[11px] text-blue-800">
              온도차 ΔT가 0.5°C 미만일 때는 나눗셈의 특이점(분모 0 수렴)으로 인해 유효 제벡 계수(α)가 계산되지 않고 '온도차 부족'으로 처리됩니다.
              비커 표면에 서멀 구리스를 얇게 도포하여 열전도율을 확보하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
