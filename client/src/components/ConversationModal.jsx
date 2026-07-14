import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchConversation } from '../api/client';
import { formatTokens, TOOL_ICONS } from '../utils/colors';
import { formatTime } from '../utils/datetime';
import { MD_COMPONENTS } from './MarkdownComponents';
import ModalShell from './ModalShell';

export default function ConversationModal({ session, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setData(null);
    fetchConversation(session.projectDir, session.fileKey || session.sessionId)
      .then(setData)
      .catch(() => setData({ sessionId: session.sessionId, turns: [] }))
      .finally(() => setLoading(false));
  }, [session]);

  const copyText = useCallback((text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }, []);

  if (!session) return null;

  const sessionId = data?.sessionId || session.sessionId || session.fileKey?.replace('.jsonl', '') || '';
  const shortId = sessionId.substring(0, 8);
  const totalTokens = (session.tokens?.totalInput || 0) + (session.tokens?.totalOutput || 0);

  return (
    <ModalShell onClose={onClose} panelStyle={{ width: 'min(88vw, 920px)', height: '85vh' }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--bd)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 'var(--rx)', border: '1px solid var(--bd)',
            background: 'transparent', color: 'var(--mt)', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,.1)'; e.currentTarget.style.color = 'var(--rd)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mt)'; }}
          >✕</button>

          <span style={{ fontSize: 15, fontWeight: 600 }}>세션 대화</span>
          <div style={{ flex: 1 }} />

          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            fontSize: 11, color: 'var(--mt)', fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span style={{ color: 'var(--ac)', fontWeight: 500 }}>{shortId}</span>
            <Dot />
            <span>{session.projectLabel}</span>
            <Dot />
            <span>{session._timeRange}</span>
            <Dot />
            <span>{formatTokens(totalTokens)}</span>
          </div>

          <CopyBtn
            label="ID 복사"
            copied={copiedField === 'id'}
            onClick={() => copyText(sessionId, 'id')}
          />
          <CopyBtn
            label="--resume"
            mono
            copied={copiedField === 'resume'}
            onClick={() => copyText(`claude --resume ${sessionId}`, 'resume')}
          />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: 'var(--bg)' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mt)', fontSize: 13 }}>
              대화 내용을 불러오는 중...
            </div>
          )}

          {!loading && data?.turns?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mt)', fontSize: 13 }}>
              대화 내용이 없습니다.
            </div>
          )}

          {!loading && data?.turns?.map((turn, i) => (
            <Turn key={i} turn={turn} />
          ))}
        </div>

      <style>{`
        .turn-claude h1, .turn-claude h2, .turn-claude h3, .turn-claude h4 {
          color: var(--tx); margin: 12px 0 6px; line-height: 1.4;
        }
        .turn-claude h1 { font-size: 1.3em; }
        .turn-claude h2 { font-size: 1.15em; }
        .turn-claude h3 { font-size: 1.05em; }
        .turn-claude p { margin: 6px 0; }
        .turn-claude ul, .turn-claude ol { margin: 6px 0; padding-left: 20px; }
        .turn-claude li { margin: 2px 0; }
        .turn-claude li > p { margin: 2px 0; }
        .turn-claude blockquote {
          margin: 8px 0; padding: 6px 12px;
          border-left: 3px solid var(--ac); background: rgba(129,140,248,.06);
          color: var(--mt);
        }
        .turn-claude a { color: var(--ac); text-decoration: underline; }
        .turn-claude strong { color: var(--tx); }
        .turn-claude hr { border: none; border-top: 1px solid var(--bd); margin: 12px 0; }
        .turn-claude > :first-child { margin-top: 0; }
        .turn-claude > :last-child { margin-bottom: 0; }
      `}</style>
    </ModalShell>
  );
}

