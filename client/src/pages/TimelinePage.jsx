import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import ViewSwitcher from '../components/daybook/ViewSwitcher';
import DayMemo from '../components/daybook/DayMemo';
import CopyMarkdownButton from '../components/daybook/CopyMarkdownButton';
import WeeklyView from '../components/daybook/WeeklyView';
import MonthlyView from '../components/daybook/MonthlyView';
import TimelineEntry from '../components/timeline/TimelineEntry';
import ConversationModal from '../components/ConversationModal';
import { fetchTimeline, fetchDaybookRange } from '../api/client';

dayjs.locale('ko');

export default function TimelinePage({ project = 'all' }) {
  const { date } = useParams();
  const navigate = useNavigate();
  const currentDate = date || dayjs().format('YYYY-MM-DD');
  const [view, setView] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversationSession, setConversationSession] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);

    let promise;
    if (view === 'daily') {
      promise = fetchTimeline(currentDate, project, { signal });
    } else if (view === 'weekly') {
      const from = dayjs(currentDate).startOf('week').format('YYYY-MM-DD');
      const to = dayjs(currentDate).endOf('week').format('YYYY-MM-DD');
      promise = fetchDaybookRange(from, to, project, false, { signal });
    } else {
      const from = dayjs(currentDate).startOf('month').format('YYYY-MM-DD');
      const to = dayjs(currentDate).endOf('month').format('YYYY-MM-DD');
      promise = fetchDaybookRange(from, to, project, false, { signal });
    }

    promise
      .then((res) => { if (!signal.aborted) setData(res); })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => { if (!signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [currentDate, project, view]);

  const goTo = (d) => navigate(`/timeline/${d}`);

  const handlePrev = () => {
    const unit = view === 'daily' ? 'day' : view === 'weekly' ? 'week' : 'month';
    goTo(dayjs(currentDate).subtract(1, unit).format('YYYY-MM-DD'));
  };
  const handleNext = () => {
    const unit = view === 'daily' ? 'day' : view === 'weekly' ? 'week' : 'month';
    goTo(dayjs(currentDate).add(1, unit).format('YYYY-MM-DD'));
  };
  const handleToday = () => goTo(dayjs().format('YYYY-MM-DD'));

  const handleDayClick = (dayDate) => {
    setView('daily');
    goTo(dayDate);
  };

  const isToday = currentDate === dayjs().format('YYYY-MM-DD');

  return (
    <>
      <div style={{
        background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <TimelineNav
          date={currentDate} view={view}
          onPrev={handlePrev} onNext={handleNext} onToday={handleToday}
          isToday={isToday}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ViewSwitcher value={view} onChange={setView} />
          {view === 'daily' && data && <DailyStats data={data} />}
          {data && <CopyMarkdownButton data={data} view={view} />}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mt)' }}>
            불러오는 중...
          </div>
        )}

        {!loading && view === 'daily' && data && (
          <DailyTimeline data={data} onSessionClick={setConversationSession} />
        )}
        {!loading && view === 'weekly' && data && <WeeklyView data={data} />}
        {!loading && view === 'monthly' && data && <MonthlyView data={data} onDayClick={handleDayClick} />}

        {!loading && !data && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--dm)' }}>
            데이터를 불러올 수 없습니다
          </div>
        )}
      </div>

      <ConversationModal
        session={conversationSession}
        onClose={() => setConversationSession(null)}
      />
    </>
  );
}

function DailyTimeline({ data, onSessionClick }) {
  const entries = data.entries || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 800, margin: '0 auto' }}>
      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dm)' }}>
          이 날짜에 활동이 없습니다
        </div>
      )}
      {entries.map((entry, i) => (
        <TimelineEntry key={`${entry.type}-${i}`} entry={entry} onSessionClick={onSessionClick} />
      ))}
      <DayMemo date={data.date} initialContent={data.memo?.content} />
    </div>
  );
}

function DailyStats({ data }) {
  const stats = data.stats;
  if (!stats) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {stats.sessions > 0 && <MiniStat value={stats.sessions} label="세션" />}
      {stats.commits > 0 && <MiniStat value={stats.commits} label="커밋" />}
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
      padding: '6px 14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--mt)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function TimelineNav({ date, view, onPrev, onNext, onToday, isToday }) {
  const d = dayjs(date);
  let mainText, subText;

  if (view === 'daily') {
    mainText = d.format('MM월 DD일');
    subText = d.format('YYYY년') + ' ' + d.format('dddd');
  } else if (view === 'weekly') {
    const from = d.startOf('week');
    const to = d.endOf('week');
    mainText = `${from.format('MM/DD')} ~ ${to.format('MM/DD')}`;
    subText = `${from.format('YYYY년')} 제${Math.ceil(from.date() / 7)}주`;
  } else {
    mainText = d.format('YYYY년 MM월');
    subText = `${d.daysInMonth()}일`;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <NavBtn onClick={onPrev}>&#8249;</NavBtn>
      <div style={{ textAlign: 'center', minWidth: 140 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', color: 'var(--tx)' }}>
          {mainText}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dm)', marginTop: 2 }}>{subText}</div>
      </div>
      <NavBtn onClick={onNext}>&#8250;</NavBtn>
      {!isToday && (
        <button
          onClick={onToday}
          style={{
            padding: '6px 14px', borderRadius: 'var(--rx)', border: 'none',
            background: 'var(--ac)', color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
          }}
        >
          오늘
        </button>
      )}
    </div>
  );
}

function NavBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: 'var(--rs)',
        border: '1px solid var(--bd)', background: 'transparent',
        color: 'var(--mt)', cursor: 'pointer', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--s2)';
        e.currentTarget.style.color = 'var(--tx)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--mt)';
      }}
    >
      {children}
    </button>
  );
}
