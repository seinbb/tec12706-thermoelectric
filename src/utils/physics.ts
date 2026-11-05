import { RawDataPoint, CalculatedDataPoint, RunSummaryStats } from '../types/experiment';

export interface ParseResult {
  point: CalculatedDataPoint | null;
  rawString: string;
  isValid: boolean;
  errorCode?: string;
  errorDetail?: string;
}

export interface RegressionResult {
  slope: number;       // Linear regression slope (alpha_reg, V/K or V/°C)
  intercept: number;   // Intercept (V)
  r2: number;          // Coefficient of determination
  pointCount: number;
}

/**
 * Validate sensor hardware values against physical reality:
 * MAX6675 range: 0°C to 1024°C (TEC experiments typically operate between -10°C to 150°C)
 * ADS1115 TEC1-12706 Seebeck voltage range: typically -2.5V to +3.5V
 */
export function validateSensorValues(
  rawTimeMs: number,
  th: number,
  tc: number,
  voltage: number
): { isValid: boolean; errorReason?: string } {
  if (isNaN(rawTimeMs) || !isFinite(rawTimeMs) || rawTimeMs < 0) {
    return { isValid: false, errorReason: '비정상 시간 타임스탬프 (millis)' };
  }
  if (isNaN(th) || !isFinite(th)) {
    return { isValid: false, errorReason: '고온부 온도(Th) 센서 누락 또는 NaN' };
  }
  if (isNaN(tc) || !isFinite(tc)) {
    return { isValid: false, errorReason: '저온부 온도(Tc) 센서 누락 또는 NaN' };
  }
  if (isNaN(voltage) || !isFinite(voltage)) {
    return { isValid: false, errorReason: '전압(V) ADC 데이터 누락 또는 NaN' };
  }

  // MAX6675 open thermocouple or hardware disconnected indicator
  // MAX6675 often returns 1024.0°C or 0.0°C when disconnected
  if (th > 250 || th < -30) {
    return { isValid: false, errorReason: `Th 측정 범위 초과 (${th.toFixed(1)}°C, 센서 접촉 확인)` };
  }
  if (tc > 250 || tc < -30) {
    return { isValid: false, errorReason: `Tc 측정 범위 초과 (${tc.toFixed(1)}°C, 센서 접촉 확인)` };
  }

  // TEC1-12706 Seebeck voltage threshold check (unlikely to exceed 5V in typical lab beakers)
  if (voltage > 5.0 || voltage < -5.0) {
    return { isValid: false, errorReason: `ADC 전압 측정 한계 초과 (${voltage.toFixed(3)}V)` };
  }

  return { isValid: true };
}

/**
 * Parse a raw CSV line from Arduino or CSV file
 */
export function parseCsvLine(
  line: string,
  startMillis: number | null,
  delimiter = ',',
  colIndices = { time: 0, th: 1, tc: 2, volt: 3 },
  timeUnit: 'ms' | 's' = 'ms',
  minDeltaTThreshold = 0.5
): ParseResult {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('time') || trimmed.toLowerCase().startsWith('시간')) {
    return { point: null, rawString: line, isValid: false, errorCode: 'HEADER_OR_EMPTY' };
  }

  const parts = trimmed.split(delimiter).map(p => p.trim());
  const maxIdx = Math.max(colIndices.time, colIndices.th, colIndices.tc, colIndices.volt);

  if (parts.length <= maxIdx) {
    return {
      point: null,
      rawString: line,
      isValid: false,
      errorCode: 'INSUFFICIENT_COLUMNS',
      errorDetail: `열 개수 부족 (필요: ${maxIdx + 1}개 이상, 현재: ${parts.length}개)`
    };
  }

  const rawTimeStr = parts[colIndices.time];
  const thStr = parts[colIndices.th];
  const tcStr = parts[colIndices.tc];
  const voltStr = parts[colIndices.volt];

  const rawTimeVal = Number(rawTimeStr);
  const th = Number(thStr);
  const tc = Number(tcStr);
  const voltage = Number(voltStr);

  const rawTimeMs = timeUnit === 's' ? rawTimeVal * 1000 : rawTimeVal;

  const validation = validateSensorValues(rawTimeMs, th, tc, voltage);
  if (!validation.isValid) {
    return {
      point: null,
      rawString: line,
      isValid: false,
      errorCode: 'SENSOR_ANOMALY',
      errorDetail: validation.errorReason
    };
  }

  // Relative time calculation
  const referenceStart = startMillis ?? rawTimeMs;
  const relativeTimeSec = Math.max(0, (rawTimeMs - referenceStart) / 1000);

  // Physical calculations
  const deltaT = th - tc;
  const tAvg = (th + tc) / 2;

  // Safe effective Seebeck coefficient alpha_eff = V / deltaT
  const isLowDeltaT = Math.abs(deltaT) < minDeltaTThreshold;
  const alpha = isLowDeltaT ? null : voltage / deltaT;

  const point: CalculatedDataPoint = {
    id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    rawTimeMs,
    relativeTimeSec: Number(relativeTimeSec.toFixed(2)),
    th: Number(th.toFixed(2)),
    tc: Number(tc.toFixed(2)),
    deltaT: Number(deltaT.toFixed(2)),
    tAvg: Number(tAvg.toFixed(2)),
    voltage: Number(voltage.toFixed(4)),
    alpha: alpha !== null ? Number(alpha.toFixed(5)) : null,
    isLowDeltaT,
    timestamp: Date.now()
  };

  return { point, rawString: line, isValid: true };
}

/**
 * Linear regression using Ordinary Least Squares on (deltaT, voltage)
 * Formula: V = slope * deltaT + intercept
 */
