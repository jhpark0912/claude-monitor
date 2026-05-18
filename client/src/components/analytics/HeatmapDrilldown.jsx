import { useState, useEffect } from 'react';
import { fetchAnalyticsHeatmap } from '../../api/client';

export default function HeatmapDrilldown({ project, onBack }) {
  const [weeks, setWeeks] = useState(4);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalyticsHeatmap(weeks, project).then(setData).catch(() => {});
  }, [weeks, project]);

  const matrix = data?.matrix || Array.from({ length: 7 }, () => Array(24).fill(0));
  const days = data?.days || ['월', '화', '수', '목', '금', '토', '일'];

  const hourlyTotals = Array(24).fill(0);
  for (const row of matrix) {
    row.forEach((v, h) => { hourlyTotals[h] += v; });
  }
  const maxHourly = Math.max(...hourlyTotals, 1);

  const zones = [
    { name: '새벽 (0~6)', color: '#64748b', range: [0, 6] },
    { name: '오전 (6~12)', color: '#f59e0b', range: [6, 12] },
    { name: '오후 (12~18)', color: '#10b981', range: [12, 18] },
    { name: '저녁 (18~24)', color: '#6366f1', range: [18, 24] },
  ];

  function getBarColor(hour) {
    if (hour < 6) return '#64748b';
    if (hour < 12) return '#f59e0b';
    if (hour < 18) return '#10b981';
    return '#6366f1';
  }

  const zoneTotals = zones.map(z => {
    let sum = 0;
    for (let h = z.range[0]; h < z.range[1]; h++) sum += hourlyTotals[h];
    return sum;
  });

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)' }}>🕐 시간대 분석 상세</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ label: '1주', val: 1 }, { label: '4주', val: 4 }, { label: '3개월', val: 12 }].map(opt => (
              <button key={opt.val} onClick={() => setWeeks(opt.val)} style={{
                ...periodBtn,
                background: weeks === opt.val ? '#10b981' : 'var(--s2)',
                color: weeks === opt.val ? '#fff' : 'var(--mt)',
              }}>{opt.label}</button>
            ))}
          </div>
          <button onClick={onBack} style={backBtn}>← Overview</button>
        </div>
      </div>

      {/* Hourly bar chart */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--mt)' }}>시간대별 세션 수 합계</span>
          <div style={{ display: 'flex', gap: 4, fontSize: 9, color: 'var(--mt)' }}>
            <span>0 세션</span>
            <span style={{ marginLeft: 60 }}>{maxHourly}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 40px', gap: 8, alignItems: 'center', height: 22 }}>
              <div style={{
                fontSize: 10, textAlign: 'right',
                color: hourlyTotals[h] === Math.max(...hourlyTotals) ? '#6ee7b7' : 'var(--mt)',
                fontWeight: hourlyTotals[h] === Math.max(...hourlyTotals) ? 600 : 400,
              }}>{h}시</div>
              <div style={{ height: 14, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${(hourlyTotals[h] / maxHourly) * 100}%`,
                  background: `linear-gradient(90deg, ${getBarColor(h)}, ${getBarColor(h)}dd)`,
                }} />
              </div>
              <div style={{ fontSize: 10, color: hourlyTotals[h] > 0 ? 'var(--tx)' : 'var(--mt)', textAlign: 'right' }}>
                {hourlyTotals[h] || ''}
              </div>
            </div>
          ))}
        </div>

        {/* Zone legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--bd)' }}>
          {zones.map((z, i) => (
            <div key={z.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mt)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color }} />
              {z.name}
            </div>
          ))}
        </div>
      </div>

      {/* Zone summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
        {zones.map((z, i) => (
          <div key={z.name} style={{ ...panelStyle, textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: z.color }}>{zoneTotals[i]}</div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 4 }}>{z.name.split(' ')[0]} 세션</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const panelStyle = {
  background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12, padding: 20,
};
const backBtn = {
  background: 'var(--s2)', border: 'none', color: 'var(--mt)',
  padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
};
const periodBtn = {
  padding: '5px 12px', borderRadius: 6, fontSize: 11,
  border: 'none', cursor: 'pointer',
};
