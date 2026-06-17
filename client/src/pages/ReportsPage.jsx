import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import WeeklyReportPage from './WeeklyReportPage';
import ReportPage from './ReportPage';
import ObjectivesReport from '../components/reports/ObjectivesReport';

const SUB_VIEWS = [
  { key: 'daily', label: '일일보고' },
  { key: 'weekly', label: '주간회의록' },
  { key: 'objectives', label: '중점추진과제' },
];

export default function ReportsPage({ project = 'all' }) {
  const { type } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeType = type || 'daily';

  const handleTypeChange = (key) => {
    navigate(`/reports/${key}`);
  };

  return (
    <>
      <div style={{
        background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
        padding: '0 24px', display: 'flex', alignItems: 'stretch', flexShrink: 0,
      }}>
        {SUB_VIEWS.map((sv) => (
          <SubTab
            key={sv.key}
            active={activeType === sv.key}
            onClick={() => handleTypeChange(sv.key)}
          >
            {sv.label}
          </SubTab>
        ))}
      </div>

      {activeType === 'weekly' && <WeeklyReportPage project={project} />}
      {activeType === 'objectives' && <ObjectivesReport />}
      {activeType === 'daily' && <ReportPage />}
    </>
  );
}

function SubTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 20px', border: 'none', background: 'transparent',
        color: active ? 'var(--tx)' : 'var(--mt)',
        fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        borderBottom: active ? '2px solid var(--ac)' : '2px solid transparent',
        transition: 'all .15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--tx)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = active ? 'var(--tx)' : 'var(--mt)'; }}
    >
      {children}
    </button>
  );
}

