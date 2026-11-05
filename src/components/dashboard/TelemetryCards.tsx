import React from 'react';
import { CalculatedDataPoint, ConnectionStatus, RunSummaryStats } from '../../types/experiment';
import { Thermometer, Zap, Activity, Clock, Database, AlertCircle } from 'lucide-react';

interface TelemetryCardsProps {
  currentPoint: CalculatedDataPoint | null;
  connectionStatus: ConnectionStatus;
  isRecording: boolean;
  stats: RunSummaryStats;
  sourceType: 'serial' | 'file' | 'simulation';
  errorCount: number;
  lastErrorReason?: string;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  currentPoint,
  connectionStatus,
  isRecording,
  stats,
  sourceType,
  errorCount,
  lastErrorReason,
}) => {
  const isLive = (connectionStatus === 'connected' || connectionStatus === 'simulating') && isRecording;
  const hasData = currentPoint !== null;

  return (
    <div className="space-y-3">
      {/* Simulation / Physical Badge Banner */}
      {connectionStatus === 'simulating' && (
        <div className="bg-amber-500/10 border border-amber-300 text-amber-900 px-3.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold">[가상 시뮬레이션 모드 작동 중]</span>
            <span className="text-amber-800">
              실제 아두이노 하드웨어 미연결 상태에서의 TEC1-12706 물리 법칙 기반 시뮬레이션 데이터입니다.
            </span>
          </div>
          <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[11px]">검증용 데이터</span>
        </div>
      )}

      {/* Sensor Anomaly Alert Ribbon if errors detected */}
      {errorCount > 0 && lastErrorReason && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>센서 이상 신호 감지:</strong> {lastErrorReason} (비정상 수치 {errorCount}회 제외됨)
            </span>
          </div>
          <span className="text-rose-600 bg-rose-100 px-2 py-0.5 rounded text-[11px]">물리 계산에서 자동 제외</span>
        </div>
      )}

      {/* Main 6 Metric Big-Number Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Th */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all hover:border-red-300">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-red-500" />
              고온부 온도 Th
            </span>
            <span className="text-[11px] font-mono text-red-600 font-semibold">MAX6675 #1</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {hasData ? currentPoint.th.toFixed(1) : '--.-'}
            </span>
            <span className="text-xs font-mono text-slate-500">°C</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>평균 {stats.count > 0 ? stats.avgTh.toFixed(1) : '--'}°C</span>
            <span className="text-slate-500">스테인리스 고온 비커</span>
          </div>
        </div>

        {/* Card 2: Tc */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all hover:border-blue-300">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-blue-500" />
              저온부 온도 Tc
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">MAX6675 #2</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {hasData ? currentPoint.tc.toFixed(1) : '--.-'}
            </span>
            <span className="text-xs font-mono text-slate-500">°C</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>평균 {stats.count > 0 ? stats.avgTc.toFixed(1) : '--'}°C</span>
            <span className="text-slate-500">얼음/냉수 비커</span>
          </div>
        </div>

        {/* Card 3: Delta T */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all hover:border-purple-300">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-600" />
              양면 온도차 ΔT
            </span>
            <span className="text-[11px] font-mono text-purple-600 font-semibold">Th - Tc</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-purple-700 tabular-nums">
              {hasData ? currentPoint.deltaT.toFixed(1) : '--.-'}
            </span>
            <span className="text-xs font-mono text-slate-500">°C (K)</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>최대 {stats.maxDeltaT.toFixed(1)}°C</span>
            <span className="text-slate-500">평균 {stats.avgDeltaT.toFixed(1)}°C</span>
          </div>
        </div>

        {/* Card 4: Tavg */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all hover:border-slate-400">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-700" />
              평균 온도 Tavg
            </span>
            <span className="text-[11px] font-mono text-slate-600 font-semibold">(Th+Tc)/2</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {hasData ? currentPoint.tAvg.toFixed(1) : '--.-'}
            </span>
            <span className="text-xs font-mono text-slate-500">°C</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>조건 비교 기준</span>
            <span className="text-slate-500">평균 {stats.avgTAvg.toFixed(1)}°C</span>
          </div>
        </div>

        {/* Card 5: Voltage V */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all hover:border-amber-300">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              발생 전압 V
            </span>
            <span className="text-[11px] font-mono text-amber-600 font-semibold">ADS1115</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
              {hasData ? currentPoint.voltage.toFixed(4) : '-.----'}
            </span>
            <span className="text-xs font-mono text-slate-500">V</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>최대 {stats.maxVoltage.toFixed(3)}V</span>
            <span className="text-slate-500">
              {hasData ? `${(currentPoint.voltage * 1000).toFixed(1)} mV` : '-- mV'}
            </span>
          </div>
        </div>

        {/* Card 6: Seebeck alpha_eff */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs transition-all hover:border-emerald-300">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              순간 제벡(α_eff)
            </span>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold">V / ΔT</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            {hasData && currentPoint.alpha !== null ? (
              <>
                <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                  {currentPoint.alpha.toFixed(4)}
                </span>
                <span className="text-xs font-mono text-slate-500">V/K</span>
              </>
            ) : hasData && currentPoint.isLowDeltaT ? (
              <span className="text-sm font-bold font-mono text-amber-600 mt-1">온도차 부족</span>
            ) : (
              <span className="text-2xl font-bold font-mono text-slate-400">--.----</span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>회귀기울기 {stats.regressionSlope > 0 ? stats.regressionSlope.toFixed(4) : '--'}</span>
            <span className="text-emerald-700 font-medium">
              {hasData && currentPoint.alpha !== null ? `${(currentPoint.alpha * 1000).toFixed(2)} mV/K` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Status Strip: Elapsed Time, Packet Count, Regression R2 */}
      <div className="bg-slate-900 text-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">측정 경과 시간:</span>
            <span className="text-white font-bold tabular-nums">
              {hasData ? `${currentPoint.relativeTimeSec.toFixed(1)} s` : '0.0 s'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">유효 수신 데이터:</span>
            <span className="text-white font-bold tabular-nums">{stats.count}개</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">데이터 출처:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${sourceType === 'serial' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : sourceType === 'simulation' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}`}>
              {sourceType === 'serial' ? '실제 USB 시리얼 (Arduino)' : sourceType === 'simulation' ? '가상 시뮬레이션 (검증용)' : 'CSV 파일 업로드'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">전체 회귀 기울기(α_reg):</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              {stats.regressionSlope > 0 ? `${stats.regressionSlope.toFixed(5)} V/K` : '데이터 부족'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">선형 결정계수(R²):</span>
            <span className={`font-bold tabular-nums ${stats.regressionR2 >= 0.9 ? 'text-emerald-400' : stats.regressionR2 >= 0.7 ? 'text-amber-400' : 'text-slate-300'}`}>
              {stats.count >= 2 ? stats.regressionR2.toFixed(4) : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
