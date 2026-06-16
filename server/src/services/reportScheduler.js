import dayjs from 'dayjs';
import 'dayjs/locale/ko.js';
import { generateReportData } from './reportGenerator.js';
import { generateAiSummary } from './geminiService.js';
import { saveReport, getReport } from './reportService.js';

dayjs.locale('ko');

async function generateDailyReport(date) {
  const existing = getReport(date);
  if (existing && !existing.legacy) {
    console.log(`[scheduler] ${date} report already exists, skipping`);
    return;
  }

  console.log(`[scheduler] Generating report for ${date}...`);
  const report = await generateReportData(date);

  if (report.summary.sessionCount === 0 && report.summary.commitCount === 0) {
    console.log(`[scheduler] ${date} has no activity, skipping`);
    return;
  }

  report.aiSummary = await generateAiSummary(report);
  const outPath = saveReport(report);
  console.log(`[scheduler] Report saved: ${outPath}`);
}

export function scheduleReportJob(cron) {
  // 매일 00:05에 어제 보고서 자동 생성
  cron.schedule('5 0 * * *', async () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    try {
      await generateDailyReport(yesterday);
    } catch (err) {
      console.error(`[scheduler] Report generation failed for ${yesterday}:`, err.message);
    }
  });

  console.log('[scheduler] Daily report job scheduled at 00:05');
}
