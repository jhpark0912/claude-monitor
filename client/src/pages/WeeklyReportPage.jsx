import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import WeekSelector, { getWeekRange } from '../components/weekly-report/WeekSelector';
import ReportEditor from '../components/weekly-report/ReportEditor';
import { fetchDaybookRange } from '../api/client';

dayjs.locale('ko');

const TYPES_ORDER = ['feat', 'fix', 'style', 'refactor', 'docs', 'chore', 'other'];

/**
 * API 응답(days별 프로젝트×커밋)을 프로젝트별로 병합하여
 * 마크다운 초안을 생성한다.
 */
function generateDraft(rangeData, from, to) {
  if (!rangeData?.days) return '';

  // 프로젝트별 커밋 병합
  const projectMap = new Map();
  for (const day of rangeData.days) {
    if (!day.projects) continue;
    for (const proj of day.projects) {
      if (!projectMap.has(proj.projectId)) {
        projectMap.set(proj.projectId, { label: proj.label, commits: [] });
      }
      const entry = projectMap.get(proj.projectId);
      for (const type of TYPES_ORDER) {
        const items = proj.commits?.[type] || [];
        for (const c of items) entry.commits.push({ ...c, type });
      }
    }
  }

  if (projectMap.size === 0) return `## 주간 업무 보고 (${fmtShort(from)} ~ ${fmtShort(to)})\n\n커밋 내역이 없습니다.\n`;

  const lines = [`## 주간 업무 보고 (${fmtShort(from)} ~ ${fmtShort(to)})`, ''];

  for (const [, proj] of projectMap) {
    lines.push(`### ${proj.label}`);
    for (const c of proj.commits) {
      lines.push(`- ${c.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function fmtShort(dateStr) {
  return dayjs(dateStr).format('MM.DD');
}

export default function WeeklyReportPage({ project = 'all' }) {
  const [baseDate, setBaseDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const abortRef = useRef(null);

  const { from, to } = getWeekRange(baseDate);

  // 주차 또는 프로젝트 변경 시 자동 생성
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    fetchDaybookRange(from, to, project, false, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setMarkdown(generateDraft(data, from, to));
        setStats(buildStats(data));
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [from, to, project]);

  return (
    <>
      {/* 상단 바 */}
      <div style={{
        background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <WeekSelector baseDate={baseDate} onBaseChange={setBaseDate} />
        {stats && <StatsBadges stats={stats} />}
      </div>

      {/* 편집 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mt)' }}>
            불러오는 중...
          </div>
        ) : (
          <ReportEditor value={markdown} onChange={setMarkdown} />
        )}
      </div>
    </>
  );
}

function buildStats(data) {
  if (!data?.days) return null;
  let commits = 0, sessions = 0, projects = new Set();
  for (const day of data.days) {
    sessions += day.sessionCount || 0;
    if (day.projects) {
      for (const p of day.projects) {
        projects.add(p.projectId);
        commits += p.commitCount || 0;
      }
    }
  }
  return { commits, sessions, projectCount: projects.size };
}

function StatsBadges({ stats }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Badge value={stats.projectCount} label="프로젝트" />
      <Badge value={stats.commits} label="커밋" />
      <Badge value={stats.sessions} label="세션" />
    </div>
  );
}

function Badge({ value, label }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
      padding: '6px 14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--mt)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
