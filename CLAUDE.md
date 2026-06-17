# Claude Code Session Dashboard

## 프로젝트 개요
Claude Code 세션 JSONL 파일을 파싱하여 타임라인/분석/보고서/모니터링을 제공하는 로컬 웹 대시보드.

## 구현 상태
- v0.1: MVP 완료 (세션 내역, 커밋로그, 모니터링, 분석, 일일보고, 주간회의록)
- v0.2 개발중: 대시보드 재구조화 (6탭→4탭, 타임라인 통합, 중점추진과제, 멀티데이 세션, 성능 최적화)

## 기술 스택
- Backend: Node.js + Express (port 3001) + chokidar + SSE + node-cron
- Frontend: React + Vite + TailwindCSS (port 5173) + EventSource
- AI: Google Gemini 2.5 Flash (JSON Schema 구조화 출력, 120s 타임아웃)
- DB 없음 — `~/.claude/projects/` JSONL 파일 직접 파싱 + 인메모리 캐싱

## 실행 방법
```bash
npm install
npm run dev
# http://localhost:5173 접속
```

## 네비게이션 구조 (v0.2)
| 탭 | 라우트 | 서브뷰 |
|---|---|---|
| 타임라인 | `/timeline/:date?` | 일간(세션+커밋) · 주간 · 월간 |
| 분석 | `/analytics` | 캘린더 · 비용 · 도구 · 이상치 |
| 보고서 | `/reports/:type?/:param?` | 일일보고 · 주간회의록 · 중점추진과제 |
| 모니터링 | `/monitor` | 실시간 세션 감시 |

## 프로젝트 구조
- `server/` — Express 백엔드 (라우트, 서비스, 유틸)
- `client/` — React 프론트엔드 (컴포넌트, 페이지)
- 상세 파일 구조는 `README.md` 참조

## 코드 컨벤션
- 언어: JavaScript (TypeScript 미사용, MVP 속도 우선)
- UI 텍스트: 한국어
- 파일당 300줄 제한
- 서브에이전트 파일(agent-*.jsonl)은 무시
- 멀티데이 세션: startDate~endDate 범위 인덱싱, 일별 활동 필터링
- 프로젝트 색상: 20색 해시 기반 팔레트 (`c-{color}`, `b-{color}` CSS 클래스)
