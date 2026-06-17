import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import WeekSelector, { getWeekRange } from '../components/weekly-report/WeekSelector';
import ReportEditor from '../components/weekly-report/ReportEditor';
import { fetchDaybookRange, fetchProjects, fetchWeeklyReport, saveWeeklyReport, generateWeeklyAi } from '../api/client';

dayjs.locale('ko');

const TYPES_ORDER = ['feat', 'fix', 'style', 'refactor', 'docs', 'chore', 'other'];

function generateDraft(rangeData, from, to, selectedIds) {
  if (!rangeData?.days) return '';

  const projectMap = new Map();
  for (const day of rangeData.days) {
    if (!day.projects) continue;
    for (const proj of day.projects) {
      if (selectedIds.length > 0 && !selectedIds.includes(proj.projectId)) continue;
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
    for (const c of proj.commits) lines.push(`- ${c.message}`);
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
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rangeData, setRangeData] = useState(null);
  const [savedReport, setSavedReport] = useState(null);
  const abortRef = useRef(null);

  const { from, to } = getWeekRange(baseDate);

  useEffect(() => { fetchProjects().then(setProjects).catch(() => {}); }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSavedReport(null);

    Promise.all([
      fetchDaybookRange(from, to, 'all', false, { signal: controller.signal }),
      fetchWeeklyReport(from, to).catch(() => null),
    ])
      .then(([data, saved]) => {
        if (controller.signal.aborted) return;
        setRangeData(data);
        setStats(buildStats(data));
        if (saved?.markdown) {
          setMarkdown(saved.markdown);
          setSavedReport(saved);
        } else {
          setMarkdown(generateDraft(data, from, to, selectedIds));
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [from, to]);

  useEffect(() => {
    if (!rangeData || savedReport) return;
    setMarkdown(generateDraft(rangeData, from, to, selectedIds));
  }, [selectedIds]);

  const toggleProject = (pid) => {
    setSelectedIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateWeeklyAi(from, to, selectedIds);
      if (result?.projects) {
        const lines = [`## 주간 업무 보고 (${fmtShort(from)} ~ ${fmtShort(to)})`, ''];
        for (const p of result.projects) {
          lines.push(`### ${p.name}`);
          for (const item of p.items) lines.push(`- ${item}`);
          lines.push('');
        }
        setMarkdown(lines.join('\n'));
      }
    } catch (err) {
      alert('AI 생성 실패: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveWeeklyReport(from, to, { markdown });
      setSavedReport(saved);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const availableProjects = (() => {
    if (!rangeData?.days) return [];
    const map = new Map();
    for (const day of rangeData.days) {
      for (const proj of (day.projects || [])) {
        if (!map.has(proj.projectId)) map.set(proj.projectId, proj.label);
      }
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  })();

  return (
    <>
      <div style={{
        background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, gap: 12,
      }}>
        <WeekSelector baseDate={baseDate} onBaseChange={setBaseDate} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
          {availableProjects.map((p) => (
            <label key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
              padding: '3px 8px', borderRadius: 'var(--rx)', cursor: 'pointer',
              background: selectedIds.includes(p.id) || selectedIds.length === 0 ? 'var(--ac-bg)' : 'var(--s2)',
              border: `1px solid ${selectedIds.includes(p.id) ? 'var(--ac-bd)' : 'var(--bd)'}`,
              color: selectedIds.includes(p.id) || selectedIds.length === 0 ? 'var(--ac)' : 'var(--mt)',
            }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => toggleProject(p.id)}
                style={{ width: 12, height: 12, accentColor: 'var(--ac)' }}
              />
              {p.label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {stats && <StatsBadges stats={stats} />}
          <button onClick={handleAiGenerate} disabled={generating} style={{
            padding: '6px 14px', borderRadius: 'var(--rs)', fontSize: 11, fontWeight: 600,
            border: '1px solid var(--ac-bd)', background: 'var(--ac-bg)', color: 'var(--ac)',
            cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.6 : 1,
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {generating ? 'AI 생성 중...' : 'AI 생성'}
          </button>
          <button onClick={handleSave} disabled={saving || !markdown} style={{
            padding: '6px 14px', borderRadius: 'var(--rs)', fontSize: 11, fontWeight: 600,
            border: 'none', background: 'var(--ac)', color: '#fff',
            cursor: saving ? 'wait' : 'pointer', opacity: saving || !markdown ? 0.5 : 1,
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {saving ? '저장 중...' : savedReport ? '저장됨' : '저장'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mt)' }}>
            불러오는 중...
          </div>
        ) : (
          <ReportEditor value={markdown} onChange={(v) => { setMarkdown(v); setSavedReport(null); }} />
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
    <div style={{ display: 'flex', gap: 6 }}>
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
      padding: '4px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{value}</div>
      <div style={{ fontSize: 8, color: 'var(--mt)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
