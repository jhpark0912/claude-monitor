import fs from 'fs';
import path from 'path';
import os from 'os';

const MEMO_DIR = path.join(os.homedir(), '.career', 'memos');

function ensureDir() {
  fs.mkdirSync(MEMO_DIR, { recursive: true });
}

export function getMemo(date) {
  try {
    const filePath = path.join(MEMO_DIR, `${date}.json`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveMemo(date, content) {
  ensureDir();
  const data = { date, content, updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(MEMO_DIR, `${date}.json`), JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function getMemoDates() {
  ensureDir();
  try {
    return fs.readdirSync(MEMO_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
