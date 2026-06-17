# Claude Session Dashboard

Claude Code 세션 로그를 파싱하여 타임라인, 사용량 분석, AI 기반 보고서를 제공하는 로컬 웹 대시보드.

**어제의 나를 3분 안에 복구하는 도구.** Claude Code로 작업한 하루를 프로젝트별 커밋, 세션, AI 요약으로 정리하여 다음 날 아침에 맥락을 빠르게 복구할 수 있다. DB 없이 `~/.claude/projects/` JSONL 파일을 직접 파싱하며, 로컬에서만 동작한다.

## 빠른 시작

```bash
git clone https://github.com/jhpark0912/claude-monitor.git
cd claude-monitor

# 의존성 설치
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# (선택) AI 요약 사용 시 Gemini API 키 설정
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 입력

# 개발 서버 실행
npm run dev
```

http://localhost:5173 접속

### 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `GEMINI_API_KEY` | 선택 | AI 보고서 생성(일일보고, 주간회의록, 중점추진과제)에 사용. 없으면 수동 보고서만 가능 |

## 기능 요약

| 탭 | 경로 | 설명 |
|----|------|------|
| 타임라인 | `/timeline/:date?` | 세션+커밋 통합 시간순 뷰 (일간), 주간/월간 커밋 뷰. 프로젝트 컬러 태그 |
| 분석 | `/analytics` | 월간 캘린더 히트맵, 토큰 비용 추이, 도구 통계, 이상치 감지 |
| 보고서 | `/reports/:type?/:param?` | 일일보고 / 주간회의록 / 중점추진과제 (서브탭) |
| 모니터링 | `/monitor` | 실행 중 세션 실시간 표시 (SSE), 상태 자동 감지, 좀비 정리 |

### 보고서 서브탭

| 서브탭 | 설명 |
|--------|------|
| 일일보고 | AI 구조화 요약 + 타임라인 + 프로젝트별 상세. 매일 00:05 자동 생성 |
| 주간회의록 | 프로젝트 멀티선택 + AI 생성 + 저장/불러오기 |
| 중점추진과제 | 과제 설정(CRUD) → 월간 커밋 기반 AI 성과 보고서 생성, 인라인 편집 |

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js, Express (port 3001), chokidar, SSE, node-cron |
| Frontend | React 19, Vite, TailwindCSS v4, dayjs |
| AI | Google Gemini 2.5 Flash — JSON Schema 구조화 출력 (120s 타임아웃) |
| 데이터 | `~/.claude/projects/` JSONL 직접 파싱, 인메모리 캐싱, DB 없음 |

## 아키텍처

```
~/.claude/projects/**/*.jsonl ──→ jsonlParser (증분 파싱 + mtime 캐시)
                                      │
~/.claude/sessions/*.json ──→ sessionMonitor (chokidar) ──→ SSE push
                                      │
git log (각 프로젝트) ──→ gitService (커밋 캐시, Promise.all 병렬)
                                      │
                              ┌───────┴───────┐
                              │  Express API   │
                              └───────┬───────┘
                                      │
                              React SPA (Vite)
                                      │
                     ┌────────────────┼────────────────┐
                   타임라인       분석      보고서      모니터링
                  (세션+커밋)  (통계/차트)  (AI 요약)  (실시간 SSE)
```

### 멀티데이 세션 처리

세션이 여러 날에 걸치는 경우(예: 6/16 23시 ~ 6/17 02시):
- 날짜 인덱스에 `startDate~endDate` 범위로 등록
- 타임라인: 해당 날짜의 활동만 필터(`parseDayActivity`)하여 표시
- 분석/캘린더: 토큰을 일수로 균등 배분

### 성능 최적화

- Windows 프로세스 감지: 단일 `tasklist` 호출 → 배치 PID 확인 (10s 캐시)
- 타임라인 API: 세션 조회 + 24개 프로젝트 git log를 `Promise.all`로 병렬 실행
- Cold 13.5s → 2.2s (84% 개선)

## 데이터 경로

| 데이터 | 경로 | 설명 |
|--------|------|------|
| 세션 로그 | `~/.claude/projects/` | Claude Code가 생성 (읽기 전용) |
| 활성 세션 | `~/.claude/sessions/` | Claude Code가 생성 (읽기 전용) |
| 일일보고 | `~/.career/reports/{date}.json` | 보고서 저장 |
| 주간보고 | `~/.career/weekly-reports/{from}_{to}.json` | 주간회의록 저장 |
| 과제 설정 | `~/.career/objectives.json` | 중점추진과제 설정 |
| 과제 보고서 | `~/.career/objective-reports/{YYYY-MM}.json` | 월간 성과 보고서 |
| 일일 메모 | `~/.career/memos/{date}.json` | 커밋로그 메모 저장 |

## 프로젝트 구조

