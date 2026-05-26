import { useState } from 'react';
import CommitGroup from './CommitGroup';

export const TYPES_ORDER = ['feat', 'fix', 'style', 'refactor', 'docs', 'chore', 'other'];
export const TYPE_CONFIG = {
  feat:     { emoji: '✨', color: 'var(--ac)' },
  fix:      { emoji: '🐛', color: 'var(--gn)' },
  style:    { emoji: '🎨', color: 'var(--yw)' },
  refactor: { emoji: '♻️',  color: 'var(--pr)' },
  docs:     { emoji: '📝', color: 'var(--cy, #22d3ee)' },
  chore:    { emoji: '🔧', color: 'var(--mt)' },
  other:    { emoji: '📌', color: 'var(--dm)' },
};

export function mergeByProject(days) {
  const map = new Map();
  for (const day of days) {
    if (!day.projects) continue;
    for (const proj of day.projects) {
      if (!map.has(proj.projectId)) {
        map.set(proj.projectId, {
          projectId: proj.projectId,
          label: proj.label,
          commits: Object.fromEntries(TYPES_ORDER.map((t) => [t, []])),
          commitCount: 0,
          totalAdditions: 0,
          totalDeletions: 0,
        });
      }
      const merged = map.get(proj.projectId);
      for (const type of TYPES_ORDER) {
        const items = proj.commits?.[type] || [];
        merged.commits[type].push(...items);
        for (const c of items) {
          merged.totalAdditions += c.additions || 0;
          merged.totalDeletions += c.deletions || 0;
        }
      }
      merged.commitCount += proj.commitCount || 0;
    }
  }
  return [...map.values()].sort((a, b) => b.commitCount - a.commitCount);
}

export function getTypeCounts(projects) {
  const counts = {};
  for (const proj of projects) {
    for (const type of TYPES_ORDER) {
      counts[type] = (counts[type] || 0) + (proj.commits[type]?.length || 0);
    }
  }
  return counts;
}

export default function ProjectCard({ proj, showDate = true }) {
  const [open, setOpen] = useState(false);

  const typeBadges = TYPES_ORDER
    .filter((t) => proj.commits[t]?.length > 0)
    .map((t) => ({ type: t, count: proj.commits[t].length, ...TYPE_CONFIG[t] }));

  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '12px 16px',
          borderBottom: open ? '1px solid var(--bd)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', transition: 'background .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--s2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--dm)', width: 12, flexShrink: 0 }}>
            {open ? '▼' : '▶'}
          </span>
          <span style={{
            width: 8, height: 8, borderRadius: 3, background: 'var(--ac)', flexShrink: 0,
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>
            {proj.label}
          </span>
          <span style={{
            fontSize: 10, color: 'var(--dm)', background: 'var(--s2)',
            padding: '2px 8px', borderRadius: 'var(--rx)',
          }}>
            {proj.commitCount}개 커밋
          </span>
          {!open && typeBadges.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {typeBadges.map((b) => (
                <span key={b.type} style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 'var(--rx)',
                  color: b.color, fontWeight: 600,
                  background: `color-mix(in srgb, ${b.color} 12%, transparent)`,
                }}>
                  {b.emoji} {b.count}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
          display: 'flex', gap: 8, flexShrink: 0,
        }}>
          <span style={{ color: 'var(--gn)' }}>+{proj.totalAdditions}</span>
          <span style={{ color: 'var(--rd)' }}>-{proj.totalDeletions}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '12px 16px' }}>
          {TYPES_ORDER.map((type) => (
            <CommitGroup
              key={type}
              type={type}
              commits={proj.commits[type]}
              showDate={showDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
