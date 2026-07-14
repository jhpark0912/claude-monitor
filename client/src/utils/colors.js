const PALETTE = [
  'indigo', 'amber', 'emerald', 'rose', 'cyan',
  'violet', 'orange', 'teal', 'lime', 'pink', 'sky', 'red',
  'fuchsia', 'blue', 'yellow', 'slate', 'mint', 'coral', 'plum', 'gold',
];

const cache = new Map();

/** 문자열 해시로 팔레트에서 항목 하나를 고정 배정 (동일 입력 → 항상 동일 출력). */
export function hashPick(str, palette) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

export function getProjectColor(projectName) {
  if (cache.has(projectName)) return cache.get(projectName);
  const color = hashPick(projectName, PALETTE);
  cache.set(projectName, color);
  return color;
}

export function formatTokens(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

export const TOOL_ICONS = { Bash: '$', Write: '+', Edit: '~', Read: '>', Grep: '?', Glob: '*', Agent: 'A' };
