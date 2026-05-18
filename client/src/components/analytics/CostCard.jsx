import { useState, useEffect } from 'react';
import { fetchAnalyticsCost } from '../../api/client';

function formatCost(v) {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toFixed(1);
}

function formatTokens(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
}

export default function CostCard({ project }) {
  const [period, setPeriod] = useState('4w');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalyticsCost(period, project).then(setData).catch(() => {});
  }, [period, project]);

  const totalCost = data?.totalCost || 0;
  const cacheSavings = data?.cacheSavings || 0;
  const cacheHitRate = data?.cacheHitRate || 0;

  const models = data?.models || { opus: { input: 0, output: 0 }, sonnet: { input: 0, output: 0 }, haiku: { input: 0, output: 0 } };
  const opusCost = (models.opus.input / 1e6) * 15 + (models.opus.output / 1e6) * 75;
  const sonnetCost = (models.sonnet.input / 1e6) * 3 + (models.sonnet.output / 1e6) * 15;
  const haikuCost = (models.haiku.input / 1e6) * 0.25 + (models.haiku.output / 1e6) * 1.25;

  const total = opusCost + sonnetCost + haikuCost || 1;
  const opusPct = Math.round((opusCost / total) * 100);
  const sonnetPct = Math.round((sonnetCost / total) * 100);
  const haikuPct = 100 - opusPct - sonnetPct;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={iconStyle}>💰</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>비용 구성</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ label: '1주', val: '1w' }, { label: '1개월', val: '4w' }, { label: '3개월', val: '3m' }].map(opt => (
            <button key={opt.val} onClick={() => setPeriod(opt.val)} style={{
              ...periodBtn,
              background: period === opt.val ? '#f59e0b' : 'var(--s2)',
              color: period === opt.val ? '#000' : 'var(--mt)',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16, alignItems: 'center' }}>
        {/* Donut */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="140" height="140" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="70" fill="none" stroke="var(--bd)" strokeWidth="20" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#6366f1" strokeWidth="20"
              strokeDasharray={`${opusPct * 4.4} 440`} strokeDashoffset="0"
              transform="rotate(-90 100 100)" strokeLinecap="round" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#10b981" strokeWidth="20"
              strokeDasharray={`${sonnetPct * 4.4} 440`} strokeDashoffset={`${-opusPct * 4.4}`}
              transform="rotate(-90 100 100)" strokeLinecap="round" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#f59e0b" strokeWidth="20"
              strokeDasharray={`${haikuPct * 4.4} 440`} strokeDashoffset={`${-(opusPct + sonnetPct) * 4.4}`}
              transform="rotate(-90 100 100)" strokeLinecap="round" />
            <text x="100" y="95" textAnchor="middle" fill="var(--tx)" fontSize="24" fontWeight="700">
              ${totalCost.toFixed(1)}
            </text>
            <text x="100" y="115" textAnchor="middle" fill="var(--mt)" fontSize="11">합계</text>
          </svg>
        </div>

        {/* Breakdown table */}
        <div style={{ fontSize: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '12px 1fr 60px 40px 56px', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bd)', fontSize: 10, color: 'var(--mt)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span />
            <span>모델</span>
            <span style={{ textAlign: 'right' }}>토큰</span>
            <span style={{ textAlign: 'right' }}>비율</span>
            <span style={{ textAlign: 'right' }}>비용</span>
          </div>
          {[
            { name: 'Opus', color: '#6366f1', cost: opusCost, pct: opusPct, input: models.opus.input, output: models.opus.output },
            { name: 'Sonnet', color: '#10b981', cost: sonnetCost, pct: sonnetPct, input: models.sonnet.input, output: models.sonnet.output },
            { name: 'Haiku', color: '#f59e0b', cost: haikuCost, pct: haikuPct, input: models.haiku.input, output: models.haiku.output },
          ].map(m => (
            <div key={m.name} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 60px 40px 56px', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
              <span style={{ color: 'var(--tx)', fontWeight: 500 }}>{m.name}</span>
              <span style={{ color: 'var(--mt)', textAlign: 'right' }}>{formatTokens(m.input + m.output)}</span>
              <span style={{ color: 'var(--mt)', textAlign: 'right' }}>{m.pct}%</span>
              <span style={{ color: 'var(--tx)', fontWeight: 600, textAlign: 'right' }}>${m.cost.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cache bar */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--mt)' }}>캐시 적중률</span>
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>-${formatCost(cacheSavings)} 절감 ({cacheHitRate}%)</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--bd)' }}>
          <div style={{ height: '100%', width: `${cacheHitRate}%`, borderRadius: 4, background: 'linear-gradient(90deg, #10b981, #6ee7b7)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--mt)' }}>
          <span>Creation: {formatTokens(data?.cacheCreation || 0)}</span>
          <span>Read: {formatTokens(data?.cacheRead || 0)}</span>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--s1)',
  border: '1px solid var(--bd)',
  borderRadius: 12,
  padding: 16,
  transition: 'border-color .15s',
  height: '100%',
  boxSizing: 'border-box',
};
const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
};
const iconStyle = {
  width: 24, height: 24, borderRadius: 6, background: '#451a03',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
};
const periodBtn = {
  padding: '5px 12px', borderRadius: 6, fontSize: 11,
  border: 'none', cursor: 'pointer',
};
