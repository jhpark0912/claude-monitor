import { useState, useEffect, useRef } from 'react';
import { fetchProjects } from '../api/client';
import { getProjectColor } from '../utils/colors';

export default function ProjectFilter({ value, onChange }) {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const selected = projects.find((p) => p.id === value);
  const selectedColor = selected ? getProjectColor(selected.label) : null;

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        onClick={() => { onChange('all'); setOpen(false); }}
        style={{
          background: value === 'all' ? 'var(--ac)' : 'transparent',
          color: value === 'all' ? '#fff' : 'var(--tx2)',
          border: value === 'all' ? 'none' : '1px solid var(--bd)',
          borderRight: value === 'all' ? 'none' : 'none',
          borderRadius: 'var(--rx) 0 0 var(--rx)',
          padding: '7px 14px', fontSize: '12px', fontWeight: 600,
          fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all .15s',
        }}
      >
        전체
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: selected ? 'var(--ac)' : 'transparent',
          color: selected ? '#fff' : 'var(--tx2)',
          border: `1px solid ${selected ? 'var(--ac)' : 'var(--bd)'}`,
          borderRadius: '0 var(--rx) var(--rx) 0',
          padding: '7px 12px', fontSize: '12px', fontWeight: 500,
          fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all .15s',
        }}
      >
        {selected && (
          <span className={`c-${selectedColor}`}
            style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0 }} />
        )}
        <span>{selected ? selected.label : '프로젝트 선택'}</span>
        <span style={{ fontSize: 8, opacity: .6 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '10px',
          padding: '6px', minWidth: '220px',
          boxShadow: '0 12px 32px rgba(0,0,0,.5)',
        }}>
          {projects.map((p) => {
            const color = getProjectColor(p.label);
            return (
              <div
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', transition: 'all .1s',
                  color: p.id === value ? 'var(--ac)' : 'var(--tx2)',
                  background: p.id === value ? 'rgba(99,102,241,.15)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (p.id !== value) {
                    e.currentTarget.style.background = 'rgba(255,255,255,.06)';
                    e.currentTarget.style.color = 'var(--tx)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (p.id !== value) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--tx2)';
                  }
                }}
              >
                <span className={`c-${color}`}
                  style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--mt)', fontWeight: 500 }}>
                  {p.sessionCount}개
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
