import React, { useState } from 'react';
import { ConnectionStatus, SerialConfig } from '../../types/experiment';
import { serialManager } from '../../services/serialManager';
import { Cable, Play, Square, Settings, Upload, Terminal, AlertTriangle, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';

interface SerialConnectionPanelProps {
  connectionStatus: ConnectionStatus;
  config: SerialConfig;
  onConfigChange: (cfg: SerialConfig) => void;
  rawLogLines: { text: string; isValid: boolean; errorReason?: string; timestamp: number }[];
  onClearRawLogs: () => void;
  onConnectSerial: () => Promise<void>;
  onDisconnectSerial: () => Promise<void>;
  onStartSimulation: (preset: 'ice_hot' | 'ambient_hot' | 'cold_warm') => void;
  onStopSimulation: () => void;
  onCsvFileUpload: (file: File) => void;
  errorCount: number;
}

export const SerialConnectionPanel: React.FC<SerialConnectionPanelProps> = ({
  connectionStatus,
  config,
  onConfigChange,
  rawLogLines,
  onClearRawLogs,
  onConnectSerial,
  onDisconnectSerial,
  onStartSimulation,
  onStopSimulation,
  onCsvFileUpload,
  errorCount,
}) => {
  const isWebSerialSupported = serialManager.isWebSerialSupported();
  const [selectedBaud, setSelectedBaud] = useState(config.baudRate);
  const [simPreset, setSimPreset] = useState<'ice_hot' | 'ambient_hot' | 'cold_warm'>('ice_hot');
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      await onConnectSerial();
    } catch (err: any) {
      setConnectionError(err.message || '시리얼 포트 연결에 실패했습니다.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCsvFileUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Web Serial Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${connectionStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : connectionStatus === 'simulating' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">아두이노 USB 시리얼 통신 제어</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${connectionStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : connectionStatus === 'simulating' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                  {connectionStatus === 'connected' ? '● 하드웨어 연결됨' : connectionStatus === 'simulating' ? '▲ 가상 시뮬레이션 중' : '○ 연결 대기 중'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Arduino UNO를 컴퓨터 USB에 연결하고 포트를 선택하여 MAX6675 및 ADS1115 센서 신호를 직접 수신합니다.
              </p>
            </div>
          </div>

          {/* Connect / Disconnect Buttons */}
          <div className="flex items-center gap-2.5">
            {connectionStatus === 'disconnected' ? (
              <>
                <button
                  onClick={handleConnect}
                  disabled={!isWebSerialSupported || isConnecting}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs ${isWebSerialSupported ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed'}`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isConnecting ? '포트 검색 중...' : '시리얼 포트 연결'}
                </button>
              </>
            ) : connectionStatus === 'connected' ? (
              <button
                onClick={onDisconnectSerial}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                시리얼 연결 해제
              </button>
            ) : (
              <button
                onClick={onStopSimulation}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                시뮬레이션 중단
              </button>
            )}

            <button
              onClick={() => setShowConfigDetails(!showConfigDetails)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>통신 포맷 설정</span>
            </button>
          </div>
        </div>

        {/* Browser compatibility warning */}
        {!isWebSerialSupported && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Web Serial API 미지원 브라우저:</strong> 현재 브라우저 환경에서는 USB 시리얼 직접 연결이 제한됩니다.
              Google Chrome 또는 Microsoft Edge 최신 버전 브라우저를 이용하시거나, 아래의 <strong>CSV 파일 업로드</strong> 또는 <strong>가상 시뮬레이션</strong> 모드를 이용해 주세요.
            </div>
          </div>
        )}

        {connectionError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center justify-between">
            <span><strong>연결 오류:</strong> {connectionError}</span>
            <button onClick={() => setConnectionError(null)} className="text-rose-600 hover:underline">닫기</button>
          </div>
        )}
      </div>

      {/* Communication Protocol & Column Mapping Config (Collapsible) */}
      {showConfigDetails && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">시리얼 수신 데이터 포맷 및 파싱 설정</h4>
            <span className="text-xs font-mono text-slate-500">기본 포맷: millis,Th,Tc,V</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-600 font-medium mb-1">통신 속도 (Baud Rate)</label>
              <select
                value={config.baudRate}
                onChange={e => onConfigChange({ ...config, baudRate: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={115200}>115200 baud (권장)</option>
                <option value={57600}>57600 baud</option>
                <option value={9600}>9600 baud</option>
                <option value={230400}>230400 baud</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">구분자 (Delimiter)</label>
              <select
                value={config.delimiter}
                onChange={e => onConfigChange({ ...config, delimiter: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value=",">쉼표 ( , )</option>
                <option value="\t">탭 ( Tab )</option>
                <option value=" ">공백 ( Space )</option>
                <option value=";">세미콜론 ( ; )</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">시간 단위</label>
              <select
                value={config.timeUnit}
                onChange={e => onConfigChange({ ...config, timeUnit: e.target.value as 'ms' | 's' })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ms">밀리초 (ms, Arduino millis)</option>
                <option value="s">초 (seconds)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">제벡 계산 최소 ΔT 한계 (°C)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={config.minDeltaTThreshold}
                onChange={e => onConfigChange({ ...config, minDeltaTThreshold: Math.max(0.1, Number(e.target.value)) })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-600 font-medium block mb-2">CSV 열 인덱스 매핑 (0부터 시작):</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block mb-0.5">시간 열 번호:</span>
                <input
                  type="number"
                  min="0"
                  value={config.timeColIndex}
                  onChange={e => onConfigChange({ ...config, timeColIndex: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Th 고온 온도 열:</span>
                <input
                  type="number"
                  min="0"
                  value={config.thColIndex}
                  onChange={e => onConfigChange({ ...config, thColIndex: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Tc 저온 온도 열:</span>
                <input
                  type="number"
                  min="0"
                  value={config.tcColIndex}
                  onChange={e => onConfigChange({ ...config, tcColIndex: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">전압(V) 열:</span>
                <input
                  type="number"
                  min="0"
                  value={config.voltColIndex}
                  onChange={e => onConfigChange({ ...config, voltColIndex: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Input Sources: Simulation & CSV File Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Realistic Thermoelectric Simulation Generator */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>가상 열전 실험 시뮬레이션 (검증 및 사전 실습용)</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            실제 아두이노 장비가 없을 때 TEC1-12706 물리 열전도 및 비커 냉각 모델을 기반으로 한 가상 센서 신호를 발생시킵니다.
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono">
              <label className="text-slate-600 font-medium shrink-0">실험 조건 프리셋:</label>
              <select
                value={simPreset}
                onChange={e => setSimPreset(e.target.value as any)}
                disabled={connectionStatus === 'connected' || connectionStatus === 'simulating'}
                className="flex-1 bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800"
              >
                <option value="ice_hot">조건 1: 얼음물(5℃) & 온수(75℃) [ΔT 70℃, Tavg 40℃]</option>
                <option value="ambient_hot">조건 2: 상온수(26℃) & 온수(75℃) [ΔT 49℃, Tavg 50.5℃]</option>
                <option value="cold_warm">조건 3: 냉수(10℃) & 미온수(48℃) [ΔT 38℃, Tavg 29℃]</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {connectionStatus !== 'simulating' ? (
                <button
                  onClick={() => onStartSimulation(simPreset)}
                  disabled={connectionStatus === 'connected'}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors shadow-xs ${connectionStatus === 'connected' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  가상 실험 데이터 스트리밍 시작
                </button>
              ) : (
                <button
                  onClick={onStopSimulation}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors shadow-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  가상 시뮬레이션 정지
                </button>
              )}
            </div>
            <span className="block text-[11px] text-amber-700">
              * 가상 데이터는 실제 측정값과 구별되도록 [가상 데이터] 라벨이 부여됩니다.
            </span>
          </div>
        </div>

        {/* Card 2: CSV File Upload Fallback */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>기존 실험 CSV 파일 업로드 및 분석</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              이전에 아두이노 시리얼 모니터나 본 앱에서 저장한 CSV 데이터 파일을 불러와 즉시 물리량 계산 및 회귀 분석을 실행합니다.
            </p>
          </div>

          <div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-3 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/50">
              <Upload className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-700">CSV 파일 선택 또는 여기로 드래그</span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5">.csv 형식 지원</span>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Real-time Raw Serial Log Monitor */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs shadow-md">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>아두이노 원본 시리얼 수신 터미널 (Raw Log Monitor)</span>
            <span className="text-[11px] text-slate-500">최근 {rawLogLines.length}개 라인</span>
          </div>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="text-[11px] text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                이상 신호 누적: {errorCount}건
              </span>
            )}
            <button
              onClick={onClearRawLogs}
              className="px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              로그 지우기
            </button>
          </div>
        </div>

        {/* Console scroll window */}
        <div className="h-44 overflow-y-auto space-y-1 pr-1 text-[11px]">
          {rawLogLines.length === 0 ? (
            <div className="text-slate-600 italic py-4 text-center">
              수신된 시리얼 데이터가 없습니다. 아두이노를 연결하거나 시뮬레이션을 시작해 주세요.
            </div>
          ) : (
            rawLogLines.map((log, idx) => (
              <div
                key={idx}
                className={`flex items-start justify-between gap-2 px-1.5 py-0.5 rounded ${log.isValid ? 'text-emerald-400/90 hover:bg-slate-900' : 'text-rose-400 bg-rose-950/30'}`}
              >
                <span className="truncate">{log.text}</span>
                {!log.isValid && log.errorReason && (
                  <span className="text-rose-300 text-[10px] shrink-0 font-sans">
                    [오류: {log.errorReason}]
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
