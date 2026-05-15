const PALETTE = [
  'indigo', 'amber', 'emerald', 'rose', 'cyan',
  'violet', 'orange', 'teal', 'lime', 'pink', 'sky', 'red',
];

const cache = new Map();

export function getProjectColor(projectName) {
  if (cache.has(projectName)) return cache.get(projectName);

  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = ((hash << 5) - hash + projectName.charCodeAt(i)) | 0;
  }
  const color = PALETTE[Math.abs(hash) % PALETTE.length];
  cache.set(projectName, color);
  return color;
}

export function formatTokens(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
