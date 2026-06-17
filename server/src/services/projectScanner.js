import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { resolveProjectPath, extractProjectLabel, labelFromDirName } from '../utils/pathDecoder.js';
import { readFirstTimestamp, readLastTimestamp, parseSessionSummary, parseDayActivity } from './jsonlParser.js';
import dayjs from 'dayjs';

export const CLAUDE_DIR = path.join(os.homedir(), '.claude');
export const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
export const SESSIONS_DIR = path.join(CLAUDE_DIR, 'sessions');

export const projectCache = new Map();
const dateIndex = new Map();
let indexBuilt = false;

export async function getProjects() {
  const dirs = fs.readdirSync(PROJECTS_DIR).filter((d) => {
    const stat = fs.statSync(path.join(PROJECTS_DIR, d));
    return stat.isDirectory();
  });

  const projects = [];
  for (const dir of dirs) {
    let info = projectCache.get(dir);
    if (!info) {
      const projectPath = await resolveProjectPath(dir, PROJECTS_DIR);
      info = {
        id: dir,
        path: projectPath,
        label: extractProjectLabel(projectPath) || labelFromDirName(dir),
      };
      projectCache.set(dir, info);
    }

    const jsonlFiles = listJsonlFiles(dir);
    projects.push({ ...info, sessionCount: jsonlFiles.length });
  }

  return projects.sort((a, b) => a.label.localeCompare(b.label));
}

