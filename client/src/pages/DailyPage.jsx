import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import DateNavigator from '../components/DateNavigator';
import SlidePanel, { DefaultDetail } from '../components/SlidePanel';
import { fetchDailySessions } from '../api/client';
import { getProjectColor, formatTokens } from '../utils/colors';

const TOOL_ICONS = { Bash: '$', Write: '+', Edit: '~', Read: '>', Grep: '?', Glob: '*' };

export default function DailyPage({ project = 'all' }) {
  const { date } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    fetchDailySessions(date, project)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, project]);

  const sessions = useMemo(() => {
    if (!data?.sessions) return [];
    return data.sessions.map((s) => ({
      ...s,
      _color: getProjectColor(s.projectLabel),
      _timeRange: `${dayjs(s.startedAt).format('HH:mm')} ~ ${dayjs(s.endedAt).format('HH:mm')}`,
    }));
  }, [data]);

  const filtered = useMemo(() => {
    if (!searchQ) return sessions;
    const q = searchQ.toLowerCase();
    return sessions.filter((s) =>
      [s.firstPrompt, s.projectLabel, ...s.toolCalls.map((t) => t.name + ' ' + t.input),
        ...s.filesChanged.map((f) => f.path)].join(' ').toLowerCase().includes(q)
    );
  }, [sessions, searchQ]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((s) => {
      const key = s.projectLabel;
      if (!map[key]) map[key] = { label: key, color: s._color, sessions: [] };
      map[key].sessions.push(s);
    });
    return Object.values(map);
  }, [filtered]);

  const totalTokens = data ? (data.totalTokens.input + data.totalTokens.output) : 0;
  const totalTools = sessions.reduce((a, s) => a + s.toolCalls.length, 0);
  const selected = sessions.find((s) => (s.fileKey || s.sessionId) === selectedId);
  const flatIds = filtered.map((s) => s.fileKey || s.sessionId);
  const selectedIdx = flatIds.indexOf(selectedId);

  function openPanel(s) {
    const id = s.fileKey || s.sessionId;
    setSelectedId(id);
  }

  return (
    <>
      <div style={{
        background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <DateNavigator date={date} onDateChange={(d) => navigate(`/daily/${d}`)} />

        <div style={{ display: 'flex', gap: 8 }}>
          <StatCard value={data?.totalSessions ?? '-'} label="세션" />
          <StatCard value={totalTokens ? formatTokens(totalTokens) : '-'} label="토큰" />
          <StatCard value={totalTools || '-'} label="도구 호출" />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rx)',
          padding: '0 12px', height: 36, width: 220,
        }}>
          <span style={{ color: 'var(--dm)', fontSize: 13 }}>🔍</span>
          <input
            type="text" placeholder="세션 검색..."
            value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--tx)', fontSize: 12, fontFamily: 'inherit', width: '100%',
            }}
          />
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'grid', gap: 14,
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        alignContent: 'start',
        transition: 'padding-right .3s',
        paddingRight: selected ? 500 : 16,
      }}>
        {loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px', color: 'var(--mt)' }}>
            불러오는 중...
          </div>
        )}

        {!loading && grouped.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
              {searchQ ? '검색 결과 없음' : '이 날짜에 세션이 없습니다'}
            </div>
          </div>
        )}

        {!loading && grouped.map((g) => (
          <ProjectCell key={g.label} group={g} selectedId={selectedId} onSelect={openPanel} />
        ))}
      </div>

      <SlidePanel
        session={selected}
        onClose={() => setSelectedId(null)}
        onPrev={selectedIdx > 0 ? () => setSelectedId(flatIds[selectedIdx - 1]) : null}
        onNext={selectedIdx < flatIds.length - 1 ? () => setSelectedId(flatIds[selectedIdx + 1]) : null}
        hasPrev={selectedIdx > 0}
        hasNext={selectedIdx < flatIds.length - 1}
      >
        {selected && <DefaultDetail session={selected} />}
      </SlidePanel>
    </>
  );
}

