import { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

/** 프로젝트 선택 드롭다운. */
export default function ProjectSelect({ projects, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useClickOutside(wrapRef, useCallback(() => setOpen(false), []));

  const selected = projects.find((p) => p.id === value);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
          background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8,
          fontSize: 13, fontWeight: 600, color: 'var(--tx)', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ac)', flexShrink: 0 }} />
        {selected ? selected.name : '프로젝트 선택'}
        <span style={{ fontSize: 11, color: 'var(--mt)' }}>▾</span>
      </button>

      {open && projects.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10,
          padding: 6, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,.3)',
        }}>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              style={{
                padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                color: p.id === value ? 'var(--ac)' : 'var(--tx2)',
                background: p.id === value ? 'var(--ac-bg)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (p.id !== value) e.currentTarget.style.background = 'var(--s2)'; }}
              onMouseLeave={(e) => { if (p.id !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
