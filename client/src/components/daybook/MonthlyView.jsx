import { useMemo } from 'react';
import dayjs from 'dayjs';
import ProjectCard, { TYPES_ORDER, TYPE_CONFIG, mergeByProject, getTypeCounts } from './ProjectCard';

export default function MonthlyView({ data, onDayClick }) {
  const days = data?.days || [];
  const projects = useMemo(() => mergeByProject(days), [days]);
  const typeCounts = useMemo(() => getTypeCounts(projects), [projects]);

  const totalCommits = projects.reduce((a, p) => a + p.commitCount, 0);
  const totalAdd = projects.reduce((a, p) => a + p.totalAdditions, 0);
  const totalDel = projects.reduce((a, p) => a + p.totalDeletions, 0);
  const totalSessions = days.reduce((a, d) => a + (d.sessionCount || 0), 0);
  const totalTokens = days.reduce((a, d) => a + (d.totalTokens || 0), 0);
  const activeDays = days.filter(
    (d) => d.sessionCount > 0 || d.projects?.some((p) => p.commitCount > 0),
  ).length;
  const maxTokens = Math.max(...days.map((d) => d.totalTokens || 0), 1);

  const weeks = useMemo(() => {
    const result = [];
    let cur = null;
    for (const day of days) {
      const ws = dayjs(day.date).startOf('week').format('MM/DD');
      if (!cur || cur.key !== ws) {
        const we = dayjs(day.date).endOf('week').format('MM/DD');
        cur = { key: ws, label: `${ws} ~ ${we}`, days: [] };
        result.push(cur);
      }
      cur.days.push(day);
    }
    return result;
  }, [days]);

  if (!data?.days) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 월간 요약 */}
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
        padding: '16px 20px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>월간 요약</span>
            <span style={{
              fontSize: 11, color: 'var(--dm)', background: 'var(--s2)',
              padding: '2px 8px', borderRadius: 'var(--rx)',
            }}>
              {activeDays}일 활동 · {projects.length}개 프로젝트
            </span>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
            display: 'flex', gap: 12,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--tx)' }}>{totalCommits} commits</span>
            <span style={{ color: 'var(--gn)' }}>+{totalAdd}</span>
            <span style={{ color: 'var(--rd)' }}>-{totalDel}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 10 }}>
          {totalSessions} sessions · {Math.round(totalTokens / 1000)}K tokens
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPES_ORDER.map((type) => {
            const count = typeCounts[type] || 0;
            if (count === 0) return null;
            const cfg = TYPE_CONFIG[type];
            return (
              <span key={type} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 'var(--rx)',
                color: cfg.color,
                background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                fontWeight: 600,
              }}>
                {cfg.emoji} {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* 프로젝트별 카드 */}
      {projects.map((proj) => (
        <ProjectCard key={proj.projectId} proj={proj} showDate />
      ))}

      {/* 일별 활동 차트 */}
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 12 }}>
          일별 활동
        </div>
        {weeks.map((week, wi) => (
          <div key={week.key}>
            <div style={{
              fontSize: 10, color: 'var(--dm)', padding: '8px 0 4px',
              borderTop: wi > 0 ? '1px solid var(--bd)' : 'none',
              marginTop: wi > 0 ? 8 : 0,
            }}>
              {week.label}
            </div>
            {week.days.map((day) => {
              const d = dayjs(day.date);
              const cc = day.projects?.reduce((a, p) => a + (p.commitCount || 0), 0) || 0;
              const hasActivity = day.sessionCount > 0 || cc > 0;
              const barW = hasActivity ? Math.max((day.totalTokens / maxTokens) * 100, 4) : 0;

              return (
                <div
                  key={day.date}
                  onClick={() => onDayClick?.(day.date)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
                    borderRadius: 'var(--rx)', cursor: 'pointer', transition: 'background .15s',
                    opacity: hasActivity ? 1 : 0.3,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--s2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    fontSize: 10, color: 'var(--mt)', width: 28, textAlign: 'right',
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {d.format('ddd')}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: hasActivity ? 'var(--tx)' : 'var(--dm)',
                    width: 24, flexShrink: 0,
                  }}>
                    {d.format('DD')}
                  </span>

                  <div style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: 'var(--s3)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${barW}%`, height: '100%', borderRadius: 4,
                      background: 'linear-gradient(90deg, var(--ac), var(--ac2))',
                      transition: 'width .3s',
                    }} />
                  </div>

                  <span style={{
                    fontSize: 10, width: 24, textAlign: 'right', flexShrink: 0,
                    fontFamily: "'JetBrains Mono',monospace",
                    color: cc > 0 ? 'var(--ac)' : 'var(--dm)',
                    fontWeight: cc > 0 ? 600 : 400,
                  }}>
                    {cc > 0 ? `${cc}c` : ''}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--mt)', width: 28,
                    textAlign: 'right', flexShrink: 0,
                  }}>
                    {day.sessionCount > 0 ? `${day.sessionCount}s` : ''}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--dm)', width: 40,
                    textAlign: 'right', flexShrink: 0,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    {day.totalTokens > 0 ? `${Math.round(day.totalTokens / 1000)}K` : ''}
                  </span>
                  {day.memo && (
                    <span style={{ fontSize: 8, color: 'var(--ac2)' }}>●</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
