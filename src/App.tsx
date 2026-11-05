/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CalculatedDataPoint,
  ExperimentRun,
  ConnectionStatus,
  SerialConfig,
  RunSummaryStats
} from './types/experiment';
import { parseCsvLine, computeRunStats } from './utils/physics';
import { serialManager } from './services/serialManager';

import { TelemetryCards } from './components/dashboard/TelemetryCards';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { SerialConnectionPanel } from './components/connection/SerialConnectionPanel';
import { RealtimeChartsTab } from './components/charts/RealtimeChartsTab';
import { DataTablePanel } from './components/table/DataTablePanel';
import { ComparativeAnalysisPanel } from './components/comparative/ComparativeAnalysisPanel';
import { HardwareGuidePanel } from './components/hardware/HardwareGuidePanel';

import {
  Activity,
  Cable,
  BarChart2,
  Table,
  Layers,
  BookOpen,
  Play,
  Square,
  AlertCircle,
  Download,
  RotateCcw
} from 'lucide-react';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'serial' | 'charts' | 'table' | 'comparison' | 'guide'>('dashboard');

  // Connection & Recording State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [sourceType, setSourceType] = useState<'serial' | 'file' | 'simulation'>('serial');

  // Active Experiment Measurement Data
  const [dataPoints, setDataPoints] = useState<CalculatedDataPoint[]>([]);
  const [startMillis, setStartMillis] = useState<number | null>(null);

  // Raw serial logging & error telemetry
  const [rawLogLines, setRawLogLines] = useState<{ text: string; isValid: boolean; errorReason?: string; timestamp: number }[]>([]);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [lastErrorReason, setLastErrorReason] = useState<string | undefined>(undefined);

  // Serial configuration
  const [serialConfig, setSerialConfig] = useState<SerialConfig>({
    baudRate: 115200,
    delimiter: ',',
    timeColIndex: 0,
    thColIndex: 1,
    tcColIndex: 2,
    voltColIndex: 3,
    timeUnit: 'ms',
    minDeltaTThreshold: 0.5
  });

  // Saved Comparative Runs (Stored in Session Memory)
  const [savedRuns, setSavedRuns] = useState<ExperimentRun[]>([]);

  // Refs to maintain live state in asynchronous serial event handlers
  const startMillisRef = useRef<number | null>(null);
  startMillisRef.current = startMillis;

  const isRecordingRef = useRef<boolean>(true);
  isRecordingRef.current = isRecording;

  const serialConfigRef = useRef<SerialConfig>(serialConfig);
  serialConfigRef.current = serialConfig;

  // Computed summary statistics of the active run
  const stats: RunSummaryStats = React.useMemo(() => {
    return computeRunStats(dataPoints);
  }, [dataPoints]);

  const currentPoint = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : null;

  // Handle incoming line from Arduino or Simulator
  const handleIncomingLine = useCallback((line: string) => {
    const cfg = serialConfigRef.current;
    const currentT0 = startMillisRef.current;

    const parseResult = parseCsvLine(
      line,
      currentT0,
      cfg.delimiter,
      {
        time: cfg.timeColIndex,
        th: cfg.thColIndex,
        tc: cfg.tcColIndex,
        volt: cfg.voltColIndex
      },
      cfg.timeUnit,
      cfg.minDeltaTThreshold
    );

    // Keep last 40 raw logs for inspector
    setRawLogLines(prev => [
      ...prev.slice(-39),
      {
        text: line,
        isValid: parseResult.isValid,
        errorReason: parseResult.errorDetail,
        timestamp: Date.now()
      }
    ]);

    if (!parseResult.isValid) {
      if (parseResult.errorCode && parseResult.errorCode !== 'HEADER_OR_EMPTY') {
        setErrorCount(c => c + 1);
        setLastErrorReason(parseResult.errorDetail);
      }
      return;
    }

    if (!isRecordingRef.current) {
      return; // Discard data points when recording is paused
    }

    const newPt = parseResult.point!;

    // Set t0 reference if not set yet
    if (startMillisRef.current === null) {
      setStartMillis(newPt.rawTimeMs);
      startMillisRef.current = newPt.rawTimeMs;
      newPt.relativeTimeSec = 0;
    }

    setDataPoints(prev => {
      // Limit in-memory buffer to last 4000 points to keep smooth 60fps rendering
      const next = prev.length > 4000 ? prev.slice(-3500) : prev;
      return [...next, newPt];
    });
  }, []);

  // Subscribe to serialManager events
  useEffect(() => {
    const unsubData = serialManager.addDataListener(handleIncomingLine);
    const unsubError = serialManager.addErrorListener(err => {
      setErrorCount(c => c + 1);
      setLastErrorReason(err);
      setConnectionStatus('error');
    });
    const unsubDisconnect = serialManager.addDisconnectListener(() => {
      setConnectionStatus('disconnected');
    });

    return () => {
      unsubData();
      unsubError();
      unsubDisconnect();
    };
  }, [handleIncomingLine]);

  // Serial Connect handler
  const handleConnectSerial = async () => {
    try {
      setConnectionStatus('connecting');
      await serialManager.connect(serialConfig.baudRate);
      setConnectionStatus('connected');
      setSourceType('serial');
    } catch (err: any) {
      setConnectionStatus('disconnected');
      throw err;
    }
  };

  // Serial Disconnect handler
  const handleDisconnectSerial = async () => {
    await serialManager.disconnect();
    setConnectionStatus('disconnected');
  };

  // Start Simulation handler
  const handleStartSimulation = (preset: 'ice_hot' | 'ambient_hot' | 'cold_warm') => {
    serialManager.startSimulation(preset);
    setConnectionStatus('simulating');
    setSourceType('simulation');
  };

  // Stop Simulation handler
  const handleStopSimulation = () => {
    serialManager.stopSimulation();
    setConnectionStatus('disconnected');
  };

  // Reset current experiment data
  const handleResetData = () => {
    setDataPoints([]);
    setStartMillis(null);
    startMillisRef.current = null;
    setErrorCount(0);
    setLastErrorReason(undefined);
  };

  // Save current experiment run to session comparative memory
  const handleSaveCurrentRun = (label: string, notes?: string) => {
    if (dataPoints.length === 0) return;

    const newRun: ExperimentRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: label,
      conditionLabel: label,
      notes,
      createdAt: Date.now(),
      dataPoints: [...dataPoints],
      stats: { ...stats },
      sourceType
    };

    setSavedRuns(prev => [...prev, newRun]);
  };

  // Delete a saved run
  const handleDeleteRun = (id: string) => {
    setSavedRuns(prev => prev.filter(r => r.id !== id));
  };

  // CSV Download export
  const handleDownloadCsv = () => {
    if (dataPoints.length === 0) return;

    const headers = [
      '시간(s)',
      '아두이노_millis',
      '고온부_Th(C)',
      '저온부_Tc(C)',
      '온도차_DeltaT(C)',
      '평균온도_Tavg(C)',
      '발생전압_V(V)',
      '순간유효제벡_alpha_eff(V/K)',
      '온도차부족여부'
    ];

    const rows = dataPoints.map(p => [
      p.relativeTimeSec.toFixed(2),
      p.rawTimeMs,
      p.th.toFixed(2),
      p.tc.toFixed(2),
      p.deltaT.toFixed(2),
      p.tAvg.toFixed(2),
      p.voltage.toFixed(4),
      p.alpha !== null ? p.alpha.toFixed(5) : 'LOW_DELTAT',
      p.isLowDeltaT ? '1' : '0'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TEC1-12706_실험데이터_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV File Upload import
  const handleCsvFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const parsedPoints: CalculatedDataPoint[] = [];
      let customStart: number | null = null;
      let rejected = 0;

      for (const line of lines) {
        const res = parseCsvLine(
          line,
          customStart,
          serialConfig.delimiter,
          {
            time: serialConfig.timeColIndex,
            th: serialConfig.thColIndex,
            tc: serialConfig.tcColIndex,
            volt: serialConfig.voltColIndex
          },
          serialConfig.timeUnit,
          serialConfig.minDeltaTThreshold
        );

        if (res.isValid && res.point) {
          if (customStart === null) {
            customStart = res.point.rawTimeMs;
            res.point.relativeTimeSec = 0;
          }
          parsedPoints.push(res.point);
        } else if (res.errorCode && res.errorCode !== 'HEADER_OR_EMPTY') {
          rejected++;
        }
      }

      if (parsedPoints.length > 0) {
        setDataPoints(parsedPoints);
        setStartMillis(customStart);
        startMillisRef.current = customStart;
        setSourceType('file');
        setConnectionStatus('disconnected');
        alert(`CSV 파일로부터 ${parsedPoints.length}개의 측정 데이터를 성공적으로 불러왔습니다.${rejected > 0 ? ` (비정상 행 ${rejected}개 제외됨)` : ''}`);
      } else {
        alert('CSV 파일에서 유효한 센서 측정값을 찾을 수 없습니다. 파일 형식(시간,Th,Tc,V)을 확인해 주세요.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Universal Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav Links) - Zone 3 (Primary Action) */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <Activity className="w-5 h-5 text-indigo-400" />
            <span className="text-base font-bold tracking-tight text-white">
              TEC1-12706 열전소자 분석기
            </span>
          </div>

          {/* Zone 2: Navigation Links (Single-line, no two-line wrapping) */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'dashboard' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              실험 대시보드
            </button>
            <button
              onClick={() => setActiveTab('serial')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'serial' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              아두이노 연결
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'charts' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              실시간 그래프
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'table' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              데이터 테이블
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'comparison' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              실험 비교 분석
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${activeTab === 'guide' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              아두이노 코드/배선
            </button>
          </nav>

          {/* Zone 3: Primary Action & Status */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Connection Status Badge */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : connectionStatus === 'simulating' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`}
              />
              <span className="hidden sm:inline text-slate-300">
                {connectionStatus === 'connected' ? '하드웨어 연결됨' : connectionStatus === 'simulating' ? '가상 시뮬레이션' : '미연결'}
              </span>
            </div>

            {/* Quick Action Button */}
            {connectionStatus === 'disconnected' ? (
              <button
                onClick={() => setActiveTab('serial')}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                포트 연결하기
              </button>
            ) : (
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs ${isRecording ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {isRecording ? '측정 일시정지' : '측정 재개'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Scroll Bar */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-slate-800 text-xs">
          <button onClick={() => setActiveTab('dashboard')} className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>대시보드</button>
          <button onClick={() => setActiveTab('serial')} className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'serial' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>연결</button>
          <button onClick={() => setActiveTab('charts')} className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'charts' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>그래프</button>
          <button onClick={() => setActiveTab('table')} className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>테이블</button>
          <button onClick={() => setActiveTab('comparison')} className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'comparison' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>비교 분석</button>
          <button onClick={() => setActiveTab('guide')} className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === 'guide' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>아두이노 코드</button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Real-time Telemetry KPI Cards (always visible on top) */}
        <TelemetryCards
          currentPoint={currentPoint}
          connectionStatus={connectionStatus}
          isRecording={isRecording}
          stats={stats}
          sourceType={sourceType}
          errorCount={errorCount}
          lastErrorReason={lastErrorReason}
        />

        {/* Tab View Routing */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            dataPoints={dataPoints}
            stats={stats}
            connectionStatus={connectionStatus}
            isRecording={isRecording}
            onToggleRecording={() => setIsRecording(!isRecording)}
            onResetData={handleResetData}
            onNavigateTab={key => setActiveTab(key as any)}
          />
        )}

        {activeTab === 'serial' && (
          <SerialConnectionPanel
            connectionStatus={connectionStatus}
            config={serialConfig}
            onConfigChange={setSerialConfig}
            rawLogLines={rawLogLines}
            onClearRawLogs={() => setRawLogLines([])}
            onConnectSerial={handleConnectSerial}
            onDisconnectSerial={handleDisconnectSerial}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
            onCsvFileUpload={handleCsvFileUpload}
            errorCount={errorCount}
          />
        )}

        {activeTab === 'charts' && (
          <RealtimeChartsTab dataPoints={dataPoints} />
        )}

        {activeTab === 'table' && (
          <DataTablePanel
            dataPoints={dataPoints}
            stats={stats}
            onClearData={handleResetData}
            onDownloadCsv={handleDownloadCsv}
            sourceType={sourceType}
          />
        )}

        {activeTab === 'comparison' && (
          <ComparativeAnalysisPanel
            currentPoints={dataPoints}
            currentStats={stats}
            currentSourceType={sourceType}
            savedRuns={savedRuns}
            onSaveCurrentRun={handleSaveCurrentRun}
            onDeleteRun={handleDeleteRun}
          />
        )}

        {activeTab === 'guide' && (
          <HardwareGuidePanel />
        )}
      </main>

      {/* Laboratory Precision Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2">
          <span>TEC1-12706 열전소자 제벡 효과 실험 데이터 분석 플랫폼</span>
          <span>·</span>
          <span>MAX6675 SPI (Th/Tc)</span>
          <span>·</span>
          <span>ADS1115 ADC (V)</span>
        </div>
        <div className="text-slate-400">
          단위 표기: Th, Tc, ΔT, Tavg (°C) · V (V) · α (V/K)
        </div>
      </footer>
    </div>
  );
}
