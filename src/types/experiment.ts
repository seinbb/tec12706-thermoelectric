export interface RawDataPoint {
  rawTimeMs: number;
  th: number;
  tc: number;
  voltage: number;
}

export interface CalculatedDataPoint {
  id: string;
  rawTimeMs: number;
  relativeTimeSec: number;
  th: number;
  tc: number;
  deltaT: number;
  tAvg: number;
  voltage: number;
  alpha: number | null; // V/K, null if deltaT is near 0
  isLowDeltaT: boolean;
  timestamp: number;
}

export interface RunSummaryStats {
  count: number;
  durationSec: number;
  avgTh: number;
  avgTc: number;
  avgDeltaT: number;
  avgTAvg: number;
  avgVoltage: number;
  avgAlpha: number | null;
  maxDeltaT: number;
  maxVoltage: number;
  regressionSlope: number; // Estimated alpha from V vs deltaT
  regressionIntercept: number;
  regressionR2: number;
}

export interface ExperimentRun {
  id: string;
  name: string;
  conditionLabel: string; // e.g. "저온 평균 (냉각)", "상온 평균 (보통)", "고온 평균 (온수)"
  notes?: string;
  createdAt: number;
  dataPoints: CalculatedDataPoint[];
  stats: RunSummaryStats;
  sourceType: 'serial' | 'file' | 'simulation';
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'simulating';

export interface SerialConfig {
  baudRate: number;
  delimiter: string;
  timeColIndex: number;
  thColIndex: number;
  tcColIndex: number;
  voltColIndex: number;
  timeUnit: 'ms' | 's';
  minDeltaTThreshold: number; // default 0.5 °C for alpha calculation
}

export interface ComparativeConditionStats {
  runId: string;
  runName: string;
  conditionLabel: string;
  matchedPointCount: number;
  meanTAvg: number;
  meanDeltaT: number;
  meanVoltage: number;
  meanAlpha: number | null;
  stdVoltage: number;
}
