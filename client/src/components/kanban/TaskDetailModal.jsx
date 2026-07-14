import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTaskDetail } from '../../hooks/useKanban';
import { STATUS_CONFIG, PRIORITY_CONFIG, NOTE_TYPE_LABELS, NOTE_TYPE_BADGE_CLASS } from '../../constants/kanban';
import { formatDateTime, formatTime } from '../../utils/datetime';
import { MD_COMPONENTS } from '../MarkdownComponents';
import ModalShell from '../ModalShell';

const TABS = [
  { key: 'overview', label: '개요' },
  { key: 'activity', label: '활동' },
  { key: 'history', label: '히스토리' },
];

/** 태스크 상세 모달. 개요/활동/히스토리 3탭. */
export default function TaskDetailModal({ taskId, onClose }) {
  const { task, activityNotes, historyNotes, loading } = useTaskDetail(taskId);
  const [tab, setTab] = useState('overview');

  return (
    <ModalShell onClose={onClose} panelStyle={{ width: 'min(88vw, 720px)', maxHeight: '80vh' }}>
      {loading || !task ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mt)' }}>로딩 중...</div>
      ) : (
        <>
          {/* Header */}
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <Badge>{STATUS_CONFIG[task.status]?.label ?? task.status}</Badge>
              <Badge color={PRIORITY_CONFIG[task.priority]?.color}>{PRIORITY_CONFIG[task.priority]?.label ?? task.priority}</Badge>
              {task.is_blocked && <Badge color="var(--rd)">BLOCKED</Badge>}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--mt)' }}>v{task.version}</span>
              <button onClick={onClose} style={closeBtnStyle}>✕</button>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{task.title}</div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, padding: '10px 22px 0', flexShrink: 0 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
                  background: tab === t.key ? 'var(--s2)' : 'transparent',
                  color: tab === t.key ? 'var(--tx)' : 'var(--mt)',
                }}
              >
                {t.label}
                {t.key === 'activity' && activityNotes.length > 0 && ` (${activityNotes.length})`}
                {t.key === 'history' && historyNotes.length > 0 && ` (${historyNotes.length})`}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 20px' }}>
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {task.blocker_reason && (
                  <div style={{ fontSize: 12, color: 'var(--rd)' }}>블로커: {task.blocker_reason}</div>
                )}
                {task.description && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mt)', marginBottom: 8 }}>설명</div>
                    <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>
                      <ReactMarkdown components={MD_COMPONENTS}>{task.description}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'activity' && (
              activityNotes.length === 0 ? (
                <EmptyState text="활동 노트 없음" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activityNotes.map((note) => <NoteItem key={note.id} note={note} />)}
                </div>
              )
            )}

            {tab === 'history' && (
              historyNotes.length === 0 ? (
                <EmptyState text="히스토리 없음" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 4 }}>
                  {historyNotes.map((note) => (
                    <div key={note.id}>
                      <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 3 }}>
                        {formatDateTime(note.created_at)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--tx)' }}>
                        <ReactMarkdown components={MD_COMPONENTS}>{note.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 22px', borderTop: '1px solid var(--bd)', fontSize: 11, color: 'var(--mt)', flexShrink: 0 }}>
            생성: {formatDateTime(task.created_at)}
          </div>
        </>
      )}
    </ModalShell>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px',
      borderRadius: 6, border: '1px solid var(--bd)', fontSize: 11, fontWeight: 600,
      color: color ?? 'var(--tx2)',
    }}>{children}</span>
  );
}

function EmptyState({ text }) {
  return <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--mt)', fontSize: 13 }}>{text}</p>;
}

function NoteItem({ note }) {
  const badgeClass = NOTE_TYPE_BADGE_CLASS[note.note_type] ?? NOTE_TYPE_BADGE_CLASS.system;
  const label = NOTE_TYPE_LABELS[note.note_type] ?? note.note_type;

  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--s2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className={badgeClass} style={{ fontSize: 9, padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--mt)' }}>{formatTime(note.created_at)}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.5 }}>
        <ReactMarkdown components={MD_COMPONENTS}>{note.content}</ReactMarkdown>
      </div>
    </div>
  );
}

const closeBtnStyle = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid var(--bd)',
  background: 'transparent', color: 'var(--mt)', cursor: 'pointer', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
