import { Router } from 'express';
import { getObjectives, saveObjective, deleteObjective, getObjectiveReport, saveObjectiveReport } from '../services/objectiveService.js';
import { generateObjectivesReport } from '../services/geminiService.js';
import { projectCache } from '../services/projectScanner.js';
import { getCommitsForDateRange, getProjectIds } from '../services/gitService.js';
import dayjs from 'dayjs';

const router = Router();

router.get('/', (req, res) => {
  res.json(getObjectives());
});

router.post('/', (req, res) => {
  const obj = saveObjective(req.body);
  res.json(obj);
});

router.delete('/:id', (req, res) => {
  deleteObjective(req.params.id);
  res.json({ ok: true });
});

router.get('/report/:period', (req, res) => {
  const report = getObjectiveReport(req.params.period);
  if (!report) return res.status(404).json({ error: 'not found' });
  res.json(report);
});

router.put('/report/:period', (req, res) => {
  const saved = saveObjectiveReport(req.params.period, req.body);
  res.json(saved);
});

router.post('/generate', async (req, res) => {
  const { period } = req.body;
  if (!period) return res.status(400).json({ error: 'period required (YYYY-MM)' });

  try {
    const objectives = getObjectives();
    if (objectives.length === 0) return res.status(400).json({ error: '설정된 과제가 없습니다' });

    const from = dayjs(period).startOf('month').format('YYYY-MM-DD');
    const to = dayjs(period).endOf('month').format('YYYY-MM-DD');
    const projectIds = getProjectIds();

    const commitsByProject = new Map();
    for (const pid of projectIds) {
      commitsByProject.set(pid, await getCommitsForDateRange(pid, from, to));
    }

    const projectData = [];
    for (const pid of projectIds) {
      const info = projectCache.get(pid);
      if (!info?.path) continue;
      const dateMap = commitsByProject.get(pid);
      const allCommits = [];
      for (const [, commits] of (dateMap || [])) {
        allCommits.push(...commits);
      }
      if (allCommits.length === 0) continue;
      projectData.push({ projectId: pid, label: info.label, commits: allCommits });
    }

    const result = await generateObjectivesReport(objectives, projectData, period);
    if (!result) return res.status(400).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다' });
    res.json(result);
  } catch (err) {
    console.error('Objectives report generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
