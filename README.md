# Claude Session Dashboard

Claude Code 세션 로그를 파싱하여 일자별 작업 내역, 실시간 세션 상태, 커밋 기반 작업 로그, 사용량 분석을 보여주는 로컬 웹 대시보드.

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
| `GEMINI_API_KEY` | 선택 | 일일보고 AI 요약 생성에 사용. 없으면 AI 요약 없이 보고서만 생성 |

## 기능 요약

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 세션 내역 | `/daily/:date` | 날짜별 세션 목록, 프롬프트/도구/토큰 상세, 프로젝트 필터 |
| 커밋로그 | `/daybook/:date?` | 프로젝트별 git 커밋 일/주/월 조회, diff 통계, 메모 저장 |
| 실시간 모니터링 | `/monitor` | 실행 중 세션 실시간 표시(SSE), 상태 자동 감지, 좀비 정리 |
| 리포트 | `/analytics` | 월간 히트맵, 토큰 비용 추이, 도구 통계, 이상치 감지 |
| 일일보고 | `/reports/:date?` | AI 구조화 요약, 타임라인, 프로젝트별 상세, 매일 00:05 자동 생성 |
| 주간회의록 | `/weekly-report` | 주간 작업 내역 기반 회의록 자동 생성 |
| 대화 보기 | 세션 클릭 시 모달 | 세션 전체 대화 내용 열람 (프롬프트 + AI 응답) |

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js, Express (port 3001), chokidar, SSE, node-cron |
| Frontend | React 19, Vite, TailwindCSS v4, dayjs |
| AI | Google Gemini 2.5 Flash — JSON Schema 구조화 출력 |
| 데이터 | `~/.claude/projects/` JSONL 직접 파싱, 인메모리 캐싱, DB 없음 |

## 아키텍처

```
~/.claude/projects/**/*.jsonl ──→ jsonlParser (증분 파싱 + mtime 캐시)
                                      │
~/.claude/sessions/*.json ──→ sessionMonitor (chokidar) ──→ SSE push
                                      │
git log (각 프로젝트) ──→ gitService (커밋 캐시)
                                      │
                              ┌───────┴───────┐
                              │  Express API   │
                              └───────┬───────┘
                                      │
                              React SPA (Vite)
                                      │
                     ┌────────────────┼────────────────┐
                     세션 내역    커밋로그    일일보고    모니터링
```

**일일보고 생성 흐름:**
1. `reportGenerator` — 기존 서비스(`projectScanner`, `gitService`) 재사용하여 커밋 + 세션 데이터 수집
2. `geminiService` — Gemini에 JSON Schema 강제 출력 요청 → `{ overview, projects[{name, summary, nextStep}] }`
3. `reportService` — `~/.career/reports/{date}.json`으로 저장
4. `reportScheduler` — node-cron으로 매일 00:05 자동 실행 (서버 구동 중일 때만)

## 데이터 경로

| 데이터 | 경로 | 설명 |
|--------|------|------|
| 세션 로그 | `~/.claude/projects/` | Claude Code가 생성 (읽기 전용) |
| 활성 세션 | `~/.claude/sessions/` | Claude Code가 생성 (읽기 전용) |
| 일일보고 | `~/.career/reports/{date}.json` | 보고서 저장 |
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
│       │   ├── analytics.js     # GET /api/analytics/*
│       │   ├── daybook.js       # GET /api/daybook/*
│       │   ├── reports.js       # GET/POST /api/reports/*
│       │   └── conversation.js  # GET /api/conversation/:projectDir/:fileKey
│       ├── services/
│       │   ├── projectScanner.js    # 프로젝트 스캔 + 날짜 인덱스
│       │   ├── jsonlParser.js       # JSONL 파싱 (전체/증분)
│       │   ├── sessionMonitor.js    # chokidar 감시 + SSE 브로드캐스트
│       │   ├── analyticsService.js  # 월간 통계 집계
│       │   ├── gitService.js        # git log 파싱
│       │   ├── memoService.js       # 일일 메모 저장/조회
│       │   ├── cacheManager.js      # mtime 기반 캐시
│       │   ├── reportGenerator.js   # 일일보고 데이터 생성
│       │   ├── reportService.js     # 보고서 저장/조회
│       │   ├── reportScheduler.js   # 매일 00:05 자동 생성
│       │   └── geminiService.js     # Gemini AI 요약
│       └── utils/
│           └── pathDecoder.js       # 프로젝트 경로 디코딩
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js           # /api → localhost:3001 프록시
    └── src/
        ├── main.jsx
        ├── App.jsx              # 라우팅
        ├── api/
        │   └── client.js        # API + SSE 클라이언트
        ├── components/
        │   ├── Layout.jsx           # 헤더 + 탭 네비게이션
        │   ├── ProjectFilter.jsx    # 프로젝트 필터
        │   ├── DateNavigator.jsx    # 날짜 이동
        │   ├── SlidePanel.jsx       # 슬라이드 패널
        │   ├── DailySummary.jsx     # 일일보고 요약 뷰
        │   ├── SwimLane.jsx         # 타임라인 시각화
        │   ├── DatePicker.jsx       # 날짜 선택기
        │   ├── ConversationModal.jsx # 세션 대화 모달
        │   ├── analytics/           # 리포트 관련 컴포넌트
        │   └── daybook/             # 커밋로그 관련 컴포넌트
        ├── utils/
        │   └── colors.js            # 프로젝트 색상 유틸
        └── pages/
            ├── DailyPage.jsx        # 세션 내역
            ├── DaybookPage.jsx      # 커밋로그
            ├── MonitorPage.jsx      # 실시간 모니터링
            ├── AnalyticsPage.jsx    # 리포트
            ├── ReportPage.jsx       # 일일보고
            └── WeeklyReportPage.jsx # 주간회의록
```

## 제한사항

- **로컬 전용** — 인증/권한 없음. 로컬 네트워크 외부 노출 금지
- **서버 상시 구동 필요** — 일일보고 자동 생성(00:05)은 서버가 켜져 있을 때만 동작
- **서브에이전트 파일 미지원** — `agent-*.jsonl` 파일은 파싱하지 않음
- **단일 사용자** — 동시 접속/멀티 유저 고려하지 않음
