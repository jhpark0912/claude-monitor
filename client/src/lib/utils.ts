import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** shadcn 컴포넌트 공용 className 병합 헬퍼. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
