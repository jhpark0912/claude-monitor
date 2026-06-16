import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
import dayjs from 'dayjs';
import 'dayjs/locale/ko.js';
import { generateReportData } from '../src/services/reportGenerator.js';
import { generateAiSummary } from '../src/services/geminiService.js';
import { saveReport } from '../src/services/reportService.js';

dayjs.locale('ko');

const targetDate = process.argv[2] || dayjs().subtract(1, 'day').format('YYYY-MM-DD');

async function main() {
  console.log(`Generating report for ${targetDate}...`);
  const report = await generateReportData(targetDate);

  console.log(`Found ${report.summary.projectCount} projects, ${report.summary.commitCount} commits, ${report.summary.sessionCount} sessions`);

  report.aiSummary = await generateAiSummary(report);
  if (report.aiSummary) {
    console.log('AI summary generated');
  } else {
    console.log('AI summary skipped (no GEMINI_API_KEY)');
  }

  const outPath = saveReport(report);
  console.log(`Report saved: ${outPath}`);
}

main().catch((err) => {
  console.error('Report generation failed:', err);
  process.exit(1);
});
