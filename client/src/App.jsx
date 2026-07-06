import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Layout from './components/Layout';
import TimelinePage from './pages/TimelinePage';
import MonitorPage from './pages/MonitorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import KanbanPage from './pages/KanbanPage';
import { useKanbanAvailable } from './hooks/useKanban';

export default function App() {
  const today = dayjs().format('YYYY-MM-DD');
  // SPEC §2.2 게이트: 칸반 DB 도달 가능할 때만 탭/라우트 노출 (fail-closed).
  const { available: showKanban } = useKanbanAvailable();

  return (
    <BrowserRouter>
      <Layout showKanban={showKanban}>
        {({ project }) => (
          <Routes>
            <Route path="/" element={<Navigate to={`/timeline/${today}`} replace />} />
            <Route path="/timeline/:date?" element={<TimelinePage project={project} />} />
            <Route path="/analytics" element={<AnalyticsPage project={project} />} />
            <Route path="/reports/:type?/:param?" element={<ReportsPage project={project} />} />
            <Route path="/monitor" element={<MonitorPage project={project} />} />
            {/* 게이트2: available=true일 때만 /kanban 라우트 등록. false면 미등록 → 레거시 리다이렉트로 흐름 */}
            {showKanban && <Route path="/kanban" element={<KanbanPage />} />}

            {/* 레거시 리다이렉트 */}
            <Route path="/daily/:date" element={<LegacyRedirect to="/timeline" />} />
            <Route path="/daybook/:date?" element={<LegacyRedirect to="/timeline" />} />
            <Route path="/weekly-report" element={<Navigate to="/reports/weekly" replace />} />
          </Routes>
        )}
      </Layout>
    </BrowserRouter>
  );
}

function LegacyRedirect({ to }) {
  const today = dayjs().format('YYYY-MM-DD');
  const path = window.location.pathname;
  const dateMatch = path.match(/\d{4}-\d{2}-\d{2}/);
  const date = dateMatch ? dateMatch[0] : today;
  return <Navigate to={`${to}/${date}`} replace />;
}