function ProjectCell({ group, selectedId, onSelect }) {
  const totalTokens = group.sessions.reduce(
    (a, s) => a + (s.tokens?.totalInput || 0) + (s.tokens?.totalOutput || 0), 0
  );

  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
      display: 'flex', flexDirection: 'column', maxHeight: 500,
      boxShadow: 'var(--shadow)', transition: 'all .2s',
    }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--bd)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <span className={`c-${group.color}`} style={{ width: 10, height: 10, borderRadius: 4, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{group.label}</span>
        <span style={{ fontSize: 11, color: 'var(--dm)', marginLeft: 'auto' }}>
          {totalTokens ? formatTokens(totalTokens) : ''}
        </span>
        <span style={{
          fontSize: 11, color: 'var(--dm)', background: 'var(--s2)',
          padding: '2px 10px', borderRadius: 'var(--rx)', marginLeft: 4,
        }}>
          {group.sessions.length}개
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {group.sessions.map((s) => (
          <SessionCard
            key={s.fileKey || s.sessionId}
            session={s}
            isSelected={(s.fileKey || s.sessionId) === selectedId}
            onClick={() => onSelect(s)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionCard({ session, isSelected, onClick }) {
  const totalTokens = (session.tokens?.totalInput || 0) + (session.tokens?.totalOutput || 0);
  const toolEntries = Object.entries(session.toolUsage || {});

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--s2)', border: `1px solid ${isSelected ? 'var(--ac)' : 'var(--bd)'}`,
        borderRadius: 'var(--rs)', padding: '12px 14px', marginBottom: 8,
        cursor: 'pointer', transition: 'all .15s', overflow: 'hidden',
        boxShadow: isSelected ? '0 0 0 1px var(--ac)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--bd-h)';
          e.currentTarget.style.background = 'linear-gradient(135deg, var(--s2), rgba(129,140,248,.03))';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--bd)';
          e.currentTarget.style.background = 'var(--s2)';
        }
      }}
    >
      <div style={{
        fontSize: 10, color: 'var(--dm)', marginBottom: 4,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {session.isActive && (
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gn)', marginRight: 4, verticalAlign: 'middle',
            animation: 'pulse 2s infinite',
          }} />
        )}
        {session._timeRange}
      </div>

      <div style={{
        fontSize: 13, color: '#d4d4d8', lineHeight: 1.6, marginBottom: 8,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {session.firstPrompt || '(프롬프트 없음)'}
      </div>

      {session.toolCalls.length > 0 && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 'var(--rx)',
          padding: '6px 8px', marginBottom: 6, overflow: 'hidden',
        }}>
          {session.toolCalls.slice(0, 3).map((tc, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, padding: '1px 0' }}>
              <span style={{ color: 'var(--pr)', fontWeight: 500, flexShrink: 0 }}>{tc.name}</span>
              <span style={{ color: 'var(--dm)', wordBreak: 'break-all' }}>
                {tc.input}
              </span>
            </div>
          ))}
          {session.toolCalls.length > 3 && (
            <div style={{ color: 'var(--dm)', fontSize: 10, marginTop: 2 }}>
              +{session.toolCalls.length - 3}개 더
            </div>
          )}
        </div>
      )}

      {session.filesChanged.length > 0 && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 6 }}>
          {session.filesChanged.slice(0, 2).map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 4, padding: '1px 0' }}>
              <span style={{ color: f.action === 'created' ? 'var(--gn)' : 'var(--yw)', flexShrink: 0 }}>
                {f.action === 'created' ? '+' : '~'}
              </span>
              <span style={{ color: 'var(--dm)', wordBreak: 'break-all' }}>
                {f.path}
              </span>
            </div>
          ))}
          {session.filesChanged.length > 2 && (
            <div style={{ fontSize: 10, color: 'var(--dm)' }}>+{session.filesChanged.length - 2}개</div>
          )}
        </div>
      )}

      <div style={{
        display: 'flex', gap: 5, flexWrap: 'wrap',
        paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.04)',
      }}>
        <Tag>{formatTokens(totalTokens)}</Tag>
        {session.model && <Tag>{session.model}</Tag>}
        {toolEntries.slice(0, 3).map(([n, c]) => <Tag key={n}>{n} {c}</Tag>)}
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
      padding: '10px 18px', textAlign: 'center', minWidth: 90,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fafafa', letterSpacing: '-.5px' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--mt)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 'var(--rx)',
      background: 'var(--bg)', color: 'var(--mt)', fontWeight: 500,
      border: '1px solid var(--bd)',
    }}>
      {children}
    </span>
  );
}
