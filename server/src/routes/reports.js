import { Router } from 'express';
import { getReport, getReportDates, saveReport } from '../services/reportService.js';
import { generateReportData } from '../services/reportGenerator.js';
import { generateAiSummary } from '../services/geminiService.js';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
