import { useState, useMemo } from 'react';
import { ALL_STATUSES, STATUS_CONFIG, PRIORITY_CONFIG, PLAN_STATE_CONFIG, STATUS_DONE, STATUS_REJECTED, STATUS_IN_PROGRESS, STATUS_REVIEW } from '../../constants/kanban';
import { daysBetween } from '../../utils/datetime';

function computeMeta(plan) {
  if (plan.completed_at) {
    const dur = plan.started_at ? daysBetween(plan.started_at, plan.completed_at) : null;
    const ago = daysBetween(plan.completed_at, new Date().toISOString());
    return `${ago}일 전${dur ? ` · ${dur}일 소요` : ''}`;
  }
  if (plan.started_at) return `${daysBetween(plan.started_at, new Date().toISOString())}일째`;
  return '미착수';
}

/** Plan 아코디언 섹션 — 헤더 클릭으로 펼침/접기. tasks는 부모에서 사전 그룹핑해 전달. */
export default function PlanSection({ plan, tasks, defaultExpanded, onTaskClick }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const stCfg = PLAN_STATE_CONFIG[plan.derived_state] ?? PLAN_STATE_CONFIG.planned;

  const { grouped, blockers, nowTasks } = useMemo(() => {
    const g = {};
    const b = [];
    for (const t of tasks) {
      (g[t.status] ??= []).push(t);
      if (t.is_blocked) b.push(t);
    }
    const now = [...(g[STATUS_IN_PROGRESS] ?? []), ...(g[STATUS_REVIEW] ?? [])];
    return { grouped: g, blockers: b, nowTasks: now };
  }, [tasks]);

  const meta = computeMeta(plan);

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          background: 'var(--s1)', border: '1px solid var(--bd)', cursor: 'pointer',
          borderRadius: expanded ? '12px 12px 0 0' : 12,
          borderBottomColor: expanded ? 'transparent' : undefined,
          transition: 'all .15s', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--dm)', transition: 'transform .2s',
            transform: expanded ? 'rotate(90deg)' : 'none', width: 16, textAlign: 'center' }}>▶</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 5,
            letterSpacing: '.3px', textTransform: 'uppercase',
            background: stCfg.bg, color: stCfg.color,
          }}>{stCfg.label}</span>
          <span style={{ fontSize: 14, fontWeight: 650, flex: 1, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title}</span>
          <span style={{ fontSize: 11, color: 'var(--mt)', fontWeight: 600, minWidth: 32, textAlign: 'right', flexShrink: 0 }}>
            {plan.task_done}/{plan.task_total}
          </span>
          <span style={{ fontSize: 11, color: 'var(--dm)', flexShrink: 0, whiteSpace: 'nowrap' }}>{meta}</span>
        </div>
        <StackBar counts={plan.counts ?? {}} total={plan.task_total} />
        <Legend counts={plan.counts ?? {}} />
        <NowPreview tasks={nowTasks} />
      </div>

      {expanded && (
        <div style={{
          background: 'var(--s1)', border: '1px solid var(--bd)', borderTop: 'none',
          borderRadius: '0 0 12px 12px', padding: '0 16px 14px', overflow: 'hidden',
        }}>
          {plan.goal && (
            <div style={{
              padding: '10px 14px', margin: '8px 0 12px', background: 'var(--s2)',
              borderRadius: 8, fontSize: 12, color: 'var(--tx2)', lineHeight: 1.5,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mt)',
                textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>목표</div>
              {plan.goal}
              {(plan.scope_in || plan.scope_out) && (
                <div style={{ fontSize: 11, color: 'var(--dm)', marginTop: 6 }}>
                  {plan.scope_in && <><b style={{ color: 'var(--mt)', fontWeight: 600 }}>포함:</b> {plan.scope_in}</>}
                  {plan.scope_in && plan.scope_out && ' · '}
                  {plan.scope_out && <><b style={{ color: 'var(--mt)', fontWeight: 600 }}>제외:</b> {plan.scope_out}</>}
                </div>
              )}
            </div>
          )}

          {blockers.map((b) => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
              marginBottom: 12, borderRadius: 8, borderLeft: '3px solid var(--rd)',
              background: 'rgba(248,113,113,.04)',
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>⛔</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>#{b.id} {b.title}</div>
              </div>
            </div>
          ))}

          {ALL_STATUSES.filter((s) => grouped[s]?.length > 0).map((s) => (
            <StatusGroup
              key={s}
              status={s}
              tasks={grouped[s]}
              onTaskClick={onTaskClick}
              isDone={s === STATUS_DONE || s === STATUS_REJECTED}
            />
          ))}

          {tasks.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--mt)', fontSize: 12 }}>
              태스크 없음
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusGroup({ status, tasks, onTaskClick, isDone }) {
  const [collapsed, setCollapsed] = useState(false);
  const cfg = STATUS_CONFIG[status];

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        onClick={isDone ? () => setCollapsed(!collapsed) : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', marginBottom: 4,
          cursor: isDone ? 'pointer' : 'default' }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 2, background: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mt)',
          textTransform: 'uppercase', letterSpacing: '.4px' }}>{cfg.label}</span>
        <span style={{ fontSize: 10, color: 'var(--dm)' }}>{tasks.length}</span>
        {isDone && <span style={{ fontSize: 9, color: 'var(--dm)', marginLeft: 4 }}>{collapsed ? '▸' : '▾'}</span>}
      </div>
      {!collapsed && tasks.map((t) => (
        <TaskRow key={t.id} task={t} onClick={() => onTaskClick?.(t.id)} isDone={isDone} />
      ))}
    </div>
  );
}

