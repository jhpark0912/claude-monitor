import { useState } from 'react';
import dayjs from 'dayjs';
import { generateAiSummary } from '../api/client';
import SwimLane from './SwimLane';

const PREFIX_COLORS = {
  feat: '#818CF8', fix: '#F87171', chore: '#9CA3AF',
  refactor: '#34D399', docs: '#FBBF24', style: '#F472B6',
  test: '#60A5FA', other: '#6B7280',
};
const PREFIX_LABELS = {
  feat: '기능', fix: '수정', chore: '잡무', refactor: '리팩터',
  docs: '문서', style: '스타일', test: '테스트', other: '기타',
};

export default function DailySummary({ report, onSessionClick }) {
  const { summary, projects } = report;
  const [expanded, setExpanded] = useState(null);
  const [aiSummary, setAiSummary] = useState(report.aiSummary);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState(() => projects.map(p => p.name));

  const toggleProject = (name) => {
    setSelectedProjects(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const allSelected = selectedProjects.length === projects.length;
  const toggleAll = () => setSelectedProjects(allSelected ? [] : projects.map(p => p.name));

  const handleAiSummary = async () => {
    if (selectedProjects.length === 0) { alert('프로젝트를 1개 이상 선택하세요'); return; }
    setAiLoading(true);
    try {
      const names = allSelected ? undefined : selectedProjects;
      const res = await generateAiSummary(report.date, names);
      setAiSummary(res.aiSummary);
    } catch (e) {
      alert(e.message || 'AI 요약 생성 실패');
    } finally { setAiLoading(false); }
  };

  const openSession = (project, session) => {
    onSessionClick({
      projectDir: session.projectDir,
      fileKey: session.fileKey,
      projectLabel: project.name,
      _timeRange: `${dayjs(session.startedAt).format('HH:mm')}~${dayjs(session.endedAt).format('HH:mm')}`,
      tokens: { totalInput: session.tokens?.input || 0, totalOutput: session.tokens?.output || 0 },
    });
  };

  if (projects.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dm)' }}>이 날짜에는 활동 기록이 없습니다.</div>;
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* AI 요약 + 통계 */}
      <div style={{
        padding: '18px 20px', borderRadius: 'var(--r)',
        background: 'linear-gradient(135deg, rgba(129,140,248,.08), rgba(192,132,252,.06))',
        border: '1px solid rgba(129,140,248,.15)',
      }}>
        {aiSummary ? (
          <AiSummaryView data={aiSummary} />
        ) : (
          <span style={{ fontSize: 13, color: 'var(--dm)', fontStyle: 'italic' }}>AI 요약 없음</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <ProjectChip label="전체" selected={allSelected} onClick={toggleAll} />
          {projects.map(p => (
            <ProjectChip key={p.projectDir} label={p.name} selected={selectedProjects.includes(p.name)} onClick={() => toggleProject(p.name)} />
          ))}
          <button onClick={handleAiSummary} disabled={aiLoading || selectedProjects.length === 0} style={{
            padding: '4px 12px', borderRadius: 'var(--rx)', fontSize: 11, fontWeight: 600,
            border: '1px solid rgba(192,132,252,.3)', background: 'rgba(192,132,252,.08)',
            color: 'var(--pr)', cursor: aiLoading ? 'wait' : 'pointer',
            opacity: (aiLoading || selectedProjects.length === 0) ? 0.5 : 1, marginLeft: 4,
          }}>
            {aiLoading ? '생성 중...' : aiSummary ? '재생성' : 'AI 요약 생성'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <Badge label="프로젝트" value={summary.projectCount} />
          <Badge label="커밋" value={summary.commitCount} />
          <Badge label="세션" value={summary.sessionCount} />
          <Badge label="코드" value={`+${summary.codeChanges.additions} -${summary.codeChanges.deletions}`} mono />
          {summary.activityStart && (
            <Badge label="활동" value={`${dayjs(summary.activityStart).format('HH:mm')}~${dayjs(summary.activityEnd).format('HH:mm')}`} />
          )}
        </div>
      </div>

      {/* 이어서 하기 */}
      <Section title="이어서 하기">
        {projects.map((p) => (
          <div key={p.projectDir} style={{ border: '1px solid var(--bd)', borderRadius: 'var(--rs)', marginBottom: 8, overflow: 'hidden' }}>
            <div
              onClick={() => setExpanded(expanded === p.projectDir ? null : p.projectDir)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--s2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 10, transform: expanded === p.projectDir ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--dm)' }}>▶</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx)', flex: 1 }}>{p.name}</span>
              <StatusTag status={p.status} />
              <span style={{ fontSize: 11, color: 'var(--dm)', fontFamily: "'JetBrains Mono', monospace" }}>
                {p.commitCount}c · {p.sessionCount}s
              </span>
              {p.lastActivityTime && (
                <span style={{ fontSize: 11, color: 'var(--mt)' }}>마지막 {dayjs(p.lastActivityTime).format('HH:mm')}</span>
              )}
            </div>
            {expanded === p.projectDir && (
              <div style={{ borderTop: '1px solid var(--bd)', padding: '12px 16px', background: 'var(--s2)' }}>
                {p.commits.length > 0 && (
                  <div style={{ marginBottom: p.sessions.length > 0 ? 10 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dm)', marginBottom: 6 }}>커밋</div>
                    {p.commits.map((c) => (
                      <div key={c.hash} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 3, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: (PREFIX_COLORS[c.prefix] || '#6B7280') + '20', color: PREFIX_COLORS[c.prefix] || '#6B7280', fontWeight: 600, flexShrink: 0 }}>{c.prefix}</span>
                        <span style={{ color: 'var(--tx)', flex: 1 }}>{c.message}</span>
                        <span style={{ color: 'var(--dm)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>+{c.additions} -{c.deletions}</span>
                      </div>
                    ))}
                  </div>
                )}
                {p.sessions.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dm)', marginBottom: 6 }}>세션 (클릭하여 대화 보기)</div>
                    {p.sessions.map((s, i) => (
                      <div key={i} onClick={() => openSession(p, s)} style={{
                        display: 'flex', gap: 8, fontSize: 12, marginBottom: 3, alignItems: 'center',
                        cursor: 'pointer', padding: '3px 4px', borderRadius: 4,
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ac-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ color: 'var(--dm)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                          {dayjs(s.startedAt).format('HH:mm')}~{dayjs(s.endedAt).format('HH:mm')}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--tx)' }}>
                          {s.firstPrompt || '(프롬프트 없음)'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--dm)', flexShrink: 0 }}>{s.durationMinutes}분</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* 타임라인 */}
      <Section title="타임라인">
        <SwimLane projects={projects} />
        <TimelineText summary={summary} />
      </Section>

      {/* 작업 피드백 */}
      <Section title="작업 피드백">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <PrefixChart prefixes={summary.commitsByPrefix} total={summary.commitCount} />
          <InsightCard summary={summary} />
        </div>
      </Section>
    </div>
  );
}

function Badge({ label, value, mono }) {
  return (
    <span style={{
      fontSize: 11, padding: '4px 10px', borderRadius: 'var(--rx)',
      background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)',
      color: 'var(--mt)', fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
    }}>
      <span style={{ color: 'var(--dm)', marginRight: 4 }}>{label}</span>{value}
    </span>
  );
}

function StatusTag({ status }) {
  const done = status === 'done';
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
      background: done ? 'rgba(74,222,128,.1)' : 'rgba(251,191,36,.1)',
      color: done ? 'var(--gn)' : '#FBBF24',
      border: `1px solid ${done ? 'rgba(74,222,128,.2)' : 'rgba(251,191,36,.2)'}`,
    }}>
      {done ? '완료' : '진행중'}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function TimelineText({ summary }) {
  if (!summary.activityStart) return null;
  const parts = [];
  const startH = dayjs(summary.activityStart).hour();
  const endH = dayjs(summary.activityEnd).hour();
  parts.push(`${startH}시~${endH}시 활동`);
  if (summary.contextSwitches === 0) parts.push('단일 프로젝트 집중');
  else if (summary.contextSwitches <= 2) parts.push('자연스러운 전환');
  else parts.push(`${summary.contextSwitches}회 컨텍스트 전환`);
  if (summary.longestFocus?.minutes > 30) {
    parts.push(`최장 집중: ${summary.longestFocus.project} ${summary.longestFocus.minutes}분`);
  }
  return <div style={{ fontSize: 12, color: 'var(--dm)', marginTop: 8 }}>{parts.join(' · ')}</div>;
}

function PrefixChart({ prefixes, total }) {
  const entries = Object.entries(prefixes).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div style={{ padding: 16, color: 'var(--dm)', fontSize: 12 }}>커밋 없음</div>;
  const max = entries[0][1];
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dm)', marginBottom: 10 }}>작업 유형</div>
      {entries.map(([prefix, count]) => (
        <div key={prefix} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 36, fontSize: 10, fontWeight: 600, color: PREFIX_COLORS[prefix] || '#6B7280', textAlign: 'right' }}>
            {PREFIX_LABELS[prefix] || prefix}
          </span>
          <div style={{ flex: 1, height: 14, background: 'var(--s1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: PREFIX_COLORS[prefix] || '#6B7280', borderRadius: 3, opacity: 0.7 }} />
          </div>
          <span style={{ width: 20, fontSize: 11, color: 'var(--mt)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectChip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500,
      border: `1px solid ${selected ? 'rgba(129,140,248,.4)' : 'var(--bd)'}`,
      background: selected ? 'rgba(129,140,248,.12)' : 'transparent',
      color: selected ? 'var(--ac)' : 'var(--dm)',
      cursor: 'pointer', transition: 'all .15s',
    }}>
      {label}
    </button>
  );
}

function AiSummaryView({ data }) {
  // 기존 string 호환
  if (typeof data === 'string') {
    return <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--tx)' }}>{data}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--tx)' }}>{data.overview}</div>
      {data.projects?.map((p) => (
        <div key={p.name} style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ac)', marginBottom: 4 }}>{p.name}</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--mt)' }}>{p.summary}</div>
          {p.nextStep && (
            <div style={{ fontSize: 12, color: 'var(--pr)', marginTop: 4 }}>→ {p.nextStep}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function InsightCard({ summary }) {
  const { codeChanges, contextSwitches, longestFocus } = summary;
  const rows = [
    { label: '추가된 코드', value: `+${codeChanges.additions}`, color: 'var(--gn)' },
    { label: '삭제된 코드', value: `-${codeChanges.deletions}`, color: 'var(--rd)' },
    { label: '컨텍스트 전환', value: `${contextSwitches}회` },
  ];
  if (longestFocus?.project) {
    rows.push({ label: '최장 집중', value: `${longestFocus.project} (${longestFocus.minutes}분)` });
  }
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dm)', marginBottom: 10 }}>인사이트</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: 'var(--mt)' }}>{r.label}</span>
          <span style={{ fontWeight: 600, color: r.color || 'var(--tx)', fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
