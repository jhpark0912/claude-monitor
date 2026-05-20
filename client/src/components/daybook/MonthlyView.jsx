import dayjs from 'dayjs';

export default function MonthlyView({ data, onDayClick }) {
  if (!data?.days) return null;

  const maxTokens = Math.max(...data.days.map((d) => d.totalTokens || 0), 1);

  return (
    <div>
      {data.commitTypes && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(data.commitTypes).sort((a, b) => b[1] - a[1]).map(([type, cnt]) => (
            <div key={type} style={{
              background: 'var(--s2)', borderRadius: 'var(--rs)', padding: '8px 14px',
              border: '1px solid var(--bd)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>{cnt}</div>
              <div style={{ fontSize: 10, color: 'var(--mt)', textTransform: 'uppercase' }}>{type}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.days.map((day) => {
          const d = dayjs(day.date);
          const hasActivity = day.sessionCount > 0;
          const barWidth = hasActivity ? Math.max((day.totalTokens / maxTokens) * 100, 4) : 0;

          return (
            <div
              key={day.date}
              onClick={() => onDayClick?.(day.date)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                borderRadius: 'var(--rx)', cursor: 'pointer', transition: 'background .15s',
                opacity: hasActivity ? 1 : 0.3,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--s2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                fontSize: 10, color: 'var(--mt)', width: 28, textAlign: 'right',
                textTransform: 'uppercase', flexShrink: 0,
              }}>
                {d.format('ddd')}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600, color: hasActivity ? 'var(--tx)' : 'var(--dm)',
                width: 24, flexShrink: 0,
              }}>
                {d.format('DD')}
              </span>

              <div style={{
                flex: 1, height: 8, borderRadius: 4, background: 'var(--s3)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${barWidth}%`, height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, var(--ac), var(--ac2))',
                  transition: 'width .3s',
                }} />
              </div>

              <span style={{
                fontSize: 10, color: 'var(--mt)', width: 30, textAlign: 'right', flexShrink: 0,
              }}>
                {hasActivity ? `${day.sessionCount}s` : ''}
              </span>
              <span style={{
                fontSize: 10, color: 'var(--dm)', width: 40, textAlign: 'right', flexShrink: 0,
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {day.totalTokens > 0 ? `${Math.round(day.totalTokens / 1000)}K` : ''}
              </span>
              {day.hasMemo && (
                <span style={{ fontSize: 8, color: 'var(--ac2)' }}>●</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