function Turn({ turn }) {
  const isUser = turn.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!turn.text) return;
    navigator.clipboard.writeText(turn.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0,
          background: isUser ? 'var(--ac-bg)' : 'rgba(192,132,252,.08)',
          color: isUser ? 'var(--ac)' : 'var(--pr)',
          border: `1px solid ${isUser ? 'var(--ac-bd)' : 'rgba(192,132,252,.15)'}`,
        }}>
          {isUser ? 'U' : 'C'}
        </div>
        <span style={{ fontWeight: 600 }}>{isUser ? 'User' : 'Claude'}</span>
        <span style={{ color: 'var(--dm)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          {turn.timestamp ? formatTime(turn.timestamp) : ''}
          {!isUser && turn.tokens ? ` · ${formatTokens(turn.tokens)}` : ''}
        </span>
      </div>

      <div className={isUser ? 'turn-user' : 'turn-claude'} style={{
        marginLeft: 32, padding: '14px 16px', borderRadius: 'var(--rs)',
        fontSize: 13, lineHeight: 1.7, wordBreak: 'break-word',
        background: isUser ? 'rgba(129,140,248,.08)' : 'var(--s2)',
        border: `1px solid ${isUser ? 'rgba(129,140,248,.15)' : 'var(--bd)'}`,
        color: 'var(--tx2)',
        position: 'relative',
        ...(isUser ? { whiteSpace: 'pre-wrap' } : {}),
      }}>
        {turn.text && (
          <button onClick={handleCopy} style={{
            position: 'absolute', top: 8, right: 8, padding: '3px 8px',
            borderRadius: 4, fontSize: 10, fontWeight: 500, cursor: 'pointer',
            border: '1px solid', transition: 'all .15s',
            background: copied ? 'rgba(74,222,128,.1)' : 'transparent',
            color: copied ? 'var(--gn)' : 'var(--dm)',
            borderColor: copied ? 'rgba(74,222,128,.3)' : 'transparent',
            opacity: copied ? 1 : 0.4,
          }}
            onMouseEnter={e => { if (!copied) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--ac)'; e.currentTarget.style.borderColor = 'var(--ac-bd)'; }}}
            onMouseLeave={e => { if (!copied) { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--dm)'; e.currentTarget.style.borderColor = 'transparent'; }}}
          >
            {copied ? '✓' : '복사'}
          </button>
        )}

        {isUser ? turn.text : <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{turn.text || ''}</ReactMarkdown>}

        {turn.tools?.length > 0 && (
          <div style={{ marginTop: turn.text ? 10 : 0 }}>
            {turn.tools.map((tool, j) => (
              <ToolBlock key={j} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBlock({ tool }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      margin: '6px 0', borderRadius: 'var(--rx)', overflow: 'hidden',
      border: '1px solid rgba(192,132,252,.15)', background: 'rgba(192,132,252,.04)',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          cursor: 'pointer', fontSize: 12, transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,132,252,.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 10, fontWeight: 700,
          background: 'rgba(192,132,252,.15)', color: 'var(--pr)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {TOOL_ICONS[tool.name] || '·'}
        </span>
        <span style={{ fontWeight: 600, color: 'var(--pr)', fontFamily: "'JetBrains Mono', monospace" }}>
          {tool.name}
        </span>
        <span style={{
          color: 'var(--mt)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {tool.input}
        </span>
        <span style={{
          color: 'var(--dm)', fontSize: 10, transition: 'transform .2s',
          transform: open ? 'rotate(90deg)' : 'rotate(0)',
        }}>▶</span>
      </div>
      {open && (
        <div style={{
          padding: '10px 12px', borderTop: '1px solid rgba(192,132,252,.1)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6,
          color: 'var(--tx2)', background: 'var(--bg)', maxHeight: 200, overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }}>
          {tool.input || '(파라미터 없음)'}
        </div>
      )}
    </div>
  );
}

function CopyBtn({ label, mono, copied, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 500,
      border: '1px solid', cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
      fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
      background: copied ? 'rgba(74,222,128,.1)' : 'transparent',
      color: copied ? 'var(--gn)' : 'var(--mt)',
      borderColor: copied ? 'rgba(74,222,128,.3)' : 'var(--bd)',
    }}
      onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = 'var(--ac-bg)'; e.currentTarget.style.color = 'var(--ac)'; e.currentTarget.style.borderColor = 'var(--ac-bd)'; }}}
      onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mt)'; e.currentTarget.style.borderColor = 'var(--bd)'; }}}
    >
      {copied ? '✓ 복사됨' : label}
    </button>
  );
}

function Dot() {
  return <span style={{ color: 'var(--dm)' }}>·</span>;
}
