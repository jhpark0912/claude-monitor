import { ACTIVITY_ACTION_CONFIG, STATUS_DONE, STATUS_REJECTED } from '../../constants/kanban';
import { formatRelativeTime } from '../../utils/datetime';

/** 최근 활동 피드 — agent 없이 "무엇이 변했는지"만 표시. */
export default function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) return null;

  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12,
      padding: '14px 16px', marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>◷ 최근 활동</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mt)', fontWeight: 400 }}>24시간</span>
      </div>
      {activities.map((act, i) => {
        const cfg = ACTIVITY_ACTION_CONFIG[act.action] ?? ACTIVITY_ACTION_CONFIG.update;
        const isStatusChange = act.action === 'status_change';
        const dotColor = isStatusChange
          ? (act.detail?.includes(`→ ${STATUS_DONE}`) ? 'var(--gn)'
            : act.detail?.includes(`→ ${STATUS_REJECTED}`) ? 'var(--rd)' : 'var(--bl)')
          : 'var(--mt)';

        return (
          <div key={`${act.at}-${act.task}`} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
            borderBottom: i < activities.length - 1 ? '1px solid var(--bd)' : 'none',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor,
              flexShrink: 0, marginTop: 5 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.task}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 1 }}>{act.detail}</div>
            </div>
            <span style={{
              fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
              flexShrink: 0, marginTop: 2, background: cfg.bg, color: cfg.color,
            }}>{cfg.label}</span>
            <span style={{ fontSize: 10, color: 'var(--dm)', flexShrink: 0, whiteSpace: 'nowrap', marginTop: 2 }}>
              {formatRelativeTime(act.at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
