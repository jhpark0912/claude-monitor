/** ReactMarkdown 커스텀 렌더러 — session_board CSS 변수로 스타일링(ConversationModal, TaskDetailModal 공용). */

export const MD_COMPONENTS = {
  pre({ children }) {
    return (
      <pre style={{
        background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 'var(--rx)',
        padding: '12px 14px', overflow: 'auto', fontSize: 12, lineHeight: 1.6,
        fontFamily: "'JetBrains Mono', monospace", margin: '8px 0',
      }}>
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }) {
    if (className) {
      return <code style={{ fontFamily: "'JetBrains Mono', monospace" }} {...props}>{children}</code>;
    }
    return <code style={{
      background: 'var(--bg)', padding: '2px 6px', borderRadius: 4,
      fontSize: '0.9em', fontFamily: "'JetBrains Mono', monospace",
      border: '1px solid var(--bd)',
    }} {...props}>{children}</code>;
  },
  table({ children }) {
    return (
      <div style={{ overflow: 'auto', margin: '8px 0' }}>
        <table style={{
          borderCollapse: 'collapse', width: '100%', fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th style={{
      border: '1px solid var(--bd)', padding: '6px 10px', textAlign: 'left',
      background: 'var(--bg)', fontWeight: 600, fontSize: 11,
    }}>{children}</th>;
  },
  td({ children }) {
    return <td style={{
      border: '1px solid var(--bd)', padding: '6px 10px', fontSize: 12,
    }}>{children}</td>;
  },
};
