# TEC1-12706 열전소자 실험 데이터 분석 웹 애플리케이션

Arduino UNO와 센서 모듈(MAX6675 2개, ADS1115 ADC)을 연동하여 TEC1-12706 열전소자의 온도차와 발생 전압을 실시간 수신하고, 유효 제벡 계수($\alpha$) 및 다중 조건 비교 분석을 수행하는 연구·실험용 계측 웹 애플리케이션입니다.

## 사용자 확인 및 주요 결정 사항

> [!IMPORTANT]
> 사전 질의를 통해 확인된 요구사항 및 시스템 기본 정책입니다:
> - **다중 실험 데이터 관리**: 사용자 응답에 따라 브라우저 세션 메모리 기반으로 관리하며, 영구 저장이 필요할 경우 CSV 파일 내보내기/가져오기를 통해 독립적인 파일 형태로 백업 및 복원합니다.
> - **Web Serial API & 대체 수단**: 최신 크롬/엣지 브라우저의 Web Serial API(`navigator.serial`)를 기본 통신 채널로 사용하며, 미지원 환경이나 사전 기록 데이터 분석을 위한 CSV 파일 업로드 및 실시간 시뮬레이션 모드를 함께 제공합니다.
> - **실제 하드웨어 vs 가상 모드 구분**: 실제 시리얼 포트 연결 상태와 가상 테스트 모드를 명확한 상태 배지로 분리하여 임의 데이터가 실제 측정값으로 오인되지 않도록 설계합니다.

---

## 1. 개요 및 핵심 개념

- **목적**: 고등학교 과학 탐구 및 학술 연구 수준에서 TEC1-12706 펠티어/제벡 소자의 열전 발전 특성을 정밀 측정하고 실시간 시각화 및 비교 분석을 수행.
- **핵심 연구 질문**: *"동일한 온도차($\Delta T$) 조건에서 양면의 평균 온도($T_{avg}$)가 달라지면 열전소자의 발생 전압($V$)과 유효 제벡 계수($\alpha$)는 어떻게 변화하는가?"*
- **연동 하드웨어**:
  - 마이크로컨트롤러: Arduino UNO (USB Serial 115200 baud)
  - 고온부/저온부 온도 측정: K-type 열전대 + MAX6675 모듈 2개
  - 출력 전압 측정: ADS1115 16-bit $\Delta\Sigma$ ADC (정밀 $mV$ 단위 감지)
  - 열전소자: TEC1-12706 (두 개의 스테인리스 비커 열원 사이에 접촉)

---

## 2. 사용자 경험(UX) 및 시각 디자인

- **디자인 톤 & 매너**:
  - 정밀 계측기기 및 연구소 콘솔 분위기(Clean Laboratory Precision)
  - 기본 색상: 짙은 네이비(`slate-900`, `slate-950`)와 순백색(`white`, `slate-50`)의 명확한 콘트라스트
  - 채널별 고유 식별 색상:
    - 고온부 $T_h$: Crimson Red (`#EF4444`)
    - 저온부 $T_c$: Marine Blue (`#3B82F6`)
    - 온도차 $\Delta T$: Purple/Indigo (`#8B5CF6`)
    - 발생 전압 $V$: Amber Gold (`#F59E0B`)
    - 제벡 계수 $\alpha$: Emerald Teal (`#10B981`)
- **타이포그래피**:
  - 헤드라인 및 라벨: 현대적인 Neo-Grotesque (`DM Sans`, `Plus Jakarta Sans`)
  - 모든 측정 수치, 시간, 전압, 회귀 계수: 등폭 숫자(`font-mono tabular-nums`) 적용으로 값 변동 시 레이아웃 흔들림(Jitter) 완전 방지
- **화면 구조**:
  1. **상단 시스템 리본**: 하드웨어 연결 상태, 포트 정보, 수신 패킷 수, 측정 경과 시간, 측정 시작/정지 토글
  2. **핵심 실시간 대시보드 KPI**: $T_h$, $T_c$, $\Delta T$, $T_{avg}$, $V$, $\alpha$ (단위 분리, 오차 방지 처리)
  3. **메인 작업 영역 (6개 탭)**:
     - **대시보드 (Dashboard)**: 실시간 주요 파라미터 요약 + 미니 실시간 복합 차트 + 실험 설정 요약
     - **아두이노 연결 (Serial / Input)**: 포트 검색/연결, 통신 속도(기본 115200), 데이터 포맷 매핑 커스텀, 원본 시리얼 터미널 로그
     - **실시간 그래프 (Charts A~E)**: 개별 5개 정밀 차트 및 오버레이, 십자선 마우스 인터랙션, 선형 회귀 분석 ($R^2$ 계산)
     - **측정 데이터 테이블 (Data Table)**: 원본 센서값과 계산값(Time, $T_h$, $T_c$, $\Delta T$, $T_{avg}$, $V$, $\alpha$) 전수 조회, CSV 다운로드 및 CSV 업로드
     - **실험 비교 분석 (Multi-Run Comparison)**: 여러 회차의 실험 데이터(저온/중온/고온 평균온도 조건)를 등록하고, 사용자가 지정한 $\Delta T$ 허용 오차(예: $\pm 0.5^\circ\text{C}$) 범위 내에서 $T_{avg}$에 따른 $V$ 및 $\alpha$ 통계 비교 및 중첩 그래프 분석
     - **아두이노 스케치 & 배선 가이드 (Hardware Guide)**: 복사 가능한 최적화 Arduino UNO .ino 코드, 핀맵 배선 다이어그램, 라이브러리 안내

