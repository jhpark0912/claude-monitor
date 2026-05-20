import { useState } from 'react';
import DiffBar from './DiffBar';

export default function CommitItem({ commit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => commit.files?.length > 0 && setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          borderRadius: 'var(--rx)', cursor: commit.files?.length > 0 ? 'pointer' : 'default',
          transition: 'background .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--s2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {commit.files?.length > 0 && (
          <span style={{ fontSize: 9, color: 'var(--dm)', width: 10, flexShrink: 0 }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
        <span style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
          color: 'var(--ac)', background: 'var(--ac-bg)',
          padding: '1px 5px', borderRadius: 3, flexShrink: 0,
        }}>
          {commit.hash}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 500, color: 'var(--tx)',
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {commit.message}
        </span>
        <DiffBar additions={commit.additions} deletions={commit.deletions} />
        <span style={{ fontSize: 10, color: 'var(--dm)', flexShrink: 0 }}>
          {commit.files?.length || 0} files
        </span>
      </div>

      {expanded && commit.files?.length > 0 && (
        <div style={{ paddingLeft: 36, paddingBottom: 6 }}>
          {commit.files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 3,
                color: f.status === 'created' ? 'var(--gn)' : 'var(--yw)',
                background: f.status === 'created' ? 'rgba(74,222,128,.12)' : 'rgba(251,191,36,.12)',
              }}>
                {f.status === 'created' ? 'NEW' : 'MOD'}
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--tx2)',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {f.path}
              </span>
              {f.add > 0 && (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--gn)' }}>
                  +{f.add}
                </span>
              )}
              {f.del > 0 && (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--rd)' }}>
                  -{f.del}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
