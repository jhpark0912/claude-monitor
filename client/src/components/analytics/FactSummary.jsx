export default function FactSummary({ sessionCount, baseline }) {
  const avgCost = baseline?.avgCostPerSession || 0;
  const avgMin = baseline?.avgDurationMin || 0;
  const totalCost = avgCost * (sessionCount || 0);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatBlock label="세션" value={sessionCount || '—'} color="var(--ac)" />
        <StatBlock label="총 비용" value={totalCost > 0 ? `$${totalCost.toFixed(1)}` : '—'} color="#f59e0b" />
        <StatBlock label="세션당 평균" value={avgCost > 0 ? `$${avgCost.toFixed(2)}` : '—'} color="#ccc" />
        <StatBlock label="평균 세션" value={avgMin > 0 ? `${avgMin}분` : '—'} color="#ccc" />
      </div>
      <div style={{ fontSize: 10, color: 'var(--mt)', marginTop: 8, textAlign: 'center' }}>
        수치만 표시, 판단 없음
      </div>
    </div>
  );
}

function StatBlock({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--mt)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12, padding: 16,
};
