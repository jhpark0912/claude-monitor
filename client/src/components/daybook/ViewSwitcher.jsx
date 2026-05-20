const VIEWS = [
  { key: 'daily', label: '일간' },
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
];

export default function ViewSwitcher({ value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 2, padding: 3,
      background: 'var(--s2)', borderRadius: 'var(--rs)', border: '1px solid var(--bd)',
    }}>
      {VIEWS.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          style={{
            padding: '5px 14px', borderRadius: 7, border: 'none',
            fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            color: value === v.key ? 'var(--tx)' : 'var(--mt)',
            background: value === v.key ? 'var(--s3)' : 'transparent',
            boxShadow: value === v.key ? 'var(--shadow)' : 'none',
            transition: 'all .15s',
          }}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
