# Claude Code Session Dashboard - 구현 계획

## v0.1 (완료, 태그: v0.1)

MVP 구현 — 세션 내역 뷰, 커밋로그, 실시간 모니터링, 분석 리포트, 일일보고 AI 요약, 주간회의록, 스케줄러.

## v0.2 (진행중, 브랜치: feature/dashboard-restructure)

### 목표
6개 탭 → 4개 탭 재구조화. 세션/커밋 통합 타임라인, 보고서 서브탭(일일/주간/중점추진과제), 멀티데이 세션 지원, 성능 최적화.

### 완료 항목

**Phase 1: 네비게이션 재구조화 + 타임라인**
- [x] Layout.jsx 4탭 언더라인 네비
- [x] App.jsx 라우트 4탭 + 레거시 리다이렉트
- [x] 타임라인 서버 API (세션+커밋 통합)
- [x] TimelinePage + TimelineEntry 구현
- [x] ReportsPage 셸 (서브탭 전환)
- [x] API 클라이언트 + 레거시 페이지 정리

**Phase 2: 주간회의록 강화**
- [x] 프로젝트 멀티선택 + AI 생성 + 저장/불러오기

**Phase 3: 중점추진과제**
- [x] 백엔드 (objectiveService + objectives 라우트 + AI 생성)
- [x] 프론트엔드 (ObjectivesReport + ObjectiveSettings)

**Phase 4: 보고서 브릿지**
- [x] WeeklyView/MonthlyView → 보고서 탭 연결 버튼

**Phase 5: 비주얼 폴리시**
- [x] 기본 테마 light, CSS 변수, Notion 스타일

**멀티데이 세션 인덱싱**
- [x] jsonlParser에 readLastTimestamp + parseDayActivity 추가
- [x] projectScanner dateIndex를 startDate~endDate 범위로 확장
- [x] 전 라우트(timeline, daybook, analytics, reports) 적용

**성능 최적화**
- [x] Windows 배치 PID 확인 (단일 tasklist + 10s 캐시)
- [x] 타임라인 API Promise.all 병렬화 (13.5s → 2.2s)

**UI 개선**
- [x] 타임라인 프로젝트 컬러 태그 (첫 번째 위치)
- [x] 프로젝트 색상 팔레트 12색 → 20색 확장
- [x] 글로벌 ProjectFilter 제거
- [x] 과제 설정 모달 스크롤/오버플로우 수정
- [x] 연관 프로젝트 호버 툴팁 (ID→라벨 변환)
- [x] Gemini AI 호출 120s 타임아웃 추가
- [x] 보고서 탭 기본값 일일보고, 날짜 네비 수정

### 핵심 설계 결정

**멀티데이 세션**: `getSessionDays()` 헬퍼로 세션이 걸치는 모든 날짜 열거. 캘린더/비용은 토큰을 일수로 균등 배분.

**프로세스 감지 (Windows)**: `process.kill(pid, 0)` 후 `tasklist /FO CSV /NH`로 프로세스명 확인 (PID 재사용 방어). 단일 호출 → Map 캐시 10s.

**프로젝트 컬러**: 프로젝트명 해시 → 20색 팔레트. `c-{color}` (solid bar), `b-{color}` (태그 배경+텍스트). 라이트/다크 모드 대비 보정.
