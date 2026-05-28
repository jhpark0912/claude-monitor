import React, { useState, useEffect } from 'react';
import { fetchAnalyticsHeatmap } from '../../api/client';

export default function HeatmapCard({ project }) {
  const [weeks, setWeeks] = useState(4);
  const [data, setData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetchAnalyticsHeatmap(weeks, project).then(setData).catch(() => {});
  }, [weeks, project]);

  const matrix = data?.matrix || Array.from({ length: 7 }, () => Array(24).fill(0));
  const days = data?.days || ['월', '화', '수', '목', '금', '토', '일'];

  let maxVal = 1;
  for (const row of matrix) {
    for (const v of row) {
      if (v > maxVal) maxVal = v;
    }
  }

  let peakDay = '';
  let peakHour = 0;
  let peakVal = 0;
  matrix.forEach((row, di) => {
    row.forEach((v, hi) => {
      if (v > peakVal) { peakVal = v; peakDay = days[di]; peakHour = hi; }
    });
  });

  const colors = ['var(--s1)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];

  function getColor(val) {
    if (!val) return colors[0];
    const ratio = val / maxVal;
    if (ratio <= 0.25) return colors[1];
    if (ratio <= 0.5) return colors[2];
    if (ratio <= 0.75) return colors[3];
    return colors[4];
  }

  return (
    <div data-heatmap style={{ ...cardStyle, position: 'relative' }}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={iconStyle}>🕐</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>시간대 활동 패턴</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ label: '1주', val: 1 }, { label: '4주', val: 4 }, { label: '3개월', val: 12 }].map(opt => (
            <button key={opt.val} onClick={() => setWeeks(opt.val)} style={{
              ...periodBtn,
              background: weeks === opt.val ? 'var(--gn)' : 'var(--s2)',
              color: weeks === opt.val ? '#fff' : 'var(--mt)',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, 1fr)', gap: 2 }}>
        <div />
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} style={{ fontSize: 7, color: 'var(--mt)', textAlign: 'center' }}>
            {i}
          </div>
        ))}
        {matrix.map((row, di) => (
          <React.Fragment key={di}>
            <div style={{ fontSize: 10, color: 'var(--mt)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3 }}>
              {days[di]}
            </div>
            {row.map((val, hi) => (
              <div key={hi} style={{
                aspectRatio: '1',
                borderRadius: 3,
                background: getColor(val),
                cursor: val > 0 ? 'pointer' : 'default',
                transition: 'transform .1s, outline .1s',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (val > 0) {
                  e.currentTarget.style.transform = 'scale(1.3)';
                  e.currentTarget.style.zIndex = '10';
                  const rect = e.currentTarget.getBoundingClientRect();
                  const cardEl = e.currentTarget.closest('[data-heatmap]');
                  const parentRect = cardEl.getBoundingClientRect();
                  setTooltip({ x: rect.left - parentRect.left + rect.width / 2, y: rect.top - parentRect.top - 4, day: days[di], hour: hi, val });
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '';
                setTooltip(null);
              }} />
            ))}
          </React.Fragment>
        ))}
      </div>

      {tooltip && (
        <div style={tooltipStyle(tooltip.x, tooltip.y)}>
          <strong>{tooltip.day} {tooltip.hour}시</strong> — {tooltip.val}세션
        </div>
      )}

      <div style={footerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--mt)' }}>
          적음
          {colors.slice(1).map((c, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          많음
        </div>
        <div style={{ fontSize: 11, color: 'var(--mt)' }}>
          피크: <strong style={{ color: 'var(--gn)' }}>{peakDay} {peakHour}시</strong>
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
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
};
const iconStyle = {
  width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--gn) 18%, var(--s2))',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
};
const periodBtn = {
  padding: '4px 10px', borderRadius: 5, fontSize: 10,
  border: 'none', cursor: 'pointer',
};
function tooltipStyle(x, y) {
  return {
    position: 'absolute',
    left: x,
    top: y,
    transform: 'translate(-50%, -100%)',
    background: 'var(--s2)',
    border: '1px solid var(--bd2)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    color: 'var(--tx)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 20,
  };
}
const footerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--bd)',
};
