import dayjs from 'dayjs';

const COLORS = [
  '#534AB7', '#185FA5', '#D85A30', '#993556', '#0F6E56',
  '#854F0B', '#E24B4A', '#639922', '#888780',
];

export default function SwimLane({ projects }) {
  if (!projects || projects.length === 0) return null;

  const allTimes = [];
  for (const p of projects) {
    for (const c of p.commits) allTimes.push(dayjs(c.date));
    for (const s of p.sessions) {
      allTimes.push(dayjs(s.startedAt));
      allTimes.push(dayjs(s.endedAt));
    }
  }
  if (allTimes.length === 0) return null;

  const minTime = allTimes.reduce((a, b) => a.isBefore(b) ? a : b);
  const maxTime = allTimes.reduce((a, b) => a.isAfter(b) ? a : b);
  const startHour = Math.max(minTime.hour() - 1, 0);
  const endHour = Math.min(maxTime.hour() + 2, 24);
  const totalMinutes = (endHour - startHour) * 60;

  const toPercent = (t) => {
    const d = dayjs(t);
    const m = d.hour() * 60 + d.minute() - startHour * 60;
    return Math.max(0, Math.min(100, (m / totalMinutes) * 100));
  };

  const hours = [];
  const step = Math.max(1, Math.floor((endHour - startHour) / 6));
  for (let h = startHour; h < endHour; h += step) {
    hours.push(h);
  }
  if (hours[hours.length - 1] !== endHour) hours.push(endHour);

  const makeBlock = (left, rawW, opacity, tooltip) => {
    const w = Math.max(rawW, 1.2);
    return { left: Math.min(left, 100 - w), width: w, opacity, tooltip };
  };

  const fmt = (t) => dayjs(t).format('HH:mm');

  const rows = projects.map((p, i) => {
    const blocks = [];
    for (const s of p.sessions) {
      const left = toPercent(s.startedAt);
      const right = toPercent(s.endedAt);
      const tip = `${fmt(s.startedAt)}~${fmt(s.endedAt)} (${s.durationMinutes}분)`;
      blocks.push(makeBlock(left, Math.max(right - left, 1.5), 0.85, tip));
    }
    for (const c of p.commits) {
      const left = toPercent(c.date);
      const existing = blocks.find((b) => Math.abs(b.left - left) < 2);
      if (!existing) {
        blocks.push(makeBlock(left, 1.2, 0.6, `${fmt(c.date)} 커밋`));
      }
    }
    return { name: p.name, color: COLORS[i % COLORS.length], blocks };
  });

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ width: 80, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--dm)', padding: '0 2px' }}>
          {hours.map((h) => <span key={h}>{String(h).padStart(2, '0')}</span>)}
        </div>
      </div>
      {rows.map((row) => (
        <div key={row.name} style={{ display: 'flex', alignItems: 'center', marginBottom: 2, fontSize: 10 }}>
          <span style={{
            width: 80, flexShrink: 0, textAlign: 'right', paddingRight: 8,
            color: 'var(--mt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{row.name}</span>
          <div style={{
            flex: 1, height: 12, position: 'relative', overflow: 'hidden',
            background: 'var(--s1)', borderRadius: 2,
          }}>
            {row.blocks.map((b, j) => (
              <div key={j} title={b.tooltip} style={{
                position: 'absolute', height: 8, top: 2, borderRadius: 2,
                left: `${b.left}%`, width: `${b.width}%`,
                background: row.color, opacity: b.opacity, cursor: 'default',
              }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