```
claude-monitor/
├── package.json                 # concurrently로 서버+클라이언트 동시 실행
├── .env.example                 # 환경변수 템플릿
├── server/
│   ├── package.json
│   ├── scripts/
│   │   └── generate-daily-report.js  # CLI로 보고서 수동 생성
│   └── src/
│       ├── index.js             # Express 진입점 + 스케줄러 등록
│       ├── routes/
│       │   ├── projects.js      # GET /api/projects
│       │   ├── sessions.js      # GET /api/sessions/:projectId
│       │   ├── daily.js         # GET /api/daily?date=&project=
│       │   ├── monitor.js       # GET /api/monitor/stream (SSE)
│       │   ├── analytics.js     # GET /api/analytics/* (멀티데이 분배)
│       │   ├── daybook.js       # GET /api/daybook/*
│       │   ├── reports.js       # GET/POST /api/reports/* (일일+주간)
│       │   ├── timeline.js      # GET /api/timeline (세션+커밋 통합)
│       │   ├── objectives.js    # CRUD + AI 생성 /api/objectives/*
│       │   └── conversation.js  # GET /api/conversation/:projectDir/:fileKey
│       ├── services/
│       │   ├── projectScanner.js    # 프로젝트 스캔 + 멀티데이 인덱스 + 배치 PID
│       │   ├── jsonlParser.js       # JSONL 파싱 (전체/증분/일별 필터)
│       │   ├── sessionMonitor.js    # chokidar 감시 + SSE 브로드캐스트
│       │   ├── analyticsService.js  # 월간 통계 집계
│       │   ├── gitService.js        # git log 파싱
│       │   ├── memoService.js       # 일일 메모 저장/조회
│       │   ├── objectiveService.js  # 중점추진과제 CRUD
│       │   ├── cacheManager.js      # mtime 기반 캐시
│       │   ├── reportGenerator.js   # 일일보고 데이터 생성
│       │   ├── reportService.js     # 보고서 저장/조회 (일일+주간)
│       │   ├── reportScheduler.js   # 매일 00:05 자동 생성
│       │   └── geminiService.js     # Gemini AI (일일/주간/과제, 120s 타임아웃)
│       └── utils/
│           └── pathDecoder.js       # 프로젝트 경로 디코딩
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js           # /api → localhost:3001 프록시
    └── src/
        ├── main.jsx
        ├── App.jsx              # 라우팅 (4탭 + 레거시 리다이렉트)
        ├── api/
        │   └── client.js        # API 클라이언트 (fetch + SSE)
        ├── components/
        │   ├── Layout.jsx           # 헤더 + 4탭 언더라인 네비게이션
        │   ├── DateNavigator.jsx    # 날짜 이동
        │   ├── SlidePanel.jsx       # 슬라이드 패널
        │   ├── DailySummary.jsx     # 일일보고 요약 뷰
        │   ├── SwimLane.jsx         # 타임라인 시각화
        │   ├── DatePicker.jsx       # 날짜 선택기
        │   ├── ConversationModal.jsx # 세션 대화 모달
        │   ├── analytics/           # 분석 관련 컴포넌트
        │   ├── daybook/             # 커밋로그 관련 컴포넌트
        │   ├── timeline/
        │   │   └── TimelineEntry.jsx # 세션/커밋 통합 엔트리 (프로젝트 컬러 태그)
        │   └── reports/
        │       ├── ObjectivesReport.jsx  # 중점추진과제 뷰
        │       └── ObjectiveSettings.jsx # 과제 설정 모달
        ├── utils/
        │   └── colors.js            # 프로젝트 색상 유틸 (20색 팔레트)
        └── pages/
            ├── TimelinePage.jsx     # 타임라인 (일간/주간/월간)
            ├── MonitorPage.jsx      # 실시간 모니터링
            ├── AnalyticsPage.jsx    # 분석
            ├── ReportsPage.jsx      # 보고서 컨테이너 (서브탭)
            ├── ReportPage.jsx       # 일일보고
            └── WeeklyReportPage.jsx # 주간회의록
```

## 제한사항

- **로컬 전용** — 인증/권한 없음. 로컬 네트워크 외부 노출 금지
- **서버 상시 구동 필요** — 일일보고 자동 생성(00:05)은 서버가 켜져 있을 때만 동작
- **서브에이전트 파일 미지원** — `agent-*.jsonl` 파일은 파싱하지 않음
- **단일 사용자** — 동시 접속/멀티 유저 고려하지 않음

## 버전 이력

| 버전 | 태그 | 주요 내용 |
|------|------|-----------|
| v0.1 | `v0.1` | MVP — 세션 내역, 커밋로그, 모니터링, 분석, 일일보고, 주간회의록, 스케줄러 |
| v0.2 | (개발중) | 대시보드 재구조화 — 6탭→4탭, 타임라인 통합, 중점추진과제, 멀티데이 세션, 성능 최적화 |
