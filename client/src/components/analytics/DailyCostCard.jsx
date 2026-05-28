import { useState, useEffect } from 'react';
import { fetchAnalyticsCost } from '../../api/client';

export default function DailyCostCard({ project }) {
  const [period, setPeriod] = useState('4w');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalyticsCost(period, project).then(setData).catch(() => {});
  }, [period, project]);

  const totalCost = data?.totalCost || 0;
  const cacheSavings = data?.cacheSavings || 0;
  const dailyCosts = data?.dailyCosts || [];
  const models = data?.models || { opus: { input: 0, output: 0 }, sonnet: { input: 0, output: 0 }, haiku: { input: 0, output: 0 } };

  const opusCost = (models.opus.input / 1e6) * 15 + (models.opus.output / 1e6) * 75;
  const sonnetCost = (models.sonnet.input / 1e6) * 3 + (models.sonnet.output / 1e6) * 15;
  const haikuCost = (models.haiku.input / 1e6) * 0.25 + (models.haiku.output / 1e6) * 1.25;
  const total = opusCost + sonnetCost + haikuCost || 1;
  const opusPct = Math.round((opusCost / total) * 100);
  const sonnetPct = Math.round((sonnetCost / total) * 100);

  const maxDaily = Math.max(...dailyCosts.map(d => d.opus + d.sonnet + d.haiku), 1);
  const avgDaily = dailyCosts.length > 0
    ? dailyCosts.reduce((s, d) => s + d.opus + d.sonnet + d.haiku, 0) / dailyCosts.length
    : 0;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={iconStyle}>💰</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>일별 비용</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ label: '1주', val: '1w' }, { label: '4주', val: '4w' }, { label: '3개월', val: '3m' }].map(opt => (
            <button key={opt.val} onClick={() => setPeriod(opt.val)} style={{
              ...periodBtn,
              background: period === opt.val ? 'var(--ch-amber)' : 'var(--s2)',
              color: period === opt.val ? '#000' : 'var(--mt)',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Daily bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 70, marginBottom: 4 }}>
        {dailyCosts.map((d, i) => {
          const dayCost = d.opus + d.sonnet + d.haiku;
          const h = (dayCost / maxDaily) * 100;
          const isHigh = avgDaily > 0 && dayCost > avgDaily * 1.5;
          return (
            <div key={i} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${h}%`, minHeight: dayCost > 0 ? 2 : 0,
                background: isHigh ? 'var(--ch-amber)' : 'var(--ch-purple)',
                borderRadius: '2px 2px 0 0',
              }} />
              {isHigh && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: 'var(--ch-amber)', whiteSpace: 'nowrap' }}>
                  ${dayCost.toFixed(1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {dailyCosts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--mt)', marginBottom: 10 }}>
          <span>{dailyCosts[0]?.date?.slice(5)}</span>
          <span>{dailyCosts[dailyCosts.length - 1]?.date?.slice(5)}</span>
        </div>
      )}

      {/* Model breakdown */}
      <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--bd)', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
          <svg viewBox="0 0 120 120" width="100" height="100">
            <circle cx="60" cy="60" r="45" fill="none" stroke="var(--bd)" strokeWidth="14" />
            <circle cx="60" cy="60" r="45" fill="none" stroke="var(--ch-blue)" strokeWidth="14"
              strokeDasharray={`${opusPct * 2.83} ${283 - opusPct * 2.83}`}
              strokeDashoffset="0" transform="rotate(-90 60 60)" />
            <circle cx="60" cy="60" r="45" fill="none" stroke="var(--ch-green)" strokeWidth="14"
              strokeDasharray={`${sonnetPct * 2.83} ${283 - sonnetPct * 2.83}`}
              strokeDashoffset={`${-opusPct * 2.83}`} transform="rotate(-90 60 60)" />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>${totalCost.toFixed(1)}</div>
            <div style={{ fontSize: 9, color: 'var(--mt)' }}>총 비용</div>
          </div>
        </div>
        <div style={{ flex: 1, fontSize: 10 }}>
          {[
            { name: 'Opus', color: 'var(--ch-blue)', cost: opusCost, pct: opusPct },
            { name: 'Sonnet', color: 'var(--ch-green)', cost: sonnetCost, pct: sonnetPct },
            { name: 'Haiku', color: 'var(--ch-amber)', cost: haikuCost, pct: 100 - opusPct - sonnetPct },
          ].map(m => (
            <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ color: 'var(--tx)' }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: m.color, marginRight: 5 }} />
                {m.name}
              </span>
              <span style={{ color: 'var(--tx)', fontWeight: 600 }}>${m.cost.toFixed(1)} ({m.pct}%)</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: 'var(--mt)' }}>
            <span>캐시 절감</span>
            <span style={{ color: 'var(--ch-green)' }}>-${cacheSavings.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12,
  padding: 16, height: '100%', boxSizing: 'border-box',
  overflow: 'hidden',
};
const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
};
const iconStyle = {
  width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--ch-amber) 15%, var(--s2))',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
};
const periodBtn = {
  padding: '4px 10px', borderRadius: 5, fontSize: 10,
  border: 'none', cursor: 'pointer',
};
