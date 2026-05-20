export default function DiffBar({ additions, deletions }) {
  const total = additions + deletions;
  if (total === 0) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--gn)' }}>
        +{additions}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--rd)' }}>
        -{deletions}
      </span>
      <div style={{
        display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1, width: 48,
      }}>
        <div style={{
          flex: additions, background: 'var(--gn)', borderRadius: 2, minWidth: total > 0 && additions > 0 ? 2 : 0,
        }} />
        <div style={{
          flex: deletions, background: 'var(--rd)', borderRadius: 2, minWidth: total > 0 && deletions > 0 ? 2 : 0,
        }} />
      </div>
    </div>
  );
}
