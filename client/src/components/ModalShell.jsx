import { useEffect, useRef, useCallback } from 'react';

/** 백드롭 클릭·ESC 키로 닫히는 모달 셸(backdrop+패널+fadeIn/slideUp 애니메이션). */
export default function ModalShell({ onClose, panelStyle, children }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: 'var(--s1)', borderRadius: 'var(--r)', border: '1px solid var(--bd)',
        boxShadow: 'var(--shadow-h)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', animation: 'slideUp .25s ease',
        ...panelStyle,
      }}>
        {children}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
