import { Router } from 'express';
import { getSessionsByDate, projectCache } from '../services/projectScanner.js';
import { getDayCommits, getProjectIds } from '../services/gitService.js';
import { getMemo } from '../services/memoService.js';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', async (req, res) => {
  const { date, project = 'all' } = req.query;
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
  }

  try {
    const projectIds = project === 'all' ? getProjectIds() : [project];

    const [sessions, ...commitResults] = await Promise.all([
      getSessionsByDate(date, project),
      ...projectIds.map(async (pid) => {
        const info = projectCache.get(pid);
        if (!info?.path) return [];
        const commits = await getDayCommits(pid, date);
        return commits.map((c) => ({ type: 'commit', time: c.date, project: info.label, data: c }));
      }),
    ]);

    const sessionEntries = sessions.map((s) => ({
      type: 'session',
      time: s.startedAt,
      project: s.projectLabel,
      data: s,
    }));

    const commitEntries = commitResults.flat();

    const entries = [...sessionEntries, ...commitEntries]
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    let totalInput = 0, totalOutput = 0;
    for (const s of sessions) {
      totalInput += s.tokens.totalInput;
      totalOutput += s.tokens.totalOutput;
    }

    res.json({
      date,
      entries,
      stats: {
        sessions: sessions.length,
        commits: commitEntries.length,
        totalTokens: { input: totalInput, output: totalOutput },
      },
      memo: getMemo(date),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
