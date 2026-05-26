import { execFile } from 'child_process';
import { promisify } from 'util';
import { projectCache } from './projectScanner.js';
import dayjs from 'dayjs';

const execFileAsync = promisify(execFile);
const EXEC_OPTS = { timeout: 15_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 };

const COMMIT_RE = /^(?::[\w+-]+:\s*)?(?:\[(\w+)\](?:\(([^)]*)\))?\s*)?(.+)/;
const CACHE_TTL_HOT = 30_000;
const CACHE_TTL_COLD = 10 * 60_000;
const CACHE_MAX_ENTRIES = 200;

const commitCache = new Map();

function cacheGet(key) {
  const entry = commitCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) {
    commitCache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, to) {
  if (commitCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = commitCache.keys().next().value;
    commitCache.delete(oldest);
  }
  const isPast = dayjs(to).isBefore(dayjs().startOf('day'));
  commitCache.set(key, { data, ts: Date.now(), ttl: isPast ? CACHE_TTL_COLD : CACHE_TTL_HOT });
}

export function parseCommitMessage(subject) {
  const m = COMMIT_RE.exec(subject);
  if (!m) return { type: 'other', scope: null, cleanMessage: subject };
  return {
    type: (m[1] || 'other').toLowerCase(),
    scope: m[2] || null,
    cleanMessage: m[3].trim(),
  };
}

function resolveProjectDir(projectId) {
  const info = projectCache.get(projectId);
  return info?.path || null;
}

const COMMIT_DELIM = '---COMMIT_DELIM---';

async function gitLogWithNumstat(dir, from, to) {
  const untilDate = dayjs(to).add(1, 'day').format('YYYY-MM-DD');
  const args = [
    '-C', dir, 'log', '--all',
    `--since=${from}T00:00:00`, `--before=${untilDate}T00:00:00`,
    `--format=${COMMIT_DELIM}%n%H|%h|%aI|%an|%s`,
    '--numstat', '--diff-merges=first-parent',
  ];
  try {
    const { stdout } = await execFileAsync('git', args, EXEC_OPTS);
    return parseLogOutput(stdout);
  } catch {
    return [];
  }
}

function parseLogOutput(raw) {
  const commits = [];
  const blocks = raw.split(COMMIT_DELIM).filter(Boolean);

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(Boolean);
    if (lines.length === 0) continue;

    const headerLine = lines[0];
    const sepIdx = headerLine.indexOf('|');
    if (sepIdx === -1) continue;

    const [fullHash, hash, date, author, ...rest] = headerLine.split('|');
    const subject = rest.join('|');
    const parsed = parseCommitMessage(subject);

    let additions = 0, deletions = 0;
    const files = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length < 3) continue;
      const add = parts[0] === '-' ? 0 : Number(parts[0]);
      const del = parts[1] === '-' ? 0 : Number(parts[1]);
      additions += add;
      deletions += del;
      const filePath = parts.slice(2).join('\t').replace(/\{(.+) => (.+)\}/, '$2').replace(/ => /, ' → ');
      files.push({
        path: filePath,
        status: del === 0 && add > 0 ? 'created' : 'modified',
        add,
        del,
      });
    }

    commits.push({
      fullHash, hash, date, author,
      type: parsed.type,
      scope: parsed.scope,
      message: parsed.cleanMessage,
      subject,
      additions, deletions, files,
    });
  }
  return commits;
}

export async function getDayCommits(projectId, date) {
  const dir = resolveProjectDir(projectId);
  if (!dir) return [];

  const cacheKey = `${projectId}:${date}:${date}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const results = await gitLogWithNumstat(dir, date, date);

  cacheSet(cacheKey, results, date);
  return results;
}

export async function getCommitsForDateRange(projectId, from, to) {
  const dir = resolveProjectDir(projectId);
  if (!dir) return new Map();

  const cacheKey = `${projectId}:${from}:${to}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const commits = await gitLogWithNumstat(dir, from, to);
  const byDate = new Map();

  for (const c of commits) {
    const d = dayjs(c.date).format('YYYY-MM-DD');
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(c);
  }

  cacheSet(cacheKey, byDate, to);
  return byDate;
}

export async function getCommitCounts(projectId, from, to) {
  const dir = resolveProjectDir(projectId);
  if (!dir) return {};

  const cacheKey = `counts:${projectId}:${from}:${to}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const untilDate = dayjs(to).add(1, 'day').format('YYYY-MM-DD');
  const args = [
    '-C', dir, 'log', '--all',
    `--since=${from}T00:00:00`, `--before=${untilDate}T00:00:00`,
    '--format=%s',
  ];
  try {
    const { stdout } = await execFileAsync('git', args, EXEC_OPTS);
    const counts = {};
    for (const line of stdout.trim().split('\n').filter(Boolean)) {
      const { type } = parseCommitMessage(line);
      counts[type] = (counts[type] || 0) + 1;
    }
    cacheSet(cacheKey, counts, to);
    return counts;
  } catch {
    return {};
  }
}

export function getProjectIds() {
  return [...projectCache.keys()].filter((id) => projectCache.get(id)?.path);
}
