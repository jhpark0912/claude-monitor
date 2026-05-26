import CommitItem from './CommitItem';

const TYPE_CONFIG = {
  feat:     { emoji: '✨', label: 'Features',  color: 'var(--ac)' },
  fix:      { emoji: '🐛', label: 'Fixes',     color: 'var(--gn)' },
  style:    { emoji: '🎨', label: 'Style',     color: 'var(--yw)' },
  refactor: { emoji: '♻️', label: 'Refactor',  color: 'var(--pr)' },
  docs:     { emoji: '📝', label: 'Docs',      color: 'var(--cy, #22d3ee)' },
  chore:    { emoji: '🔧', label: 'Chore',     color: 'var(--mt)' },
  other:    { emoji: '📌', label: 'Other',     color: 'var(--dm)' },
};

export default function CommitGroup({ type, commits, showDate }) {
  if (!commits || commits.length === 0) return null;
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.other;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        paddingLeft: 4,
      }}>
        <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        <span style={{
          fontSize: 10, color: cfg.color, background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
          padding: '1px 6px', borderRadius: 4, fontWeight: 600,
        }}>
          {commits.length}
        </span>
      </div>
      <div style={{ borderLeft: `2px solid ${cfg.color}`, paddingLeft: 8 }}>
        {commits.map((c) => <CommitItem key={c.fullHash} commit={c} showDate={showDate} />)}
      </div>
    </div>
  );
}
