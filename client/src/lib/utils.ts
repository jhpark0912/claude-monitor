import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** shadcn 컴포넌트 공용 className 병합 헬퍼. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SEOUL_TZ = 'Asia/Seoul';

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', timeZone: SEOUL_TZ,
  });
}

export function formatTimeWithSeconds(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: SEOUL_TZ,
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', { timeZone: SEOUL_TZ });
}
