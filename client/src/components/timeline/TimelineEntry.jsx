import dayjs from 'dayjs';
import { getProjectColor, formatTokens } from '../../utils/colors';

export default function TimelineEntry({ entry, onSessionClick }) {
  const time = dayjs(entry.time).format('HH:mm');

  if (entry.type === 'session') {
    return <SessionEntry session={entry.data} time={time} project={entry.project} onClick={() => onSessionClick(entry.data)} />;
  }
  return <CommitEntry commit={entry.data} time={time} project={entry.project} />;
}

function SessionEntry({ session, time, project, onClick }) {
  const totalTokens = (session.tokens?.totalInput || 0) + (session.tokens?.totalOutput || 0);
  const color = getProjectColor(project);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 12, padding: '10px 14px', cursor: 'pointer',
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
        transition: 'all .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--bd-h)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--bd)'; }}
    >
      <div style={{ width: 3, borderRadius: 2, flexShrink: 0 }} className={`c-${color}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span className={`b-${color}`} style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
          }}>{project}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
            background: 'var(--ac-bg)', color: 'var(--ac)', border: '1px solid var(--ac-bd)',
          }}>세션</span>
          {session.isMultiDay && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: 'var(--yw-bg)', color: 'var(--dm)', border: '1px solid var(--yw-bd)',
              fontWeight: 600,
            }}>{session.sessionStartDate} ~</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--dm)', fontFamily: "'JetBrains Mono', monospace" }}>
            {session.isActive && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--gn)', marginRight: 4, verticalAlign: 'middle' }} />}
            {time}
            {session.endedAt && ` ~ ${dayjs(session.endedAt).format('HH:mm')}`}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: 'var(--tx2)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {session.firstPrompt || '(프롬프트 없음)'}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {totalTokens > 0 && <MiniTag>{formatTokens(totalTokens)}</MiniTag>}
          {session.model && <MiniTag>{session.model}</MiniTag>}
          {session.toolCalls?.length > 0 && <MiniTag>도구 {session.toolCalls.length}</MiniTag>}
          {session.filesChanged?.length > 0 && <MiniTag>파일 {session.filesChanged.length}</MiniTag>}
        </div>
      </div>
    </div>
  );
}

function CommitEntry({ commit, time, project }) {
  const color = getProjectColor(project);

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '8px 14px',
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
    }}>
      <div style={{ width: 3, borderRadius: 2, flexShrink: 0 }} className={`c-${color}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span className={`b-${color}`} style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
          }}>{project}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
            background: 'var(--s2)', color: 'var(--mt)', border: '1px solid var(--bd)',
          }}>커밋</span>
          <span style={{ fontSize: 10, color: 'var(--dm)', fontFamily: "'JetBrains Mono', monospace" }}>{time}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.4 }}>
          {commit.message}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
          <span style={{ color: 'var(--dm)' }}>{commit.hash}</span>
          {commit.additions > 0 && <span style={{ color: 'var(--gn)' }}>+{commit.additions}</span>}
          {commit.deletions > 0 && <span style={{ color: 'var(--rd)' }}>-{commit.deletions}</span>}
        </div>
      </div>
    </div>
  );
}

function MiniTag({ children }) {
  return (
    <span style={{
      fontSize: 9, padding: '1px 6px', borderRadius: 'var(--rx)',
      background: 'var(--bg)', color: 'var(--dm)', border: '1px solid var(--bd)',
    }}>
      {children}
    </span>
  );
}
