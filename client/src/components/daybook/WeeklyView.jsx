import { useMemo } from 'react';
import ProjectCard, { TYPES_ORDER, TYPE_CONFIG, mergeByProject, getTypeCounts } from './ProjectCard';

export default function WeeklyView({ data }) {
  const projects = useMemo(() => mergeByProject(data?.days || []), [data]);
  const typeCounts = useMemo(() => getTypeCounts(projects), [projects]);

  const totalCommits = projects.reduce((a, p) => a + p.commitCount, 0);
  const totalAdd = projects.reduce((a, p) => a + p.totalAdditions, 0);
  const totalDel = projects.reduce((a, p) => a + p.totalDeletions, 0);

  if (totalCommits === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--dm)' }}>
        이 주간에 커밋이 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 주간 요약 */}
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
        padding: '16px 20px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>주간 요약</span>
            <span style={{
              fontSize: 11, color: 'var(--dm)', background: 'var(--s2)',
              padding: '2px 8px', borderRadius: 'var(--rx)',
            }}>
              {projects.length}개 프로젝트
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

      {/* 프로젝트별 커밋 카드 */}
      {projects.map((proj) => (
        <ProjectCard key={proj.projectId} proj={proj} />
      ))}
    </div>
  );
}
