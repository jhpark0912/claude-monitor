function shortToolName(name) {
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    return parts[parts.length - 1];
  }
  return name;
}

export default function ToolUsageCard({ toolTotals }) {
  const merged = {};
  for (const [name, count] of Object.entries(toolTotals || {})) {
    const short = shortToolName(name);
    merged[short] = (merged[short] || 0) + count;
  }
  const sorted = Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxVal = sorted[0]?.[1] || 1;
  const colors = ['#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={iconStyle}>🔧</div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>도구 사용</span>
        <span style={{ fontSize: 10, color: 'var(--mt)', marginLeft: 'auto' }}>이번 달</span>
      </div>
      {sorted.map(([name, count], i) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{ fontSize: 10, color: 'var(--mt)', width: 60, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
          <div style={{ flex: 1, height: 12, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(count / maxVal) * 100}%`, height: '100%', background: colors[i] || colors[4], borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--mt)', width: 32 }}>{count}</div>
        </div>
      ))}
      {sorted.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--mt)', textAlign: 'center', padding: 12 }}>데이터 없음</div>
      )}
    </div>
  );
}

const cardStyle = {
  background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12,
  padding: 16, height: '100%', boxSizing: 'border-box',
};
const iconStyle = {
  width: 24, height: 24, borderRadius: 6, background: '#1a1535',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
};
