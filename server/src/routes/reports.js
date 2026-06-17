import { Router } from 'express';
import { getReport, getReportDates, saveReport, getWeeklyReport, saveWeeklyReport } from '../services/reportService.js';
import { generateReportData } from '../services/reportGenerator.js';
import { generateAiSummary, generateWeeklyReport } from '../services/geminiService.js';
import { projectCache } from '../services/projectScanner.js';
import { getCommitsForDateRange, getProjectIds } from '../services/gitService.js';
import dayjs from 'dayjs';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// --- 주간회의록 엔드포인트 (daily 보고서보다 위에 위치해야 :date 매칭 안됨) ---

router.get('/weekly', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from/to required' });
  const report = getWeeklyReport(from, to);
  if (!report) return res.status(404).json({ error: 'not found' });
  res.json(report);
});

router.put('/weekly', (req, res) => {
  const { from, to, markdown, aiGenerated } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from/to required' });
  const report = saveWeeklyReport(from, to, { markdown, aiGenerated });
  res.json(report);
});

router.post('/weekly/generate', async (req, res) => {
  const { from, to, selectedProjects } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from/to required' });
  try {
    const rangeData = await buildRangeData(from, to, selectedProjects);
    const result = await generateWeeklyReport(rangeData, selectedProjects);
    if (!result) return res.status(400).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다' });
    res.json(result);
  } catch (err) {
    console.error('Weekly AI generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

async function buildRangeData(from, to, selectedProjects) {
  const projectIds = selectedProjects?.length ? selectedProjects : getProjectIds();
  const allDates = [];
  let d = dayjs(from);
  while (d.isBefore(dayjs(to).add(1, 'day'))) {
    allDates.push(d.format('YYYY-MM-DD'));
    d = d.add(1, 'day');
  }

  const COMMIT_TYPES = ['feat', 'fix', 'style', 'refactor', 'docs', 'chore', 'other'];
  function groupByType(commits) {
    const grouped = {};
    for (const t of COMMIT_TYPES) grouped[t] = [];
    for (const c of commits) grouped[c.type in grouped ? c.type : 'other'].push(c);
    return grouped;
  }

  const commitsByProject = new Map();
  for (const pid of projectIds) {
    commitsByProject.set(pid, await getCommitsForDateRange(pid, from, to));
  }

  const days = allDates.map((date) => {
    const projects = [];
    for (const pid of projectIds) {
      const info = projectCache.get(pid);
      if (!info?.path) continue;
      const dateMap = commitsByProject.get(pid);
      const commits = dateMap?.get(date) || [];
      if (commits.length === 0) continue;
      projects.push({ projectId: pid, label: info.label, commits: groupByType(commits) });
    }
    return { date, projects };
  });

  return { from, to, days };
}

router.get('/', (req, res) => {
  res.json(getReportDates());
});

router.get('/:date', (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'invalid date format' });
  const report = getReport(date);
  if (!report) return res.status(404).json({ error: 'not found' });
  res.json(report);
});

router.post('/generate', async (req, res) => {
  const { date } = req.body;
  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'invalid date format' });
  }
  try {
    const report = await generateReportData(date);
    report.aiSummary = await generateAiSummary(report);
    saveReport(report);
    res.json(report);
  } catch (err) {
    console.error('Report generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:date/ai-summary', async (req, res) => {
  const { date } = req.params;
  const { projectNames } = req.body || {};
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'invalid date format' });
  const report = getReport(date);
  if (!report || report.legacy) return res.status(404).json({ error: 'report not found' });
  try {
    const summary = await generateAiSummary(report, projectNames);
    if (!summary) return res.status(400).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다' });
    report.aiSummary = summary;
    saveReport(report);
    res.json({ aiSummary: summary });
  } catch (err) {
    console.error('AI summary generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
