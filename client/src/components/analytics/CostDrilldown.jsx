import { useState, useEffect } from 'react';
import { fetchAnalyticsCost } from '../../api/client';
import { formatTokens } from '../../utils/colors';

export default function CostDrilldown({ project, onBack }) {
  const [period, setPeriod] = useState('4w');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalyticsCost(period, project).then(setData).catch(() => {});
  }, [period, project]);

  const totalCost = data?.totalCost || 0;
  const cacheSavings = data?.cacheSavings || 0;
  const cacheHitRate = data?.cacheHitRate || 0;
  const dailyCosts = data?.dailyCosts || [];
  const models = data?.models || { opus: { input: 0, output: 0 }, sonnet: { input: 0, output: 0 }, haiku: { input: 0, output: 0 } };

  const maxDailyCost = Math.max(...dailyCosts.map(d => d.opus + d.sonnet + d.haiku), 1);
  const days = dailyCosts.length || 1;
  const dailyAvg = totalCost / days;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)' }}>💰 비용 분석 상세</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ label: '1주', val: '1w' }, { label: '1개월', val: '4w' }, { label: '3개월', val: '3m' }].map(opt => (
              <button key={opt.val} onClick={() => setPeriod(opt.val)} style={{
                ...periodBtn,
                background: period === opt.val ? '#f59e0b' : 'var(--s2)',
                color: period === opt.val ? '#000' : 'var(--mt)',
              }}>{opt.label}</button>
            ))}
          </div>
          <button onClick={onBack} style={backBtn}>← Overview</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={kpiCard}>
          <div style={{ fontSize: 11, color: 'var(--mt)' }}>총 비용</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--tx)' }}>${totalCost.toFixed(1)}</div>
        </div>
        <div style={kpiCard}>
          <div style={{ fontSize: 11, color: 'var(--mt)' }}>일 평균</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--tx)' }}>${dailyAvg.toFixed(2)}</div>
        </div>
        <div style={kpiCard}>
          <div style={{ fontSize: 11, color: 'var(--mt)' }}>캐시 절감</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>-${cacheSavings.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: 'var(--mt)' }}>적중률 {cacheHitRate}%</div>
        </div>
      </div>

      {/* Daily trend chart */}
      <div style={panelStyle}>
        <div style={{ fontSize: 12, color: 'var(--mt)', marginBottom: 12 }}>일별 비용 추이</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, borderBottom: '1px solid var(--bd)', paddingBottom: 1 }}>
          {dailyCosts.map((d, i) => {
            const total = d.opus + d.sonnet + d.haiku;
            const h = (total / maxDailyCost) * 130;
            const opusH = total > 0 ? (d.opus / total) * h : 0;
            const sonnetH = total > 0 ? (d.sonnet / total) * h : 0;
            const haikuH = total > 0 ? (d.haiku / total) * h : 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
                title={`${d.date}: $${total.toFixed(2)}`}>
                <div style={{ borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                  <div style={{ height: opusH, background: '#6366f1' }} />
                  <div style={{ height: sonnetH, background: '#10b981' }} />
                  <div style={{ height: haikuH, background: '#f59e0b' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', marginTop: 6, overflow: 'hidden' }}>
          {dailyCosts.map((d, i) => (
            <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'var(--mt)' }}>
              {i % 3 === 0 ? d.date.slice(5) : ''}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
          {[
            { name: 'Opus', color: '#6366f1' },
            { name: 'Sonnet', color: '#10b981' },
            { name: 'Haiku', color: '#f59e0b' },
          ].map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mt)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
              {m.name}
            </div>
          ))}
        </div>
      </div>

      {/* Billing breakdown */}
      <div style={{ ...panelStyle, marginTop: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--mt)', marginBottom: 12 }}>비용 명세</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px', gap: 8, fontSize: 11, color: 'var(--mt)', paddingBottom: 8, borderBottom: '1px solid var(--bd)' }}>
          <span>항목</span><span>사용량</span><span>단가</span><span style={{ textAlign: 'right' }}>금액</span>
        </div>
        {[
          { name: 'Opus input', color: '#6366f1', tokens: models.opus.input, rate: '$15/M', cost: (models.opus.input / 1e6) * 15 },
          { name: 'Opus output', color: '#6366f1', tokens: models.opus.output, rate: '$75/M', cost: (models.opus.output / 1e6) * 75 },
          { name: 'Sonnet input', color: '#10b981', tokens: models.sonnet.input, rate: '$3/M', cost: (models.sonnet.input / 1e6) * 3 },
          { name: 'Sonnet output', color: '#10b981', tokens: models.sonnet.output, rate: '$15/M', cost: (models.sonnet.output / 1e6) * 15 },
          { name: 'Haiku in+out', color: '#f59e0b', tokens: models.haiku.input + models.haiku.output, rate: '혼합', cost: (models.haiku.input / 1e6) * 0.25 + (models.haiku.output / 1e6) * 1.25 },
        ].map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--bd)', fontSize: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
              <span style={{ color: 'var(--tx)' }}>{item.name}</span>
            </div>
            <span style={{ color: 'var(--mt)' }}>{formatTokens(item.tokens)}</span>
            <span style={{ color: 'var(--mt)' }}>{item.rate}</span>
            <span style={{ color: 'var(--tx)', fontWeight: 600, textAlign: 'right' }}>${item.cost.toFixed(2)}</span>
          </div>
        ))}
        {/* Cache savings row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--bd)', fontSize: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ color: '#10b981' }}>캐시 절감</span>
          </div>
          <span style={{ color: '#10b981' }}>{formatTokens(data?.cacheRead || 0)}</span>
          <span style={{ color: '#10b981' }}>90%↓</span>
          <span style={{ color: '#10b981', fontWeight: 600, textAlign: 'right' }}>-${cacheSavings.toFixed(2)}</span>
        </div>
        {/* Total */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px', gap: 8, padding: '12px 0', fontSize: 12, alignItems: 'center' }}>
          <span style={{ color: 'var(--tx)', fontWeight: 600 }}>실 지불 추정</span>
          <span /><span />
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14, textAlign: 'right' }}>${totalCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12, padding: 20,
};
const kpiCard = {
  background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16,
};
const backBtn = {
  background: 'var(--s2)', border: 'none', color: 'var(--mt)',
  padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
};
const periodBtn = {
  padding: '5px 12px', borderRadius: 6, fontSize: 11,
  border: 'none', cursor: 'pointer',
};
