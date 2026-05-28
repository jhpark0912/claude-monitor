import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { fetchAnalyticsCalendar, fetchDailySessions } from '../../api/client';
import { formatTokens } from '../../utils/colors';

export default function CalendarDrilldown({ project, onBack }) {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [calData, setCalData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalyticsCalendar(month, project).then(setCalData).catch(() => {});
  }, [month, project]);

  useEffect(() => {
    if (selectedDate) {
      fetchDailySessions(selectedDate, project).then(d => setSessions(d.sessions || [])).catch(() => {});
    }
  }, [selectedDate, project]);

  const target = dayjs(month + '-01');
  const daysInMonth = target.daysInMonth();
  const startDow = target.day();

  const dayMap = {};
  let maxSessions = 1;
  if (calData?.days) {
    for (const d of calData.days) {
      dayMap[d.date] = d;
      if (d.sessionCount > maxSessions) maxSessions = d.sessionCount;
    }
  }

  const intensityColors = ['transparent', 'var(--cal-1)', 'var(--cal-2)', 'var(--cal-3)', 'var(--cal-4)'];
  function getIntensity(count) {
    if (!count) return 0;
    const ratio = count / maxSessions;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  const selectedDayjs = dayjs(selectedDate);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)' }}>📅 캘린더 상세</h2>
        <button onClick={onBack} style={backBtn}>← Overview</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, minWidth: 0 }}>
        {/* Mini calendar */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button style={navBtn} onClick={() => setMonth(target.subtract(1, 'month').format('YYYY-MM'))}>◀</button>
            <span style={{ fontSize: 13, color: 'var(--mt)' }}>{target.format('YYYY년 M월')}</span>
            <button style={navBtn} onClick={() => setMonth(target.add(1, 'month').format('YYYY-MM'))}>▶</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} style={{ fontSize: 10, color: 'var(--mt)', textAlign: 'center', padding: 3 }}>{d}</div>
            ))}
            {Array.from({ length: startDow }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = target.date(i + 1).format('YYYY-MM-DD');
              const info = dayMap[date];
              const intensity = getIntensity(info?.sessionCount);
              const isSelected = date === selectedDate;
              return (
                <div key={date} onClick={() => setSelectedDate(date)} style={{
                  aspectRatio: '1', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, cursor: 'pointer',
                  color: intensity > 0 ? 'var(--cal-tx)' : 'var(--mt)',
                  background: intensity > 0 ? intensityColors[intensity] : 'var(--s2)',
                  outline: isSelected ? '2px solid var(--tx)' : 'none',
                  outlineOffset: -2,
                }}>{i + 1}</div>
              );
            })}
          </div>
        </div>

        {/* Session list */}
        <div style={{ ...panelStyle, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, color: 'var(--mt)', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--bd)' }}>
            <strong style={{ color: 'var(--tx)', fontSize: 15 }}>
              {selectedDayjs.format('M월 D일')} ({['일','월','화','수','목','금','토'][selectedDayjs.day()]})
            </strong>
            {' — '}세션 {sessions.length}개
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
            {sessions.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--mt)', padding: 20, textAlign: 'center' }}>세션 없음</div>
            )}
            {sessions.map((s, i) => (
              <div key={i} onClick={() => navigate(`/daily/${selectedDate}`)} style={sessionCard}>
                <div style={{ fontSize: 11, color: 'var(--ac)', fontWeight: 500 }}>{s.projectLabel}</div>
                <div style={{ fontSize: 12, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.firstPrompt || '(프롬프트 없음)'}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, color: 'var(--mt)' }}>
                  <span>{dayjs(s.startedAt).format('HH:mm')}~{dayjs(s.endedAt).format('HH:mm')}</span>
                  <span style={{ color: 'var(--yw)' }}>{formatTokens(s.tokens.totalInput + s.tokens.totalOutput)}</span>
                  <span style={{ color: 'var(--gn)' }}>
                    {Object.entries(s.toolUsage || {}).slice(0, 2).map(([k, v]) => `${k}×${v}`).join(' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
const navBtn = {
  background: 'var(--s2)', border: 'none', color: 'var(--mt)',
  width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 12,
};
const sessionCard = {
  padding: '12px 14px', background: 'var(--bg)', borderRadius: 10,
  border: '1px solid var(--bd)', cursor: 'pointer', transition: 'border-color .15s',
  overflow: 'hidden',
};
