import dayjs from 'dayjs';

export default function AnomalyCard({ anomalies = [], recentSessions = [] }) {
  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={iconStyle}>⚡</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>주목할 세션</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--mt)' }}>프로젝트별 평균 대비 이상 세션</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {anomalies.length === 0 && (
          <div style={emptyStyle}>이번 달은 특이사항 없음</div>
        )}

        {anomalies.map((s, i) => (
          <div key={i} style={anomalyRowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {s.reasons.map((r, ri) => (
                  <span key={ri} style={getBadgeStyle(r.type)}>{r.label}</span>
                ))}
                <span style={{ fontSize: 10, color: 'var(--mt)' }}>
                  {dayjs(s.date).format('M/D')} ({['일','월','화','수','목','금','토'][dayjs(s.date).day()]})
                </span>
              </div>
              <div style={promptStyle}>
                {s.projectLabel} — {s.firstPrompt || '(프롬프트 없음)'}
              </div>
              <div style={metaStyle}>
                {s.durationMin >= 60
                  ? `${Math.floor(s.durationMin / 60)}시간 ${s.durationMin % 60}분`
                  : `${s.durationMin}분`}
                {' · '}{s.model} · 토큰 {fmtTokens(s.tokens)}
                {s.toolSummary && ` · ${s.toolSummary}`}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b', paddingLeft: 12, flexShrink: 0 }}>
              ${s.cost.toFixed(2)}
            </div>
          </div>
        ))}

        {anomalies.length > 0 && (
          <div style={criteriaStyle}>
            기준: 해당 프로젝트 평균 대비 — 비용 1.5배 / 시간 2배 / Bash 2배 / 동일파일 세션 내 5회+ 수정
          </div>
        )}

        {recentSessions.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 4, marginBottom: 2 }}>최근 일반 세션</div>
            {recentSessions.map((s, i) => (
              <div key={i} style={recentRowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...promptStyle, color: 'var(--mt)' }}>
                    {s.projectLabel} — {s.firstPrompt || '(프롬프트 없음)'}
                  </div>
                  <div style={metaStyle}>
                    {dayjs(s.date).format('M/D')} · {s.durationMin}분 · {s.model} · {fmtTokens(s.tokens)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--mt)', paddingLeft: 12, flexShrink: 0 }}>
                  ${s.cost.toFixed(2)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function fmtTokens(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function getBadgeStyle(type) {
  const map = {
    cost: { bg: '#2d1f0f', color: '#f59e0b' },
    duration: { bg: '#0f1a2d', color: '#3b82f6' },
    bash: { bg: '#1a0d0d', color: '#ef4444' },
    file_thrashing: { bg: '#2d0f1f', color: '#ec4899' },
  };
  const c = map[type] || map.cost;
  return {
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
    borderRadius: 4, fontSize: 9, fontWeight: 600, background: c.bg, color: c.color,
  };
}

const cardStyle = {
  background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12,
  padding: 16, display: 'flex', flexDirection: 'column',
  height: '100%', boxSizing: 'border-box', overflow: 'hidden',
};
const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
};
const iconStyle = {
  width: 24, height: 24, borderRadius: 6, background: '#2d1f0f',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
};
const emptyStyle = {
  fontSize: 13, color: 'var(--mt)', padding: '40px 20px', textAlign: 'center',
  background: 'var(--bg)', borderRadius: 10, border: '1px dashed var(--bd)',
};
const anomalyRowStyle = {
  display: 'flex', alignItems: 'flex-start', padding: '10px 12px',
  background: 'rgba(245, 158, 11, 0.05)', borderRadius: 8, borderLeft: '3px solid #f59e0b',
};
const recentRowStyle = {
  display: 'flex', alignItems: 'center', padding: '8px 12px',
  background: 'var(--bg)', borderRadius: 8,
};
const promptStyle = {
  fontSize: 12, color: 'var(--tx)', whiteSpace: 'nowrap',
  overflow: 'hidden', textOverflow: 'ellipsis',
};
const metaStyle = {
  fontSize: 10, color: 'var(--mt)', marginTop: 4,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
const criteriaStyle = {
  fontSize: 10, color: 'var(--mt)', textAlign: 'center', padding: '6px 0',
  borderTop: '1px solid var(--bd)', marginTop: 4,
};
