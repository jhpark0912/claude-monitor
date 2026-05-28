import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { fetchAnalyticsCalendar } from '../../api/client';

export default function CalendarCard({ project, month: externalMonth, onMonthChange }) {
  const [internalMonth, setInternalMonth] = useState(dayjs().format('YYYY-MM'));
  const month = externalMonth || internalMonth;
  const setMonth = (m) => { setInternalMonth(m); onMonthChange?.(m); };
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAnalyticsCalendar(month, project).then(setData).catch(() => {});
  }, [month, project]);

  const target = dayjs(month + '-01');
  const daysInMonth = target.daysInMonth();
  const startDow = target.day();
  const today = dayjs().format('YYYY-MM-DD');

  const dayMap = {};
  let maxSessions = 1;
  if (data?.days) {
    for (const d of data.days) {
      dayMap[d.date] = d;
      if (d.sessionCount > maxSessions) maxSessions = d.sessionCount;
    }
  }

  const totalDays = data?.days?.length || 0;
  const totalSessions = data?.days?.reduce((s, d) => s + d.sessionCount, 0) || 0;

  function getIntensity(count) {
    if (!count) return 0;
    const ratio = count / maxSessions;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  const intensityColors = ['transparent', 'var(--cal-1)', 'var(--cal-2)', 'var(--cal-3)', 'var(--cal-4)'];

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={iconStyle}>📅</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>사용 캘린더</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={navBtn} onClick={() => setMonth(target.subtract(1, 'month').format('YYYY-MM'))}>◀</button>
        <span style={{ fontSize: 12, color: 'var(--mt)', minWidth: 80, textAlign: 'center' }}>
          {target.format('YYYY년 M월')}
        </span>
        <button style={navBtn} onClick={() => setMonth(target.add(1, 'month').format('YYYY-MM'))}>▶</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, flex: 1, minHeight: 0, alignContent: 'start' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} style={{ fontSize: 9, color: 'var(--mt)', textAlign: 'center', padding: '2px 0' }}>{d}</div>
        ))}
        {Array.from({ length: startDow }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = target.date(i + 1).format('YYYY-MM-DD');
          const info = dayMap[date];
          const intensity = getIntensity(info?.sessionCount);
          const isToday = date === today;

          return (
            <div key={date} style={{
              height: 32,
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: intensity > 0 ? 'var(--cal-tx)' : 'var(--mt)',
              background: intensity > 0 ? intensityColors[intensity] : 'var(--s1)',
              outline: isToday ? '2px solid var(--ac)' : 'none',
              outlineOffset: -2,
              position: 'relative',
              cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { if (intensity === 0) e.currentTarget.style.background = 'var(--s2)'; }}
            onMouseLeave={e => { if (intensity === 0) e.currentTarget.style.background = 'var(--s1)'; }}>
              {i + 1}
              {info && (
                <div style={{ position: 'absolute', bottom: 3, display: 'flex', gap: 2 }}>
                  {Array.from({ length: Math.min(info.sessionCount, 4) }, (_, j) => (
                    <span key={j} style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.7 }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={footerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--mt)' }}>
          적음
          {intensityColors.slice(1).map((c, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
          ))}
          많음
        </div>
        <div style={{ fontSize: 11, color: 'var(--mt)' }}>
          이번 달 <strong style={{ color: 'var(--ac2)' }}>{totalDays}일</strong> 활동 · <strong style={{ color: 'var(--ac2)' }}>{totalSessions}</strong>세션
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
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};
const iconStyle = {
  width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--pr) 18%, var(--s2))',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
};
const navBtn = {
  background: 'var(--s2)', border: 'none', color: 'var(--mt)',
  width: 24, height: 24, borderRadius: 5, cursor: 'pointer', fontSize: 11,
};
const footerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--bd)',
};