export function calculateLinearRegression(points: CalculatedDataPoint[]): RegressionResult {
  // Filter out invalid or zero deltaT points
  const validPoints = points.filter(p => !p.isLowDeltaT && isFinite(p.deltaT) && isFinite(p.voltage));
  const n = validPoints.length;

  if (n < 2) {
    return { slope: 0, intercept: 0, r2: 0, pointCount: n };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = validPoints[i].deltaT;
    const y = validPoints[i].voltage;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) {
    return { slope: 0, intercept: 0, r2: 0, pointCount: n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R^2 (Coefficient of Determination)
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const x = validPoints[i].deltaT;
    const y = validPoints[i].voltage;
    const yPred = slope * x + intercept;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - yPred, 2);
  }

  const r2 = ssTot > 1e-12 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  return {
    slope: Number(slope.toFixed(5)),
    intercept: Number(intercept.toFixed(4)),
    r2: Number(r2.toFixed(4)),
    pointCount: n
  };
}

/**
 * Compute summary statistics for an experiment run
 */
export function computeRunStats(points: CalculatedDataPoint[]): RunSummaryStats {
  if (points.length === 0) {
    return {
      count: 0,
      durationSec: 0,
      avgTh: 0,
      avgTc: 0,
      avgDeltaT: 0,
      avgTAvg: 0,
      avgVoltage: 0,
      avgAlpha: null,
      maxDeltaT: 0,
      maxVoltage: 0,
      regressionSlope: 0,
      regressionIntercept: 0,
      regressionR2: 0
    };
  }

  const count = points.length;
  const durationSec = points[count - 1].relativeTimeSec - points[0].relativeTimeSec;

  let sumTh = 0;
  let sumTc = 0;
  let sumDeltaT = 0;
  let sumTAvg = 0;
  let sumVolt = 0;
  let sumAlpha = 0;
  let alphaCount = 0;
  let maxDeltaT = -Infinity;
  let maxVoltage = -Infinity;

  for (let i = 0; i < count; i++) {
    const p = points[i];
    sumTh += p.th;
    sumTc += p.tc;
    sumDeltaT += p.deltaT;
    sumTAvg += p.tAvg;
    sumVolt += p.voltage;
    if (p.alpha !== null && !p.isLowDeltaT) {
      sumAlpha += p.alpha;
      alphaCount++;
    }
    if (p.deltaT > maxDeltaT) maxDeltaT = p.deltaT;
    if (p.voltage > maxVoltage) maxVoltage = p.voltage;
  }

  const reg = calculateLinearRegression(points);

  return {
    count,
    durationSec: Math.max(0, Number(durationSec.toFixed(1))),
    avgTh: Number((sumTh / count).toFixed(2)),
    avgTc: Number((sumTc / count).toFixed(2)),
    avgDeltaT: Number((sumDeltaT / count).toFixed(2)),
    avgTAvg: Number((sumTAvg / count).toFixed(2)),
    avgVoltage: Number((sumVolt / count).toFixed(4)),
    avgAlpha: alphaCount > 0 ? Number((sumAlpha / alphaCount).toFixed(5)) : null,
    maxDeltaT: maxDeltaT === -Infinity ? 0 : Number(maxDeltaT.toFixed(2)),
    maxVoltage: maxVoltage === -Infinity ? 0 : Number(maxVoltage.toFixed(4)),
    regressionSlope: reg.slope,
    regressionIntercept: reg.intercept,
    regressionR2: reg.r2
  };
}

/**
 * Filter points by deltaT range for comparative analysis
 */
export function filterPointsByDeltaT(
  points: CalculatedDataPoint[],
  targetDeltaT: number,
  tolerance: number
): CalculatedDataPoint[] {
  const minVal = targetDeltaT - tolerance;
  const maxVal = targetDeltaT + tolerance;
  return points.filter(p => p.deltaT >= minVal && p.deltaT <= maxVal && !p.isLowDeltaT);
}

/**
 * Compute condition statistics for comparative research
 */
export function computeConditionStats(
  points: CalculatedDataPoint[]
): { meanTAvg: number; meanDeltaT: number; meanVoltage: number; meanAlpha: number | null; stdVoltage: number } {
  if (points.length === 0) {
    return { meanTAvg: 0, meanDeltaT: 0, meanVoltage: 0, meanAlpha: null, stdVoltage: 0 };
  }

  const n = points.length;
  let sumTAvg = 0;
  let sumDeltaT = 0;
  let sumVolt = 0;
  let sumAlpha = 0;
  let alphaCount = 0;

  for (const p of points) {
    sumTAvg += p.tAvg;
    sumDeltaT += p.deltaT;
    sumVolt += p.voltage;
    if (p.alpha !== null) {
      sumAlpha += p.alpha;
      alphaCount++;
    }
  }

  const meanTAvg = sumTAvg / n;
  const meanDeltaT = sumDeltaT / n;
  const meanVoltage = sumVolt / n;
  const meanAlpha = alphaCount > 0 ? sumAlpha / alphaCount : null;

  // Standard deviation of voltage
  let sumSqDiff = 0;
  for (const p of points) {
    sumSqDiff += Math.pow(p.voltage - meanVoltage, 2);
  }
  const stdVoltage = Math.sqrt(sumSqDiff / n);

  return {
    meanTAvg: Number(meanTAvg.toFixed(2)),
    meanDeltaT: Number(meanDeltaT.toFixed(2)),
    meanVoltage: Number(meanVoltage.toFixed(4)),
    meanAlpha: meanAlpha !== null ? Number(meanAlpha.toFixed(5)) : null,
    stdVoltage: Number(stdVoltage.toFixed(4))
  };
}
