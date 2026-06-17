import fs from 'fs';
import path from 'path';
import os from 'os';

const REPORT_DIR = path.join(os.homedir(), '.career', 'reports');
fs.mkdirSync(REPORT_DIR, { recursive: true });

export function getReport(date) {
  const jsonPath = path.join(REPORT_DIR, `${date}.json`);
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch {
    // fallback: try legacy .md file
    try {
      const md = fs.readFileSync(path.join(REPORT_DIR, `${date}.md`), 'utf-8');
      return { date, legacy: true, markdown: md };
    } catch { return null; }
  }
}

export function saveReport(report) {
  const filePath = path.join(REPORT_DIR, `${report.date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

export function getReportDates() {
  try {
    const files = fs.readdirSync(REPORT_DIR);
    const dates = new Set();
    for (const f of files) {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.(json|md)$/);
      if (m) dates.add(m[1]);
    }
    return [...dates].sort().reverse();
  } catch { return []; }
}

const WEEKLY_DIR = path.join(os.homedir(), '.career', 'weekly-reports');
fs.mkdirSync(WEEKLY_DIR, { recursive: true });

export function getWeeklyReport(from, to) {
  const filePath = path.join(WEEKLY_DIR, `${from}_${to}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

export function saveWeeklyReport(from, to, data) {
  const filePath = path.join(WEEKLY_DIR, `${from}_${to}.json`);
  const report = { from, to, ...data, savedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return report;
}

export { REPORT_DIR };