export async function buildDateIndex() {
  if (indexBuilt) return;

  const dirs = fs.readdirSync(PROJECTS_DIR).filter((d) => {
    try { return fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  const promises = [];
  for (const dir of dirs) {
    const files = listJsonlFiles(dir);
    for (const file of files) {
      const filePath = path.join(PROJECTS_DIR, dir, file);
      promises.push(indexFile(filePath, dir));
    }
  }

  await Promise.all(promises);
  indexBuilt = true;
  console.log(`Date index built: ${dateIndex.size} sessions`);
}

async function indexFile(filePath, projectDir) {
  if (dateIndex.has(filePath)) return;
  const [firstTs, lastTs] = await Promise.all([
    readFirstTimestamp(filePath),
    readLastTimestamp(filePath),
  ]);
  if (firstTs) {
    dateIndex.set(filePath, {
      projectDir,
      startDate: dayjs(firstTs).format('YYYY-MM-DD'),
      endDate: dayjs(lastTs || firstTs).format('YYYY-MM-DD'),
      fileName: path.basename(filePath),
    });
  }
}

export async function reindexFile(filePath) {
  const existing = dateIndex.get(filePath);
  if (!existing) return;
  const lastTs = await readLastTimestamp(filePath);
  if (lastTs) {
    existing.endDate = dayjs(lastTs).format('YYYY-MM-DD');
  }
}

export async function refreshIndex() {
  const dirs = fs.readdirSync(PROJECTS_DIR).filter((d) => {
    try { return fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  const tasks = [];
  for (const dir of dirs) {
    const files = listJsonlFiles(dir);
    for (const file of files) {
      const filePath = path.join(PROJECTS_DIR, dir, file);
      if (!dateIndex.has(filePath)) {
        tasks.push(indexFile(filePath, dir));
      } else {
        tasks.push(reindexFile(filePath));
      }
    }
  }

  if (tasks.length > 0) await Promise.all(tasks);
}

export async function getSessionsByDate(date, projectFilter) {
  await refreshIndex();

  const targetDate = dayjs(date).format('YYYY-MM-DD');
  const matchingFiles = [];

  for (const [filePath, info] of dateIndex) {
    if (targetDate < info.startDate || targetDate > info.endDate) continue;
    if (projectFilter && projectFilter !== 'all' && info.projectDir !== projectFilter) continue;
    matchingFiles.push({ filePath, ...info });
  }

  const activeSessions = getActiveSessions();
  const results = [];
  for (const file of matchingFiles) {
    const multiDay = file.startDate !== file.endDate;
    const summary = multiDay
      ? await parseDayActivity(file.filePath, targetDate)
      : await parseSessionSummary(file.filePath);
    if (!summary) continue;

    const project = projectCache.get(file.projectDir);
    results.push({
      ...summary,
      fileKey: file.fileName,
      projectDir: file.projectDir,
      projectPath: project?.path || file.projectDir,
      projectLabel: project?.label || file.projectDir,
      isActive: activeSessions.has(summary.sessionId),
      isMultiDay: multiDay,
      sessionStartDate: file.startDate,
    });
  }

  return results.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

export async function getSessionsByProject(projectDir) {
  await refreshIndex();

  const matchingFiles = [];
  for (const [filePath, info] of dateIndex) {
    if (info.projectDir !== projectDir) continue;
    matchingFiles.push({ filePath, ...info });
  }

  const activeSessions = getActiveSessions();

  const results = [];
  for (const file of matchingFiles) {
    const summary = await parseSessionSummary(file.filePath);
    if (!summary) continue;

    const project = projectCache.get(projectDir);
    results.push({
      ...summary,
      fileKey: file.fileName,
      projectDir,
      projectPath: project?.path || projectDir,
      projectLabel: project?.label || projectDir,
      isActive: activeSessions.has(summary.sessionId),
    });
  }

  return results.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export function getAvailableDates(projectFilter) {
  const dates = new Set();
  for (const [, info] of dateIndex) {
    if (projectFilter && projectFilter !== 'all' && info.projectDir !== projectFilter) continue;
    let d = dayjs(info.startDate);
    const end = dayjs(info.endDate);
    while (d.isBefore(end) || d.isSame(end, 'day')) {
      dates.add(d.format('YYYY-MM-DD'));
      d = d.add(1, 'day');
    }
  }
  return [...dates].sort().reverse();
}

function listJsonlFiles(projectDir) {
  try {
    return fs.readdirSync(path.join(PROJECTS_DIR, projectDir)).filter(
      (f) => f.endsWith('.jsonl') && !f.startsWith('agent-')
    );
  } catch { return []; }
}

function getActiveSessions() {
  const active = new Set();
  try {
    const files = fs.readdirSync(SESSIONS_DIR);
    const candidates = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = JSON.parse(
          fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8')
        );
        if (content.pid && content.sessionId) {
          candidates.push(content);
        }
      } catch { /* skip */ }
    }

    if (candidates.length === 0) return active;

    const alivePids = getAlivePids(candidates.map(c => c.pid));
    for (const c of candidates) {
      if (alivePids.has(c.pid)) active.add(c.sessionId);
    }
  } catch { /* sessions dir may not exist */ }
  return active;
}

const processNameCache = new Map();
const PROCESS_CACHE_TTL = 60_000;

function getAlivePids(pids) {
  const alive = new Set();
  const unchecked = [];

  for (const pid of pids) {
    try { process.kill(pid, 0); } catch { continue; }

    if (process.platform !== 'win32') {
      alive.add(pid);
      continue;
    }

    const cached = processNameCache.get(pid);
    if (cached && Date.now() - cached.ts < PROCESS_CACHE_TTL) {
      if (cached.alive) alive.add(pid);
      continue;
    }
    unchecked.push(pid);
  }

  if (unchecked.length > 0 && process.platform === 'win32') {
    const processMap = getWindowsProcessMap();
    const now = Date.now();
    for (const pid of unchecked) {
      const name = processMap.get(pid);
      const isAlive = !!(name && (name.includes('node') || name.includes('claude')));
      processNameCache.set(pid, { alive: isAlive, ts: now });
      if (isAlive) alive.add(pid);
    }
  }

  return alive;
}

let cachedProcessMap = null;
let processMapTime = 0;
const PROCESS_MAP_TTL = 10_000;

function getWindowsProcessMap() {
  const now = Date.now();
  if (cachedProcessMap && now - processMapTime < PROCESS_MAP_TTL) {
    return cachedProcessMap;
  }
  const map = new Map();
  try {
    const out = execSync('tasklist /FO CSV /NH', {
      encoding: 'utf-8', timeout: 5000, windowsHide: true,
    });
    for (const line of out.split('\n')) {
      const match = line.match(/^"([^"]+)","(\d+)"/);
      if (match) map.set(Number(match[2]), match[1].toLowerCase());
    }
  } catch { /* fallback: empty map */ }
  cachedProcessMap = map;
  processMapTime = now;
  return map;
}

export function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }

  if (process.platform !== 'win32') return true;

  const cached = processNameCache.get(pid);
  if (cached && Date.now() - cached.ts < PROCESS_CACHE_TTL) {
    return cached.alive;
  }

  const processMap = getWindowsProcessMap();
  const name = processMap.get(pid);
  const alive = !!(name && (name.includes('node') || name.includes('claude')));
  processNameCache.set(pid, { alive, ts: Date.now() });
  return alive;
}
