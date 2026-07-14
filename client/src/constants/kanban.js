/**
 * 칸반 도메인 상수. server/src/services/kanbanQueries.js 응답 스키마와 1:1.
 */

export const ALL_STATUSES = ['Backlog', 'Todo', 'InProgress', 'Review', 'Done', 'Rejected'];
export const STATUS_IN_PROGRESS = 'InProgress';
export const STATUS_REVIEW = 'Review';
export const STATUS_DONE = 'Done';
export const STATUS_REJECTED = 'Rejected';

export const SYSTEM_NOTE_TYPE = 'system';
export const RETRO_PREFIX = '[retro]';
export const LESSONS_PREFIX = '[lessons]';
export const UNCLASSIFIED_PLAN_ID = '__unclassified__';

/** Plan derived_state를 태스크 상태 집계로 계산. 서버 derivePlanState와 동일 로직. */
export function derivePlanState(counts, blocked) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 'planned';
  if (blocked > 0) return 'blocked';
  const done = (counts[STATUS_DONE] ?? 0) + (counts[STATUS_REJECTED] ?? 0);
  if (done === total) return 'completed';
  if ((counts[STATUS_IN_PROGRESS] ?? 0) > 0 || (counts[STATUS_REVIEW] ?? 0) > 0) return 'active';
  return 'planned';
}

export const PLAN_STATE_ORDER = { active: 0, blocked: 0, planned: 1, completed: 2 };

export const STATUS_CONFIG = {
  Backlog: { label: '백로그', dot: 'var(--mt)' },
  Todo: { label: '할 일', dot: 'var(--yw)' },
  InProgress: { label: '진행 중', dot: 'var(--bl)' },
  Review: { label: '리뷰', dot: 'var(--pr)' },
  Done: { label: '완료', dot: 'var(--gn)' },
  Rejected: { label: '거절', dot: 'var(--rd)' },
};

export const PRIORITY_CONFIG = {
  Critical: { label: 'CRIT', color: 'var(--rd)' },
  High: { label: 'HIGH', color: '#fb923c' },
  Medium: { label: 'MED', color: 'var(--bl)' },
  Low: { label: 'LOW', color: 'var(--mt)' },
};

export const PLAN_STATE_CONFIG = {
  active: { label: '활성', color: 'var(--bl)', bg: 'rgba(96,165,250,.12)' },
  completed: { label: '완료', color: 'var(--gn)', bg: 'rgba(74,222,128,.1)' },
  planned: { label: '계획', color: 'var(--mt)', bg: 'var(--s3)' },
  blocked: { label: '블로커', color: 'var(--rd)', bg: 'rgba(248,113,113,.12)' },
};

export const NOTE_TYPE_LABELS = {
  system: '시스템', progress: '진행', blocker: '블로커',
  handoff: '인수인계', review: '리뷰',
};

export const NOTE_TYPE_BADGE_CLASS = {
  system: 'b-slate', progress: 'b-blue', blocker: 'b-red',
  handoff: 'b-violet', review: 'b-emerald',
};

export const ACTIVITY_ACTION_CONFIG = {
  status_change: { label: '상태변경', bg: 'rgba(96,165,250,.12)', color: 'var(--bl)' },
  update: { label: '업데이트', bg: 'var(--s3)', color: 'var(--mt)' },
};