function TaskRow({ task, onClick, isDone }) {
  const priCfg = PRIORITY_CONFIG[task.priority];
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
        borderRadius: 8, cursor: 'pointer', transition: 'all .1s',
        opacity: isDone ? 0.55 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--s2)'; if (isDone) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; if (isDone) e.currentTarget.style.opacity = '0.55'; }}
    >
      <span style={{ fontSize: 10, color: 'var(--dm)', fontFamily: "'JetBrains Mono',monospace", minWidth: 28 }}>
        #{task.id}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
      {task.is_blocked && <Badge bg="rgba(248,113,113,.15)" color="var(--rd)">⛔ BLOCK</Badge>}
      {task.latest_note && (
        <span style={{ fontSize: 11, color: 'var(--mt)', maxWidth: 200, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{task.latest_note}</span>
      )}
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px',
        color: priCfg?.color, flexShrink: 0, minWidth: 32, textAlign: 'right' }}>{priCfg?.label}</span>
    </div>
  );
}

function Badge({ bg, color, children }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
      letterSpacing: '.3px', flexShrink: 0, whiteSpace: 'nowrap', background: bg, color,
    }}>{children}</span>
  );
}

function StackBar({ counts, total }) {
  if (!total) return null;
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden',
      marginTop: 10, background: 'var(--s3)' }}>
      {ALL_STATUSES.filter((s) => counts[s] > 0).map((s) => (
        <div key={s} style={{ height: '100%', width: `${(counts[s] / total) * 100}%`,
          background: STATUS_CONFIG[s].dot }} />
      ))}
    </div>
  );
}

function Legend({ counts }) {
  const entries = ALL_STATUSES.filter((s) => counts[s] > 0);
  if (!entries.length) return null;
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
      {entries.map((s) => (
        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, color: 'var(--tx2)', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_CONFIG[s].dot }} />
          {STATUS_CONFIG[s].label} {counts[s]}
        </span>
      ))}
    </div>
  );
}

function NowPreview({ tasks }) {
  if (!tasks.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--mt)',
        textTransform: 'uppercase', letterSpacing: '.4px' }}>지금</span>
      {tasks.map((t) => (
        <span key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 14,
          background: t.is_blocked ? 'rgba(248,113,113,.06)' : 'var(--s2)',
          border: `1px solid ${t.is_blocked ? 'rgba(248,113,113,.4)' : 'var(--bd)'}`,
          fontSize: 11.5, color: 'var(--tx)', fontWeight: 500, maxWidth: 240, overflow: 'hidden',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: t.is_blocked ? 'var(--rd)' : STATUS_CONFIG[t.status].dot }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.is_blocked ? '⛔ ' : ''}{t.title}
          </span>
        </span>
      ))}
    </div>
  );
}
