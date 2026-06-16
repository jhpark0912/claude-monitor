import { getProjects, getSessionsByDate } from './projectScanner.js';
import { getDayCommits } from './gitService.js';
import dayjs from 'dayjs';
import 'dayjs/locale/ko.js';

dayjs.locale('ko');

export async function generateReportData(targetDate) {
  const [projects, allSessions] = await Promise.all([
    getProjects(),
    getSessionsByDate(targetDate, 'all'),
  ]);

  const sessionsByProject = new Map();
  for (const s of allSessions) {
    if (!sessionsByProject.has(s.projectDir)) sessionsByProject.set(s.projectDir, []);
    sessionsByProject.get(s.projectDir).push(s);
  }

  const commitResults = await Promise.all(
    projects.map(p => getDayCommits(p.id, targetDate))
  );

  const results = [];
  for (let i = 0; i < projects.length; i++) {
    const proj = projects[i];
    const rawCommits = commitResults[i];
    const rawSessions = sessionsByProject.get(proj.id) || [];

    if (rawCommits.length === 0 && rawSessions.length === 0) continue;

    const commits = rawCommits.map(c => ({
      hash: c.hash, message: c.message, date: c.date,
      prefix: c.type, additions: c.additions, deletions: c.deletions,
    }));

    const sessions = rawSessions.map(s => ({
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      firstPrompt: s.firstPrompt || '',
      durationMinutes: dayjs(s.endedAt).diff(dayjs(s.startedAt), 'minute'),
      tokens: { input: s.tokens.totalInput, output: s.tokens.totalOutput },
      fileKey: s.fileKey,
      projectDir: s.projectDir,
    }));

    const lastCommitTime = commits.length > 0 ? commits[0].date : null;
    const lastSessionTime = sessions.length > 0 ? sessions[sessions.length - 1].endedAt : null;
    const lastActivity = [lastCommitTime, lastSessionTime].filter(Boolean).sort().pop();

    const status = sessions.length > 0 && (!commits.length || lastSessionTime > lastCommitTime)
      ? 'in-progress' : 'done';

    results.push({
      name: proj.label,
      projectDir: proj.id,
      projectPath: proj.path,
      status,
      lastActivityTime: lastActivity,
      commitCount: commits.length,
      sessionCount: sessions.length,
      commits,
      sessions,
    });
  }

  results.sort((a, b) => (b.lastActivityTime || '').localeCompare(a.lastActivityTime || ''));

  return {
    date: targetDate,
    dayOfWeek: dayjs(targetDate).format('dddd'),
    summary: buildSummary(results),
    aiSummary: null,
    projects: results,
    generatedAt: dayjs().format(),
  };
}

function buildSummary(projects) {
  let totalAdd = 0, totalDel = 0, commitCount = 0, sessionCount = 0;
  const prefixCounts = {};
  const allEvents = [];

  for (const p of projects) {
    commitCount += p.commits.length;
    sessionCount += p.sessions.length;
    for (const c of p.commits) {
      totalAdd += c.additions;
      totalDel += c.deletions;
      prefixCounts[c.prefix] = (prefixCounts[c.prefix] || 0) + 1;
      allEvents.push({ time: c.date, project: p.name });
    }
    for (const s of p.sessions) {
      allEvents.push({ time: s.startedAt, project: p.name });
    }
  }

  allEvents.sort((a, b) => a.time.localeCompare(b.time));

  let contextSwitches = 0;
  for (let i = 1; i < allEvents.length; i++) {
    if (allEvents[i].project !== allEvents[i - 1].project) contextSwitches++;
  }

  let longestFocus = { project: null, minutes: 0 };
  if (allEvents.length > 0) {
    let curProj = allEvents[0].project;
    let curStart = allEvents[0].time;
    for (let i = 1; i <= allEvents.length; i++) {
      if (i === allEvents.length || allEvents[i].project !== curProj) {
        const mins = dayjs(allEvents[i - 1].time).diff(dayjs(curStart), 'minute');
        if (mins > longestFocus.minutes) longestFocus = { project: curProj, minutes: mins };
        if (i < allEvents.length) { curProj = allEvents[i].project; curStart = allEvents[i].time; }
      }
    }
  }

  const times = allEvents.map(e => e.time).filter(Boolean);
  return {
    projectCount: projects.length,
    commitCount,
    sessionCount,
    codeChanges: { additions: totalAdd, deletions: totalDel },
    activityStart: times[0] || null,
    activityEnd: times[times.length - 1] || null,
    commitsByPrefix: prefixCounts,
    contextSwitches,
    longestFocus,
  };
}
