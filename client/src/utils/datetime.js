/** lib/utils.ts의 날짜 포맷터 이식 (cn() 헬퍼는 shadcn 전용이라 제외). */

const SEOUL_TZ = 'Asia/Seoul';

export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', timeZone: SEOUL_TZ,
  });
}

export function formatTimeWithSeconds(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: SEOUL_TZ,
  });
}

export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('ko-KR', { timeZone: SEOUL_TZ });
}

/** 두 날짜 문자열 간 일수 차이 (최소 1). */
export function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

/** "3분 전" / "2시간 전" 형태의 상대 시간. 작업 기록 피드에서 사용. */
export function formatRelativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}
