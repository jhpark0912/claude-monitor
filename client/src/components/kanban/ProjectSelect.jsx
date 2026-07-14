import { useState, useMemo } from 'react';
import { getProjectColor } from '../../utils/colors';
import { PLAN_STATE_CONFIG } from '../../constants/kanban';

const ALWAYS_SHOWN_STATUSES = new Set(['active', 'blocked']);

/** 프로젝트 선택 — 활성/블로커 프로젝트는 칩으로 상시노출, 나머지는 "더보기" 토글. */
export default function ProjectSelect({ projects, value, onChange }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const { alwaysShown, rest, promoted } = useMemo(() => {
    const always = [];
    const others = [];
    for (const p of projects) {
      if (ALWAYS_SHOWN_STATUSES.has(p.status)) always.push(p);
      else others.push(p);
    }
    others.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    const promo = others.find((p) => p.id === value) ?? null;
    return { alwaysShown: always, rest: others, promoted: promo };
  }, [projects, value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {alwaysShown.map((p) => (
          <ProjectChip key={p.id} project={p} selected={p.id === value} onClick={() => onChange(p.id)} />
        ))}
        {rest.length > 0 && (
          <button
            onClick={() => setMoreOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 15px', borderRadius: 24,
              background: 'transparent', border: `1px dashed ${moreOpen ? 'var(--bd-h)' : 'var(--bd2)'}`,
              color: 'var(--mt)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {promoted ? (
              <>
                <span className={`c-${getProjectColor(promoted.name)}`} style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: 'var(--tx2)' }}>{promoted.name}</span>
              </>
            ) : (
              <>더보기 <b style={{ color: 'var(--tx2)' }}>{rest.length}</b></>
            )}
            <span style={{ fontSize: 11 }}>{moreOpen ? '▴' : '▾'}</span>
          </button>
        )}
      </div>

      {moreOpen && rest.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          marginTop: 3, paddingTop: 12, borderTop: '1px dashed var(--bd)',
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--mt)',
            textTransform: 'uppercase', letterSpacing: '.4px' }}>진행 없음</span>
          {rest.map((p) => (
            <ProjectChip key={p.id} project={p} selected={p.id === value} muted={p.id !== value} onClick={() => onChange(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectChip({ project, selected, muted, onClick }) {
  const color = getProjectColor(project.name);
  const stCfg = PLAN_STATE_CONFIG[project.status];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 15px', borderRadius: 24,
        background: selected ? 'var(--ac)' : (muted ? 'transparent' : 'var(--s2)'),
        border: `1px solid ${selected ? 'var(--ac)' : 'var(--bd)'}`,
        color: selected ? '#fff' : 'var(--tx2)',
        fontSize: 13, fontWeight: muted ? 500 : 600, cursor: 'pointer',
        transition: 'all .15s', fontFamily: 'inherit',
      }}
    >
      <span className={`c-${color}`} style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0 }} />
      {project.name}
      {stCfg && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: selected ? '#fff' : stCfg.color }} />
      )}
      {project.in_progress_count > 0 && (
        <span style={{ fontSize: 10.5, fontWeight: 600, opacity: .78 }}>진행 {project.in_progress_count}</span>
      )}
    </div>
  );
}
