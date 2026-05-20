import { useState, useEffect, useRef, useCallback } from 'react';
import { saveMemo } from '../../api/client';

export default function DayMemo({ date, initialContent }) {
  const [content, setContent] = useState(initialContent || '');
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    setContent(initialContent || '');
  }, [date, initialContent]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const doSave = useCallback(async (text) => {
    setSaving(true);
    try {
      await saveMemo(date, text);
    } catch { /* ignore */ }
    if (mountedRef.current) setSaving(false);
  }, [date]);

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSave(val), 1000);
  };

  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--mt)', textTransform: 'uppercase',
        letterSpacing: '.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        📝 Memo
        {saving && <span style={{ fontSize: 10, color: 'var(--ac)', fontWeight: 400, textTransform: 'none' }}>저장 중...</span>}
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="오늘의 메모를 작성하세요..."
        style={{
          width: '100%', minHeight: 60, padding: '10px 12px', borderRadius: 'var(--rs)',
          background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx)',
          fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
          transition: 'border-color .15s',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--ac)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--bd)'; }}
      />
    </div>
  );
}