---

## 3. 핵심 물리량 계산 및 알고리즘

1. **온도차 및 평균 온도**:
   $$\Delta T = T_h - T_c \quad (^\circ\text{C} \text{ 또는 } \text{K})$$
   $$T_{avg} = \frac{T_h + T_c}{2} \quad (^\circ\text{C})$$

2. **유효 제벡 계수($\alpha$)**:
   $$\alpha = \frac{V}{\Delta T} \quad (\text{V/K} \text{ 또는 } \text{mV/K})$$
   - **온도차 부족(Zero-Division) 예외 처리**: $|\Delta T| < 0.5^\circ\text{C}$일 경우 나눗셈을 중단하고 "온도차 부족(Low $\Delta T$)" 상태로 안전하게 표시하여 NaN 및 발산 방지.
   - 단일 상수로 단정하지 않고 각 순간의 조건부 "유효(effective) 제벡 계수"로 명시.

3. **선형 회귀 분석 ($V$ vs $\Delta T$)**:
   - 최소자승법(Least Squares Method)을 이용한 선형 회귀선 산출:
     $$V = \alpha_{fit} \cdot \Delta T + C$$
   - 결정계수($R^2$) 계산으로 선형성 및 비례 관계의 신뢰도 정량화.

4. **비교 분석 필터링 알고리즘**:
   - 사용자가 목표 $\Delta T$ 및 허용 오차 $\epsilon$(예: $20.0 \pm 1.0^\circ\text{C}$)을 설정하면, 각 실험 회차에서 해당 범위에 속하는 데이터 포인트들을 자동 슬라이싱하여 평균 $T_{avg}$, 평균 전압 $\overline{V}$, 평균 제벡 계수 $\overline{\alpha}$를 계산하고 비교 차트로 제시.

---

## 4. 기술 아키텍처 및 데이터 흐름

```
┌────────────────────────────────────────────────────────┐
│                   Arduino UNO                          │
│  - MAX6675 #1 (Th)    - MAX6675 #2 (Tc)               │
│  - ADS1115 ADC (V)    - USB Serial (115200 baud)       │
└───────────────────────────┬────────────────────────────┘
                            │ USB Serial (CSV Stream)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Web Serial API / CSV File Parser           │
│  - navigator.serial (Port request, Reader, TextDecoder)│
│  - Configurable Delimiter & Column Mapper              │
│  - Packet Validation & Error Sanitization              │
└───────────────────────────┬────────────────────────────┘
                            │ Raw Datapoint { time, Th, Tc, V }
                            ▼
┌────────────────────────────────────────────────────────┐
│             Physics Calculation Engine                 │
│  - Relative Time Calculation (t - t0)                  │
│  - ΔT, Tavg Calculation                                │
│  - Safe Effective Seebeck Coefficient (α = V / ΔT)     │
│  - Linear Regression & R² Statistics Engine            │
└───────────────────────────┬────────────────────────────┘
                            │ Calculated Datapoint
                            ▼
┌────────────────────────────────────────────────────────┐
│               Session & State Management               │
│  - Active Live Stream Buffer (Recent window / Full run)│
│  - Saved Experiment Runs (Run #1, Run #2, etc.)        │
│  - CSV Export / Import Serialization                   │
└───────────────────────────┬────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Dashboard   │    │ 5x Analytics │    │ Comparative  │
│  Telemetry   │    │ Interactive  │    │ Multi-Run    │
│  KPI Cards   │    │ Charts (A-E) │    │ ΔT Matching  │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 5. 단계별 구현 계획

1. **프로젝트 설정 및 의존성 구성**:
   - Tailwind CSS v4 스타일링 및 Lucid Icons
   - 모듈화된 인터페이스 및 정밀 과학 차트 컴포넌트
2. **시리얼 통신 & 데이터 수신 엔진**:
   - Web Serial API 드라이버 (연결, 버퍼 분할, 스트림 파싱)
   - 데이터 검증기 (결측치, NaN, 형식 불일치 필터링)
   - 시뮬레이션 제너레이터 (하드웨어 미연결 시 교실/연구 검증용)
3. **물리 계산 & 통계 모듈**:
   - 실시간 $\Delta T, T_{avg}, \alpha$ 계산
   - $V$ vs $\Delta T$ 산점도 회귀분석 및 $R^2$ 계산
4. **실시간 인터랙티브 차트**:
   - Graph A: 시간별 $T_h, T_c$
   - Graph B: 시간별 $\Delta T$
   - Graph C: 시간별 발생 전압 $V$
   - Graph D: 시간별 유효 제벡 계수 $\alpha$
   - Graph E: $\Delta T$에 따른 발생 전압 $V$ 산점도 및 선형 회귀 직선
5. **실험 저장 & 다중 실험 비교 분석기**:
   - 다중 세션 보관 및 회차별 레이블링
   - 특정 $\Delta T \pm \epsilon$ 구간 자동 추출 및 평균 온도에 따른 전압 특성 분석
   - 데이터 테이블 전수 검토 및 CSV 내보내기/가져오기
6. **아두이노 코드 및 하드웨어 가이드**:
   - 실제 연결을 위한 검증된 Arduino UNO `.ino` 코드 내장
   - MAX6675 및 ADS1115 I2C/SPI 배선도 제공
