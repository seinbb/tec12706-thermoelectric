import React, { useState } from 'react';
import { CalculatedDataPoint } from '../../types/experiment';
import { InteractiveLineChart, SeriesConfig } from './InteractiveLineChart';
import { ScatterRegressionChart } from './ScatterRegressionChart';
import { Grid, Maximize2 } from 'lucide-react';

interface RealtimeChartsTabProps {
  dataPoints: CalculatedDataPoint[];
}

export const RealtimeChartsTab: React.FC<RealtimeChartsTabProps> = ({ dataPoints }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'A' | 'B' | 'C' | 'D' | 'E'>('all');
  const [timeWindow, setTimeWindow] = useState<'all' | '60s' | '180s'>('all');

  // Series A: Th and Tc
  const seriesA: SeriesConfig[] = [
    {
      key: 'th',
      name: '고온부 Th',
      color: '#EF4444',
      unit: '°C',
      data: dataPoints.map(p => ({ x: p.relativeTimeSec, y: p.th }))
    },
    {
      key: 'tc',
      name: '저온부 Tc',
      color: '#3B82F6',
      unit: '°C',
      data: dataPoints.map(p => ({ x: p.relativeTimeSec, y: p.tc }))
    }
  ];

  // Series B: Delta T
  const seriesB: SeriesConfig[] = [
    {
      key: 'deltaT',
      name: '온도차 ΔT (Th - Tc)',
      color: '#8B5CF6',
      unit: '°C',
      data: dataPoints.map(p => ({ x: p.relativeTimeSec, y: p.deltaT }))
    }
  ];

  // Series C: Voltage V
  const seriesC: SeriesConfig[] = [
    {
      key: 'voltage',
      name: '발생 전압 V',
      color: '#F59E0B',
      unit: 'V',
      data: dataPoints.map(p => ({ x: p.relativeTimeSec, y: p.voltage }))
    }
  ];

  // Series D: Seebeck alpha_eff
  const seriesD: SeriesConfig[] = [
    {
      key: 'alpha',
      name: '순간 유효 제벡 계수 (α_eff)',
      color: '#10B981',
      unit: 'V/K',
      data: dataPoints.map(p => ({ x: p.relativeTimeSec, y: p.alpha }))
    }
  ];

  return (
    <div className="space-y-4">
      {/* View Switcher Sub-nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'all' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            전체 그래프 동시 보기
          </button>
          <button
            onClick={() => setActiveTab('A')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'A' ? 'bg-red-50 text-red-700 font-semibold border border-red-200' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            그래프 A: 온도 (Th, Tc)
          </button>
          <button
            onClick={() => setActiveTab('B')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'B' ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            그래프 B: 온도차 (ΔT)
          </button>
          <button
            onClick={() => setActiveTab('C')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'C' ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            그래프 C: 발생 전압 (V)
          </button>
          <button
            onClick={() => setActiveTab('D')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'D' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            그래프 D: 유효 제벡 (α)
          </button>
          <button
            onClick={() => setActiveTab('E')}
            className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'E' ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            그래프 E: V-ΔT 회귀 분석
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500">
          표본 수: <strong className="text-slate-900">{dataPoints.length}</strong> points
        </div>
      </div>

      {/* Grid or Single View */}
      {activeTab === 'all' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InteractiveLineChart
              title="그래프 A: 시간에 따른 온도 변화 (Th vs Tc)"
              subtitle="고온부(빨강) 및 저온부(파랑) 열전대 실시간 측정값"
              series={seriesA}
              xLabel="경과 시간 (s)"
              yLabel="온도 (°C)"
              timeWindow={timeWindow}
              onTimeWindowChange={setTimeWindow}
            />
            <InteractiveLineChart
              title="그래프 B: 시간에 따른 양면 온도차 변화 (ΔT)"
              subtitle="ΔT = Th - Tc (열전 발전의 구동력)"
              series={seriesB}
              xLabel="경과 시간 (s)"
              yLabel="온도차 ΔT (°C)"
              timeWindow={timeWindow}
              onTimeWindowChange={setTimeWindow}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InteractiveLineChart
              title="그래프 C: 시간에 따른 발생 전압 변화 (V)"
              subtitle="ADS1115 ADC를 통해 측정된 열전소자 개방 전압"
              series={seriesC}
              xLabel="경과 시간 (s)"
              yLabel="전압 V (V)"
              timeWindow={timeWindow}
              onTimeWindowChange={setTimeWindow}
            />
            <InteractiveLineChart
              title="그래프 D: 시간에 따른 순간 유효 제벡 계수 변화 (α_eff)"
              subtitle="α_eff = V / ΔT (온도차 0.5°C 미만 시 계산 보류)"
              series={seriesD}
              xLabel="경과 시간 (s)"
              yLabel="제벡 계수 α (V/K)"
              timeWindow={timeWindow}
              onTimeWindowChange={setTimeWindow}
            />
          </div>

          {/* Graph E as a wide prominent card */}
          <div>
            <ScatterRegressionChart points={dataPoints} />
          </div>
        </div>
      ) : activeTab === 'A' ? (
        <InteractiveLineChart
          title="그래프 A: 시간에 따른 온도 변화 (Th vs Tc)"
          subtitle="고온부(빨강) 및 저온부(파랑) 열전대 실시간 측정값"
          series={seriesA}
          xLabel="경과 시간 (s)"
          yLabel="온도 (°C)"
          height={400}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
        />
      ) : activeTab === 'B' ? (
        <InteractiveLineChart
          title="그래프 B: 시간에 따른 양면 온도차 변화 (ΔT)"
          subtitle="ΔT = Th - Tc (열전 발전의 구동력)"
          series={seriesB}
          xLabel="경과 시간 (s)"
          yLabel="온도차 ΔT (°C)"
          height={400}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
        />
      ) : activeTab === 'C' ? (
        <InteractiveLineChart
          title="그래프 C: 시간에 따른 발생 전압 변화 (V)"
          subtitle="ADS1115 ADC를 통해 측정된 열전소자 개방 전압"
          series={seriesC}
          xLabel="경과 시간 (s)"
          yLabel="전압 V (V)"
          height={400}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
        />
      ) : activeTab === 'D' ? (
        <InteractiveLineChart
          title="그래프 D: 시간에 따른 순간 유효 제벡 계수 변화 (α_eff)"
          subtitle="α_eff = V / ΔT (온도차 0.5°C 미만 시 계산 보류)"
          series={seriesD}
          xLabel="경과 시간 (s)"
          yLabel="제벡 계수 α (V/K)"
          height={400}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
        />
      ) : (
        <ScatterRegressionChart points={dataPoints} height={420} />
      )}
    </div>
  );
};
