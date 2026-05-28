import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { fetchAnalyticsAnomalies } from '../api/client';
import CalendarCard from '../components/analytics/CalendarCard';
import DailyCostCard from '../components/analytics/DailyCostCard';
import AnomalyCard from '../components/analytics/AnomalyCard';
import FactSummary from '../components/analytics/FactSummary';
import ToolUsageCard from '../components/analytics/ToolUsageCard';
import CalendarDrilldown from '../components/analytics/CalendarDrilldown';
import CostDrilldown from '../components/analytics/CostDrilldown';

export default function AnalyticsPage({ project }) {
  const [drilldown, setDrilldown] = useState(null);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [anomalyData, setAnomalyData] = useState(null);

  useEffect(() => {
    fetchAnalyticsAnomalies(month, project).then(setAnomalyData).catch(() => {});
  }, [month, project]);

  if (drilldown === 'calendar') {
    return <CalendarDrilldown project={project} onBack={() => setDrilldown(null)} />;
  }
  if (drilldown === 'cost') {
    return <CostDrilldown project={project} onBack={() => setDrilldown(null)} />;
  }

  function handleCardClick(target, e) {
    if (e.target.closest('button')) return;
    setDrilldown(target);
  }

  return (
    <div style={containerStyle}>
      {/* LEFT SIDEBAR */}
      <div style={sidebarStyle}>
        <div onClick={(e) => handleCardClick('calendar', e)} style={{ cursor: 'pointer', flexShrink: 0 }}>
          <CalendarCard project={project} month={month} onMonthChange={setMonth} />
        </div>

        <FactSummary
          sessionCount={anomalyData?.sessionCount}
          baseline={anomalyData?.baseline}
        />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12, padding: 16 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ac)', lineHeight: 1 }}>
              {calcStreak(anomalyData)}일
            </div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 3 }}>연속 활동 중</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--mt)' }}>
            최장: <strong style={{ color: 'var(--pr)' }}>{calcMaxStreak(anomalyData)}일</strong>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <ToolUsageCard toolTotals={anomalyData?.toolTotals} />
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={rightColStyle}>
        <div onClick={(e) => handleCardClick('cost', e)} style={{ cursor: 'pointer', flexShrink: 0 }}>
          <DailyCostCard project={project} />
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <AnomalyCard
            anomalies={anomalyData?.anomalies}
            recentSessions={anomalyData?.recentSessions}
          />
        </div>
      </div>
    </div>
  );
}

function calcStreak(data) {
  if (!data?.anomalies && !data?.recentSessions) return 0;
  const all = [...(data.anomalies || []), ...(data.recentSessions || [])];
  const dates = new Set(all.map(s => s.date));
  let streak = 0;
  let d = dayjs();
  while (dates.has(d.format('YYYY-MM-DD'))) {
    streak++;
    d = d.subtract(1, 'day');
  }
  return streak;
}

function calcMaxStreak(data) {
  if (!data?.anomalies && !data?.recentSessions) return 0;
  const all = [...(data.anomalies || []), ...(data.recentSessions || [])];
  const dates = [...new Set(all.map(s => s.date))].sort();
  if (dates.length === 0) return 0;
  let max = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dayjs(dates[i]).diff(dayjs(dates[i - 1]), 'day') === 1) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }
  return max;
}

const containerStyle = {
  padding: '12px 16px', maxWidth: 1200, margin: '0 auto', width: '100%',
  height: '100%', display: 'grid', gridTemplateColumns: '300px 1fr',
  gridTemplateRows: '1fr', gap: 12, boxSizing: 'border-box',
};
const sidebarStyle = {
  display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden',
};
const rightColStyle = {
  display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0,
  overflow: 'hidden',
};
