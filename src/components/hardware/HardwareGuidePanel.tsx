import React, { useState } from 'react';
import { Copy, Check, Cpu, Cable, AlertTriangle, BookOpen } from 'lucide-react';

export const HardwareGuidePanel: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const arduinoCode = `/**
 * ====================================================================
 * TEC1-12706 열전소자 Seebeck 효과 정밀 측정 아두이노 스케치
 * --------------------------------------------------------------------
 * 하드웨어 구성:
 *   - Arduino UNO
 *   - MAX6675 #1 (고온부 Th, K-type 열전대)
 *   - MAX6675 #2 (저온부 Tc, K-type 열전대)
 *   - ADS1115 16-bit ADC (열전소자 발생 전압 V 측정)
 *   - TEC1-12706 펠티어/제벡 소자
 * 
 * 시리얼 출력 형식 (CSV, 115200 baud):
 *   시간(ms),Th(°C),Tc(°C),전압(V)
 * ====================================================================
 */

#include <Wire.h>
#include <SPI.h>
#include <Adafruit_ADS1X15.h>
#include <max6675.h>

// --- MAX6675 #1 (고온부 Th) 핀 정의 ---
const int PIN_TH_SO  = 4;
const int PIN_TH_CS  = 5;
const int PIN_TH_SCK = 6;
MAX6675 thermocoupleTh(PIN_TH_SCK, PIN_TH_CS, PIN_TH_SO);

// --- MAX6675 #2 (저온부 Tc) 핀 정의 ---
const int PIN_TC_SO  = 7;
const int PIN_TC_CS  = 8;
const int PIN_TC_SCK = 9;
MAX6675 thermocoupleTc(PIN_TC_SCK, PIN_TC_CS, PIN_TC_SO);

// --- ADS1115 ADC 객체 생성 ---
Adafruit_ADS1115 ads;

// 측정 간격 (밀리초) - 약 500ms~1000ms 권장
const unsigned long SAMPLE_INTERVAL_MS = 1000;
unsigned long lastSampleTime = 0;

void setup() {
  // 시리얼 통신 초기화 (웹앱과 동일한 115200 baud)
  Serial.begin(115200);
  while (!Serial) { ; } // 시리얼 포트 연결 대기

  // I2C 및 ADS1115 초기화
  Wire.begin();
  if (!ads.begin(0x48)) {
    Serial.println("# ADS1115 초기화 실패! 배선을 확인하세요.");
  }

  // ADS1115 게인 설정:
  // GAIN_TWOTHIRDS : +/- 6.144V (1 bit = 0.1875mV)
  // GAIN_ONE       : +/- 4.096V (1 bit = 0.125mV)
  // GAIN_TWO       : +/- 2.048V (1 bit = 0.0625mV) -> 열전소자 0~2V 측정에 최적
  ads.setGain(GAIN_TWO);

  // MAX6675 열전대 안정화 대기
  delay(500);

  // CSV 헤더 출력 (웹앱이 자동으로 건너뜁니다)
  Serial.println("시간(ms),Th(°C),Tc(°C),전압(V)");
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = currentMillis;

    // 1. MAX6675 온도 읽기 (°C)
    // MAX6675 변환 시간 고려: 연속 호출 시 최소 220ms 필요
    float th = thermocoupleTh.readCelsius();
    delay(10);
    float tc = thermocoupleTc.readCelsius();

    // 2. ADS1115 차동 전압 읽기 (A0-A1 또는 단일 A0)
    // TEC1-12706의 빨간선(+)을 A0, 검은선(-)을 A1에 연결
    int16_t adcRaw = ads.readADC_Differential_0_1();
    
    // GAIN_TWO에서 LSB = 0.0625 mV = 0.0000625 V
    float voltage = adcRaw * 0.0000625;

    // 3. 센서 오류 필터링
    // 열전대 단선 시 MAX6675는 NAN 또는 비정상값 반환
    if (isnan(th) || isnan(tc)) {
      Serial.print(currentMillis);
      Serial.println(",ERR,ERR,0.0000");
      return;
    }

    // 4. 웹앱 규격 CSV 형식으로 출력: "시간,Th,Tc,V"
    Serial.print(currentMillis);
    Serial.print(",");
    Serial.print(th, 2);
    Serial.print(",");
    Serial.print(tc, 2);
    Serial.print(",");
    Serial.println(voltage, 4);
  }
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-1">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span>하드웨어 구성 및 아두이노 스케치 (.ino) 가이드</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          본 웹앱은 아래의 아두이노 스케치 코드를 그대로 업로드하여 USB 시리얼 포트를 통해 실시간 데이터를 수신하도록 설계되었습니다.
          Arduino IDE에서 필요한 라이브러리를 설치하고 코드를 업로드하세요.
        </p>
      </div>

      {/* Pinout Wiring Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-700" />
          <span>하드웨어 핀 배선표 (Arduino UNO 기준)</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">센서 모듈</th>
                <th className="py-2.5 px-3">센서 핀</th>
                <th className="py-2.5 px-3">Arduino UNO 핀</th>
                <th className="py-2.5 px-3">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td rowSpan={5} className="py-2 px-3 font-semibold text-red-600 bg-red-50/30">
                  MAX6675 #1 (고온부 Th)
                </td>
                <td className="py-1 px-3">VCC</td>
                <td className="py-1 px-3 font-bold">5V</td>
                <td className="py-1 px-3 text-slate-500">전원 공급</td>
              </tr>
              <tr>
                <td className="py-1 px-3">GND</td>
                <td className="py-1 px-3 font-bold">GND</td>
                <td className="py-1 px-3 text-slate-500">공통 그라운드</td>
              </tr>
              <tr>
                <td className="py-1 px-3">SO (MISO)</td>
                <td className="py-1 px-3 font-bold text-blue-600">Digital 4</td>
                <td className="py-1 px-3 text-slate-500">SPI 데이터 출력</td>
              </tr>
              <tr>
                <td className="py-1 px-3">CS</td>
                <td className="py-1 px-3 font-bold text-blue-600">Digital 5</td>
                <td className="py-1 px-3 text-slate-500">칩 셀렉트</td>
              </tr>
              <tr>
                <td className="py-1 px-3">SCK</td>
                <td className="py-1 px-3 font-bold text-blue-600">Digital 6</td>
                <td className="py-1 px-3 text-slate-500">SPI 클럭</td>
              </tr>

              <tr>
                <td rowSpan={5} className="py-2 px-3 font-semibold text-blue-600 bg-blue-50/30">
                  MAX6675 #2 (저온부 Tc)
                </td>
                <td className="py-1 px-3">VCC / GND</td>
                <td className="py-1 px-3 font-bold">5V / GND</td>
                <td className="py-1 px-3 text-slate-500">전원 공급</td>
              </tr>
              <tr>
                <td className="py-1 px-3">SO (MISO)</td>
                <td className="py-1 px-3 font-bold text-blue-600">Digital 7</td>
                <td className="py-1 px-3 text-slate-500">SPI 데이터 출력</td>
              </tr>
              <tr>
                <td className="py-1 px-3">CS</td>
                <td className="py-1 px-3 font-bold text-blue-600">Digital 8</td>
                <td className="py-1 px-3 text-slate-500">칩 셀렉트</td>
              </tr>
              <tr>
                <td className="py-1 px-3">SCK</td>
                <td className="py-1 px-3 font-bold text-blue-600">Digital 9</td>
                <td className="py-1 px-3 text-slate-500">SPI 클럭</td>
              </tr>

              <tr>
                <td rowSpan={5} className="py-2 px-3 font-semibold text-amber-600 bg-amber-50/30">
                  ADS1115 ADC (전압 V)
                </td>
                <td className="py-1 px-3">VDD / GND</td>
                <td className="py-1 px-3 font-bold">5V / GND</td>
                <td className="py-1 px-3 text-slate-500">전원 공급</td>
              </tr>
              <tr>
                <td className="py-1 px-3">SCL</td>
                <td className="py-1 px-3 font-bold text-indigo-600">Analog A5</td>
                <td className="py-1 px-3 text-slate-500">I2C 클럭</td>
              </tr>
              <tr>
                <td className="py-1 px-3">SDA</td>
                <td className="py-1 px-3 font-bold text-indigo-600">Analog A4</td>
                <td className="py-1 px-3 text-slate-500">I2C 데이터</td>
              </tr>
              <tr>
                <td className="py-1 px-3">ADDR</td>
                <td className="py-1 px-3 font-bold">GND</td>
                <td className="py-1 px-3 text-slate-500">I2C 주소 0x48 지정</td>
              </tr>
              <tr>
                <td className="py-1 px-3">A0 / A1</td>
                <td className="py-1 px-3 font-bold text-amber-600">TEC1-12706 (+ / -)</td>
                <td className="py-1 px-3 text-slate-500">열전소자 차동 전압 측정</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Arduino Sketch Code Block with Copy Button */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 shadow-md font-mono text-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <span className="text-emerald-400">●</span>
            <span>Arduino UNO 스케치 파일 (Thermoelectric_Analysis.ino)</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md transition-colors text-xs font-sans"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>스케치 코드 복사</span>
              </>
            )}
          </button>
        </div>

        <pre className="text-slate-300 text-[11px] leading-relaxed overflow-x-auto max-h-[420px] p-2 bg-slate-900 rounded">
          <code>{arduinoCode}</code>
        </pre>
      </div>

      {/* Troubleshooting Checklist */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>실험실 연결 및 센서 점검 체크리스트</span>
        </h4>
        <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed font-sans">
          <li>
            <strong>Arduino IDE 필수 라이브러리 설치:</strong> [툴] → [라이브러리 관리]에서 <code>max6675</code> 및 <code>Adafruit ADS1X15</code>를 검색하여 설치하세요.
          </li>
          <li>
            <strong>시리얼 모니터 충돌 방지:</strong> Arduino IDE의 시리얼 모니터가 켜져 있으면 웹 브라우저가 포트를 점유할 수 없습니다. <em>Arduino IDE의 시리얼 모니터를 끈 후</em> 웹앱에서 [시리얼 포트 연결]을 클릭하세요.
          </li>
          <li>
            <strong>열전소자 전압 극성:</strong> 고온 비커와 접촉하는 면에서 전압이 음수(-)로 나온다면 열전소자의 빨간선과 검은선을 ADS1115 A0/A1에서 서로 반대로 교체하세요.
          </li>
          <li>
            <strong>열전도 구리스(Thermal Paste):</strong> 스테인리스 비커 표면과 열전소자 사이의 열 접촉 저항을 줄이기 위해 서멀 구리스를 얇게 도포하면 ΔT 전달 효율이 크게 향상됩니다.
          </li>
        </ul>
      </div>
    </div>
  );
};
