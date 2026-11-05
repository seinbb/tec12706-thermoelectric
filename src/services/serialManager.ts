/**
 * Web Serial API and Physical Experiment Simulator Manager
 */

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export type SerialDataListener = (line: string) => void;
export type SerialErrorListener = (err: string) => void;
export type SerialDisconnectListener = () => void;

class SerialManager {
  private port: any = null;
  private reader: any = null;
  private keepReading = false;
  private buffer = '';
  private dataListeners: Set<SerialDataListener> = new Set();
  private errorListeners: Set<SerialErrorListener> = new Set();
  private disconnectListeners: Set<SerialDisconnectListener> = new Set();

  // Simulation state
  private isSimulating = false;
  private simTimer: any = null;
  private simMillis = 0;
  private simTh = 70.0;
  private simTc = 15.0;
  private simCoolRate = 0.04;
  private simWarmRate = 0.02;

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public addDataListener(listener: SerialDataListener) {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  public addErrorListener(listener: SerialErrorListener) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public addDisconnectListener(listener: SerialDisconnectListener) {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  private notifyData(line: string) {
    this.dataListeners.forEach(l => l(line));
  }

  private notifyError(err: string) {
    this.errorListeners.forEach(l => l(err));
  }

  private notifyDisconnect() {
    this.disconnectListeners.forEach(l => l());
  }

  /**
   * Request and connect to a Web Serial port
   */
  public async connect(baudRate = 115200): Promise<boolean> {
    if (!this.isWebSerialSupported()) {
      throw new Error('이 브라우저는 Web Serial API를 지원하지 않습니다. Chrome, Edge 또는 최신 브라우저를 사용해 주세요.');
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });
      this.keepReading = true;
      this.readSerialLoop();
      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('선택된 시리얼 포트가 없습니다.');
      }
      throw new Error(err.message || '시리얼 포트 연결 실패');
    }
  }

  /**
   * Disconnect the active serial port
   */
  public async disconnect(): Promise<void> {
    this.keepReading = false;

    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
      this.isSimulating = false;
    }

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // ignore cancellation error
      }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore close error
      }
      this.port = null;
    }

    this.notifyDisconnect();
  }

  public isConnected(): boolean {
    return this.port !== null && this.keepReading;
  }

  public isRunningSimulation(): boolean {
    return this.isSimulating;
  }

  /**
   * Continuous reading loop with string decoding and line buffering
   */
  private async readSerialLoop() {
    const textDecoder = new TextDecoder();
    while (this.port && this.port.readable && this.keepReading) {
      try {
        this.reader = this.port.readable.getReader();
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            const chunk = textDecoder.decode(value, { stream: true });
            this.buffer += chunk;
            const lines = this.buffer.split(/\r?\n/);
            // The last item is either empty or a partial line
            this.buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.length > 0) {
                this.notifyData(trimmed);
              }
            }
          }
        }
      } catch (err: any) {
        if (this.keepReading) {
          this.notifyError(`시리얼 수신 오류: ${err.message || '연결 끊김'}`);
        }
        break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch {
            // ignore
          }
          this.reader = null;
        }
      }
    }

    if (this.keepReading) {
      this.disconnect();
    }
  }

  /**
   * Start realistic thermoelectric simulation for classroom testing
   * Preset options:
   * 1. 'ice_hot': Th=75°C, Tc=5°C (Large DeltaT, moderate Tavg ~40°C)
   * 2. 'ambient_hot': Th=75°C, Tc=25°C (Moderate DeltaT, higher Tavg ~50°C)
   * 3. 'cold_warm': Th=45°C, Tc=10°C (Moderate DeltaT, lower Tavg ~27.5°C)
   */
  public startSimulation(preset: 'ice_hot' | 'ambient_hot' | 'cold_warm' = 'ice_hot') {
    if (this.isConnected()) {
      throw new Error('실제 하드웨어가 연결되어 있는 동안에는 가상 시뮬레이션을 시작할 수 없습니다.');
    }

    if (this.simTimer) {
      clearInterval(this.simTimer);
    }

    if (preset === 'ice_hot') {
      this.simTh = 75.0;
      this.simTc = 5.0;
      this.simCoolRate = 0.05;
      this.simWarmRate = 0.03;
    } else if (preset === 'ambient_hot') {
      this.simTh = 75.0;
      this.simTc = 26.0;
      this.simCoolRate = 0.04;
      this.simWarmRate = 0.01;
    } else {
      this.simTh = 48.0;
      this.simTc = 10.0;
      this.simCoolRate = 0.03;
      this.simWarmRate = 0.02;
    }

    this.simMillis = 0;
    this.isSimulating = true;

    this.simTimer = setInterval(() => {
      this.simMillis += 1000;

      // Thermal decay (hot cools towards ambient ~23°C, cold warms towards ambient)
      const ambient = 23.0;
      this.simTh -= (this.simTh - ambient) * (this.simCoolRate / 60);
      this.simTc += (ambient - this.simTc) * (this.simWarmRate / 60);

      // Add slight measurement noise (+-0.08°C)
      const noiseTh = (Math.random() - 0.5) * 0.15;
      const noiseTc = (Math.random() - 0.5) * 0.15;
      const thReport = Math.max(ambient - 2, this.simTh + noiseTh);
      const tcReport = Math.min(ambient + 2, this.simTc + noiseTc);

      const deltaT = thReport - tcReport;
      const tAvg = (thReport + tcReport) / 2;

      // Realistic Seebeck coefficient with slight temperature dependence:
      // TEC1-12706 typical alpha ~ 0.045 to 0.053 V/K
      // α(Tavg) = 0.046 * (1 + 0.0018 * (Tavg - 25))
      const nominalAlpha = 0.046 * (1 + 0.0018 * (tAvg - 25));
      const noiseV = (Math.random() - 0.5) * 0.003;
      const voltage = Math.max(0, nominalAlpha * deltaT + noiseV);

      // Emit formatted CSV line: "millis,Th,Tc,V"
      const csvLine = `${this.simMillis},${thReport.toFixed(2)},${tcReport.toFixed(2)},${voltage.toFixed(4)}`;
      this.notifyData(csvLine);
    }, 1000);
  }

  public stopSimulation() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.isSimulating = false;
    this.notifyDisconnect();
  }
}

export const serialManager = new SerialManager();
