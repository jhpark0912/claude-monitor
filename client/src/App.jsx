import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Layout from './components/Layout';
import DailyPage from './pages/DailyPage';
import MonitorPage from './pages/MonitorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DaybookPage from './pages/DaybookPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import ReportPage from './pages/ReportPage';

export default function App() {
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <BrowserRouter>
      <Layout>
        {({ project }) => (
          <Routes>
            <Route path="/" element={<Navigate to={`/daily/${today}`} replace />} />
            <Route path="/daily/:date" element={<DailyPage project={project} />} />
            <Route path="/daybook/:date?" element={<DaybookPage project={project} />} />
            <Route path="/monitor" element={<MonitorPage project={project} />} />
            <Route path="/analytics" element={<AnalyticsPage project={project} />} />
            <Route path="/weekly-report" element={<WeeklyReportPage project={project} />} />
            <Route path="/reports/:date?" element={<ReportPage />} />
          </Routes>
        )}
      </Layout>
    </BrowserRouter>
  );
}
