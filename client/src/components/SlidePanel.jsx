import { useEffect } from 'react';
import { formatTokens } from '../utils/colors';

const TOOL_ICONS = { Bash: '$', Write: '+', Edit: '~', Read: '>', Grep: '?', Glob: '*' };

export default function SlidePanel({ session, onClose, onPrev, onNext, hasPrev, hasNext, children }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowUp' && onPrev) { e.preventDefault(); onPrev(); }
      if (e.key === 'ArrowDown' && onNext) { e.preventDefault(); onNext(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  const isOpen = !!session;

  return (
    <div style={{
      position: 'fixed', top: 52, right: 0, bottom: 0, width: 480,
      background: 'var(--s1)', borderLeft: '1px solid var(--bd)',
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
      zIndex: 50, display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 40px rgba(0,0,0,.3)',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--bd)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>세션 상세</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <NavBtn onClick={onPrev} disabled={!hasPrev}>&#8249;</NavBtn>
          <NavBtn onClick={onNext} disabled={!hasNext}>&#8250;</NavBtn>
          <NavBtn onClick={onClose} large>&#215;</NavBtn>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24 }}>
        {session && (children || <DefaultDetail session={session} />)}
      </div>
    </div>
  );
}

function NavBtn({ onClick, disabled, large, children }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        width: large ? 32 : 28, height: large ? 32 : 28,
        borderRadius: 'var(--rx)', border: '1px solid var(--bd)',
        background: 'transparent', color: 'var(--mt)', cursor: disabled ? 'default' : 'pointer',
        fontSize: large ? 16 : 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? .3 : 1, marginLeft: large ? 6 : 0,
        transition: 'all .15s',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--tx)'; }}}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mt)'; }}
    >
      {children}
    </button>
  );
}

export function DefaultDetail({ session }) {
  const totalTokens = (session.tokens?.totalInput || 0) + (session.tokens?.totalOutput || 0);
  const toolCalls = session.toolCalls || [];
  const filesChanged = session.filesChanged || [];
  const toolUsage = session.toolUsage || {};

  return (
    <>
      <div className={`b-${session._color}`} style={{
        fontSize: 12, fontWeight: 600, padding: '4px 12px',
        borderRadius: 'var(--rx)', display: 'inline-block', marginBottom: 14,
      }}>
        {session.projectLabel}
      </div>

      <div style={{ fontSize: 17, fontWeight: 500, color: '#fafafa', lineHeight: 1.7, marginBottom: 24, wordBreak: 'break-all' }}>
        {session.firstPrompt || '(프롬프트 없음)'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <StatBox value={formatTokens(totalTokens)} label="총 토큰" />
        <StatBox value={toolCalls.length} label="도구 호출" />
        <StatBox value={filesChanged.length} label="파일 변경" />
      </div>

      {toolCalls.length > 0 && (
        <Section title="실행한 명령어" count={`${toolCalls.length}회`}>
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
            padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
          }}>
            {toolCalls.map((tc, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, padding: '5px 0',
                borderBottom: i < toolCalls.length - 1 ? '1px solid var(--bd)' : 'none',
              }}>
                <span style={{ color: 'var(--dm)', width: 16, textAlign: 'center', flexShrink: 0 }}>
                  {TOOL_ICONS[tc.name] || ''}
                </span>
                <span style={{ color: 'var(--pr)', fontWeight: 500, flexShrink: 0 }}>{tc.name}</span>
                <span style={{ color: 'var(--tx2)', wordBreak: 'break-all' }}>{tc.input}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {filesChanged.length > 0 && (
        <Section title="변경된 파일" count={`${filesChanged.length}개`}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            {filesChanged.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 'var(--rx)', fontWeight: 600,
                  textTransform: 'uppercase', flexShrink: 0, whiteSpace: 'nowrap',
                  background: f.action === 'created' ? 'rgba(74,222,128,.12)' : 'rgba(251,191,36,.12)',
                  color: f.action === 'created' ? 'var(--gn)' : 'var(--yw)',
                }}>
                  {f.action === 'created' ? 'NEW' : 'MOD'}
                </span>
                <span style={{ color: 'var(--tx2)', wordBreak: 'break-all' }}>{f.path}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(toolUsage).length > 0 && (
        <Section title="도구 사용 분포">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(toolUsage).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <span key={name} style={{
                padding: '5px 12px', borderRadius: 'var(--rx)', fontSize: 11, fontWeight: 500,
                background: 'var(--s2)', color: 'var(--tx2)', border: '1px solid var(--bd)',
              }}>
                {name} <strong>{count}</strong>
              </span>
            ))}
          </div>
        </Section>
      )}

      <div style={{
        display: 'flex', gap: 16, fontSize: 12, color: 'var(--mt)',
        paddingTop: 16, borderTop: '1px solid var(--bd)', marginTop: 24,
      }}>
        {session._timeRange && <span>{session._timeRange}</span>}
        <span>입력: {formatTokens(session.tokens?.totalInput || 0)}</span>
        <span>출력: {formatTokens(session.tokens?.totalOutput || 0)}</span>
        {session.model && <span>{session.model}</span>}
      </div>
    </>
  );
}

function StatBox({ value, label }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
      padding: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fafafa', letterSpacing: '-.5px' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: 20, marginTop: title === '실행한 명령어' ? 20 : 0 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px',
        color: 'var(--mt)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {title}
        {count && (
          <span style={{
            background: 'var(--s2)', padding: '2px 8px', borderRadius: 'var(--rx)',
            fontSize: 10, color: 'var(--dm)',
          }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
