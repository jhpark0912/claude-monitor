# Claude Session Dashboard

Claude Code 세션 로그를 파싱하여 일자별 작업 내역, 실시간 세션 상태, 커밋 기반 작업 로그, 사용량 분석을 보여주는 로컬 웹 대시보드.

## 주요 기능

### 세션 내역 (`/daily/:date`)
- 날짜별 세션 목록 조회 (프롬프트, 도구 호출, 변경 파일, 토큰 사용량)
- 프로젝트 필터링
- 날짜 네비게이션 (이전/다음/오늘)

### 커밋로그 (`/daybook/:date?`)
- 프로젝트별 git 커밋 히스토리 일/주/월 단위 조회
- 커밋 diff 통계 시각화 (추가/삭제 라인)
- 마크다운 복사 기능
- 일일 메모 저장 (파일 기반)

### 실시간 모니터링 (`/monitor`)
- 현재 실행 중인 모든 Claude Code 세션 실시간 표시
- 세션 상태 자동 감지 (활성 / 대기 / 종료)
- 활동 힌트 표시 (도구 실행, AI 응답, 승인 대기 등)
- SSE(Server-Sent Events) 기반 실시간 업데이트
- 좀비 세션 자동 정리 (30분 무활동 시)
- 완료된 세션 숨기기 토글

### 리포트 (`/analytics`)
- 월간 캘린더 히트맵 (일별 세션 활동량)
- 시간대별 활동 히트맵
- 토큰 비용 분석 및 일별 추이
- 도구 사용 통계
- 이상치 감지

## 사전 요구사항

- **Node.js** 18 이상
- **Claude Code**가 설치되어 `~/.claude/projects/` 경로에 세션 파일이 존재해야 함

## 설치 및 실행

```bash
# 저장소 클론
git clone <repository-url>
cd session-dashboard

# 의존성 설치
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 개발 서버 실행 (서버 + 클라이언트 동시 실행)
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Node.js, Express (port 3001), chokidar, SSE |
| Frontend | React 19, Vite, TailwindCSS v4, dayjs |
| 데이터 | `~/.claude/projects/` JSONL 파일 직접 파싱, 인메모리 캐싱 |

## 프로젝트 구조

```
session-dashboard/
├── package.json                 # concurrently로 서버+클라이언트 동시 실행
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js             # Express 진입점
│       ├── routes/
│       │   ├── projects.js      # GET /api/projects
│       │   ├── sessions.js      # GET /api/sessions/:projectId
│       │   ├── daily.js         # GET /api/daily?date=&project=
│       │   ├── monitor.js       # GET /api/monitor/stream (SSE)
│       │   ├── analytics.js     # GET /api/analytics/*
│       │   └── daybook.js       # GET /api/daybook/*
│       ├── services/
│       │   ├── projectScanner.js    # 프로젝트 스캔 + 날짜 인덱스
│       │   ├── jsonlParser.js       # JSONL 파싱 (전체/증분)
│       │   ├── sessionMonitor.js    # chokidar 감시 + SSE 브로드캐스트
│       │   ├── analyticsService.js  # 월간 통계 집계
│       │   ├── gitService.js        # git log 파싱
│       │   ├── memoService.js       # 일일 메모 저장/조회
│       │   └── cacheManager.js      # mtime 기반 캐시
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
        │   ├── analytics/           # 리포트 관련 컴포넌트
        │   └── daybook/             # 커밋로그 관련 컴포넌트
        ├── utils/
        │   └── colors.js            # 프로젝트 색상 유틸
        └── pages/
            ├── DailyPage.jsx        # 세션 내역
            ├── DaybookPage.jsx      # 커밋로그
            ├── MonitorPage.jsx      # 실시간 모니터링
            └── AnalyticsPage.jsx    # 리포트
```

## 동작 원리

### 세션 데이터 소스
Claude Code는 `~/.claude/projects/<인코딩된 경로>/` 하위에 세션별 JSONL 파일을 생성한다. 이 대시보드는 해당 파일들을 스트리밍 파싱하여 세션 요약(프롬프트, 토큰, 도구 호출, 변경 파일)을 추출한다.

### 실시간 모니터링
- `~/.claude/sessions/*.json` 파일을 chokidar로 감시하여 새 세션 시작/종료를 감지
- 활성 세션의 JSONL 파일만 동적으로 watch 추가 (증분 파싱으로 성능 최적화)
- SSE로 브라우저에 실시간 push

### 세션 상태 판별
| 상태 | 조건 |
|------|------|
| 활성 | PID 실행 중 AND JSONL 마지막 쓰기 120초 이내 |
| 대기 | PID 실행 중 AND JSONL 마지막 쓰기 120초 초과 |
| 종료 | PID 미실행 OR 좀비 세션 (30분 무활동) |

### 활동 힌트
| 힌트 | 의미 |
|------|------|
| AI 응답 중 | 사용자 입력 후 AI가 응답 생성 중 |
| 도구 실행 중 | 도구(tool) 호출 후 60초 이내 |
| AI 처리 중 | 도구 결과 수신 후 AI가 처리 중 |
| 승인 대기 | 도구 호출 후 60초 초과 (사용자 승인 필요) |
| 입력 대기 | AI 응답 완료 후 사용자 입력 대기 |
