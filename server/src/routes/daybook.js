import { Router } from 'express';
import dayjs from 'dayjs';
import { getSessionsByDate, getAvailableDates, projectCache } from '../services/projectScanner.js';
import { getDayCommits, getCommitsForDateRange, getCommitCounts, getProjectIds } from '../services/gitService.js';
import { getMemo, saveMemo, getMemoDates } from '../services/memoService.js';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONCURRENCY = 4;

const COMMIT_TYPES = ['feat', 'fix', 'style', 'refactor', 'docs', 'chore', 'other'];

function groupByType(commits) {
  const grouped = {};
  for (const t of COMMIT_TYPES) grouped[t] = [];
  for (const c of commits) {
    const bucket = grouped[c.type] ? c.type : 'other';
    grouped[bucket].push(c);
  }
  return grouped;
}

async function limitedParallel(items, fn, concurrency = CONCURRENCY) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...await Promise.all(batch.map(fn)));
  }
  return results;
}

// GET /api/daybook?date=YYYY-MM-DD&project=all
router.get('/', async (req, res) => {
  const { date, project = 'all' } = req.query;
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
  }

  try {
    const projectIds = project === 'all' ? getProjectIds() : [project];

    const projectResults = await limitedParallel(projectIds, async (pid) => {
      const info = projectCache.get(pid);
      if (!info?.path) return null;

      const commits = await getDayCommits(pid, date);
      if (commits.length === 0) return null;

      let totalAdd = 0, totalDel = 0;
      for (const c of commits) { totalAdd += c.additions; totalDel += c.deletions; }

      return {
        projectId: pid,
        label: info.label,
        commits: groupByType(commits),
        commitCount: commits.length,
        totalAdditions: totalAdd,
        totalDeletions: totalDel,
      };
    });

    const projects = projectResults.filter(Boolean);

    const sessions = await getSessionsByDate(date, project);
    let totalInput = 0, totalOutput = 0;
    for (const s of sessions) {
      totalInput += s.tokens.totalInput;
      totalOutput += s.tokens.totalOutput;
    }

    res.json({
      date,
      projects,
      sessionSummary: {
        totalSessions: sessions.length,
        totalTokens: { input: totalInput, output: totalOutput },
      },
      memo: getMemo(date),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/daybook/range?from=...&to=...&project=all&aggregate=false
router.get('/range', async (req, res) => {
  const { from, to, project = 'all', aggregate = 'false' } = req.query;
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return res.status(400).json({ error: 'from/to params required (YYYY-MM-DD)' });
  }
  const diffDays = dayjs(to).diff(dayjs(from), 'day');
  if (diffDays < 0 || diffDays > 31) {
    return res.status(400).json({ error: 'range must be 0-31 days' });
  }

  try {
    const isAggregate = aggregate === 'true';
    const projectIds = project === 'all' ? getProjectIds() : [project];

    const allDates = [];
    let d = dayjs(from);
    while (d.isBefore(dayjs(to).add(1, 'day'))) {
      allDates.push(d.format('YYYY-MM-DD'));
      d = d.add(1, 'day');
    }

    const sessionsByDate = await Promise.all(
      allDates.map(async (date) => {
        const sessions = await getSessionsByDate(date, project);
        let totalTokens = 0;
        for (const s of sessions) totalTokens += s.tokens.totalInput + s.tokens.totalOutput;
        return { date, sessionCount: sessions.length, totalTokens };
      })
    );
    const sessionMap = new Map(sessionsByDate.map((s) => [s.date, s]));

    if (isAggregate) {
      const typeCountResults = await limitedParallel(projectIds, (pid) => getCommitCounts(pid, from, to));
      const typeCounts = {};
      for (const counts of typeCountResults) {
        for (const [type, cnt] of Object.entries(counts)) {
          typeCounts[type] = (typeCounts[type] || 0) + cnt;
        }
      }

      const days = allDates.map((date) => {
        const s = sessionMap.get(date);
        return {
          date,
          sessionCount: s.sessionCount,
          totalTokens: s.totalTokens,
          hasMemo: !!getMemo(date),
        };
      });

      res.json({ from, to, aggregate: true, commitTypes: typeCounts, days });
    } else {
      const commitsByProject = new Map();
      await limitedParallel(projectIds, async (pid) => {
        commitsByProject.set(pid, await getCommitsForDateRange(pid, from, to));
      });

      const days = allDates.map((date) => {
        const projectEntries = [];
        for (const pid of projectIds) {
          const info = projectCache.get(pid);
          if (!info?.path) continue;
          const dateMap = commitsByProject.get(pid);
          const commits = dateMap?.get(date) || [];
          if (commits.length === 0) continue;
          projectEntries.push({
            projectId: pid,
            label: info.label,
            commits: groupByType(commits),
            commitCount: commits.length,
          });
        }

        const s = sessionMap.get(date);
        return {
          date,
          projects: projectEntries,
          sessionCount: s.sessionCount,
          totalTokens: s.totalTokens,
          memo: getMemo(date)?.content || null,
        };
      });

      res.json({ from, to, aggregate: false, days });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/daybook/dates?project=all
router.get('/dates', async (req, res) => {
  const { project = 'all' } = req.query;
  try {
    const sessionDates = getAvailableDates(project);
    const memoDates = getMemoDates();
    const all = new Set([...sessionDates, ...memoDates]);
    res.json([...all].sort().reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/daybook/memos/:date
router.put('/memos/:date', (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'invalid date format' });
  }
  const { content } = req.body;
  if (typeof content !== 'string' || content.length > 5000) {
    return res.status(400).json({ error: 'content must be string (max 5000 chars)' });
  }
  try {
    const memo = saveMemo(date, content);
    res.json(memo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
