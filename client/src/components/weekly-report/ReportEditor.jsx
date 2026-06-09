import { useState } from 'react';

export default function ReportEditor({ value, onChange }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
      {/* 툴바 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'var(--dm)' }}>
          커밋 메시지 기반 초안 — 자유롭게 편집하세요
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--rx)', fontSize: 12, fontWeight: 600,
            color: '#fff',
            background: copied ? 'var(--gn)' : 'var(--ac)',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .2s',
          }}
        >
          {copied ? '✓ 복사 완료' : '📋 마크다운 복사'}
        </button>
      </div>

      {/* 편집 영역 */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, minHeight: 300,
          padding: '16px 20px', borderRadius: 'var(--r)',
          background: 'var(--s1)', border: '1px solid var(--bd)',
          color: 'var(--tx)', fontSize: 13, lineHeight: 1.7,
          fontFamily: "'JetBrains Mono', 'D2Coding', monospace",
          resize: 'vertical', outline: 'none',
          transition: 'border-color .15s',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--ac)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--bd)'; }}
      />
    </div>
  );
}
