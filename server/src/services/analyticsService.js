import fs from 'fs';
import path from 'path';
import { PROJECTS_DIR, projectCache, getProjects } from './projectScanner.js';
import { parseSessionSummary } from './jsonlParser.js';

let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function buildAnalyticsData(projectFilter) {
  const now = Date.now();
  if (cachedData && (now - cacheTime) < CACHE_TTL && cachedData.projectFilter === projectFilter) {
    return cachedData;
  }

  await getProjects();

  const dirs = fs.readdirSync(PROJECTS_DIR).filter((d) => {
    try { return fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  const sessions = [];

  for (const dir of dirs) {
    if (projectFilter !== 'all' && dir !== projectFilter) continue;

    const dirPath = path.join(PROJECTS_DIR, dir);
    const files = fs.readdirSync(dirPath).filter(
      (f) => f.endsWith('.jsonl') && !f.startsWith('agent-')
    );

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const summary = await parseSessionSummary(filePath);
      if (!summary) continue;

      const project = projectCache.get(dir);
      sessions.push({
        ...summary,
        projectDir: dir,
        projectLabel: project?.label || dir,
      });
    }
  }

  cachedData = { projectFilter, sessions };
  cacheTime = now;
  return cachedData;
}
