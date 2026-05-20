import dayjs from 'dayjs';

const TYPE_COLORS = {
  feat: 'var(--ac)', fix: 'var(--gn)', style: 'var(--yw)',
  refactor: 'var(--pr)', docs: '#22d3ee', chore: 'var(--mt)', other: 'var(--dm)',
};
const TYPES_ORDER = ['feat', 'fix', 'style', 'refactor', 'docs', 'chore', 'other'];

function collectTypes(projects) {
  const badges = [];
  if (!projects) return badges;
  for (const proj of projects) {
    for (const type of TYPES_ORDER) {
      const commits = proj.commits?.[type];
      if (!commits?.length) continue;
      for (const c of commits) {
        badges.push({ type, message: c.message, color: TYPE_COLORS[type] || 'var(--dm)' });
      }
    }
  }
  return badges;
}

export default function WeeklyView({ data, onDayClick }) {
  if (!data?.days) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.days.map((day) => {
        const d = dayjs(day.date);
        const badges = collectTypes(day.projects);
        const hasActivity = day.sessionCount > 0 || badges.length > 0;

        return (
          <div
            key={day.date}
            onClick={() => onDayClick?.(day.date)}
            style={{
              background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
              padding: '12px 16px', cursor: 'pointer', transition: 'border-color .15s',
              opacity: hasActivity ? 1 : 0.4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--bd-h)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--bd)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 36, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--mt)', textTransform: 'uppercase' }}>
                  {d.format('ddd')}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: hasActivity ? 'var(--tx)' : 'var(--dm)' }}>
                  {d.format('DD')}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {hasActivity ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx)' }}>
                        {day.sessionCount} sessions
                      </span>
                      {badges.length > 0 && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--dm)' }}>&middot;</span>
                          <span style={{ fontSize: 11, color: 'var(--mt)' }}>{badges.length} commits</span>
                        </>
                      )}
                      {day.totalTokens > 0 && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--dm)' }}>&middot;</span>
                          <span style={{ fontSize: 11, color: 'var(--mt)' }}>
                            {Math.round(day.totalTokens / 1000)}K tokens
                          </span>
                        </>
                      )}
                    </div>
                    {badges.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {badges.slice(0, 5).map((b, i) => (
                          <span key={i} style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--rx)',
                            color: b.color,
                            background: `color-mix(in srgb, ${b.color} 12%, transparent)`,
                            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {b.message}
                          </span>
                        ))}
                        {badges.length > 5 && (
                          <span style={{ fontSize: 9, color: 'var(--dm)' }}>+{badges.length - 5}</span>
                        )}
                      </div>
                    )}
                    {day.memo && (
                      <div style={{
                        fontSize: 11, color: 'var(--ac2)', fontStyle: 'italic', marginTop: 4,
                        paddingLeft: 8, borderLeft: '2px solid var(--ac-bd)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {day.memo}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--dm)' }}>활동 없음</span>
                )}
              </div>

              <span style={{ fontSize: 10, color: 'var(--dm)' }}>▶</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
