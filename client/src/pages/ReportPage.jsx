import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { fetchReportDates, fetchReport, generateReport } from '../api/client';
import ConversationModal from '../components/ConversationModal';
import DailySummary from '../components/DailySummary';
import DatePicker from '../components/DatePicker';

dayjs.locale('ko');

export default function ReportPage() {
  const { param: date } = useParams();
  const navigate = useNavigate();
  const [dates, setDates] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [modalSession, setModalSession] = useState(null);

  useEffect(() => { fetchReportDates().then(setDates).catch(() => {}); }, []);

  const currentDate = date || dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  useEffect(() => {
    setLoading(true);
    fetchReport(currentDate)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [currentDate]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateReport(currentDate);
      setReport(result);
      if (!dates.includes(currentDate)) setDates((prev) => [currentDate, ...prev].sort().reverse());
    } catch (err) {
      alert('생성 실패: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const idx = dates.indexOf(currentDate);
  const hasPrev = idx < dates.length - 1;
  const hasNext = idx > 0;

  return (
    <>
      <div style={{
        background: 'var(--s1)', borderBottom: '1px solid var(--bd)',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NavBtn onClick={() => hasPrev && navigate(`/reports/daily/${dates[idx + 1]}`)} disabled={!hasPrev}>&#8249;</NavBtn>
          <DatePicker
            value={currentDate}
            onChange={(d) => navigate(`/reports/daily/${d}`)}
            reportDates={dates}
          />
          <NavBtn onClick={() => hasNext && navigate(`/reports/daily/${dates[idx - 1]}`)} disabled={!hasNext}>&#8250;</NavBtn>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{
          padding: '8px 16px', borderRadius: 'var(--rs)', fontSize: 13, fontWeight: 600,
          border: '1px solid var(--ac-bd)', background: 'var(--ac-bg)', color: 'var(--ac)',
          cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.6 : 1,
        }}>
          {generating ? '생성 중...' : '보고서 생성'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mt)' }}>불러오는 중...</div>}
        {!loading && !report && <EmptyState onGenerate={handleGenerate} generating={generating} />}
        {!loading && report?.legacy && (
          <pre style={{ maxWidth: 800, margin: '0 auto', fontSize: 13, lineHeight: 1.7, color: 'var(--tx)', whiteSpace: 'pre-wrap' }}>
            {report.markdown}
          </pre>
        )}
        {!loading && report && !report.legacy && (
          <DailySummary report={report} onSessionClick={setModalSession} />
        )}
      </div>

      {modalSession && <ConversationModal session={modalSession} onClose={() => setModalSession(null)} />}
    </>
  );
}

function NavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 36, height: 36, borderRadius: 'var(--rs)',
      border: '1px solid var(--bd)', background: 'transparent',
      color: disabled ? 'var(--bd)' : 'var(--mt)', cursor: disabled ? 'default' : 'pointer',
      fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

function EmptyState({ onGenerate, generating }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
        =
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>보고서가 없습니다</div>
        <div style={{ fontSize: 13, color: 'var(--dm)', lineHeight: 1.6, marginBottom: 16 }}>
          이 날짜의 보고서가 없습니다. 아래 버튼을 눌러 생성하세요.
        </div>
        <button onClick={onGenerate} disabled={generating} style={{
          padding: '10px 24px', borderRadius: 'var(--rs)', fontSize: 14, fontWeight: 600,
          border: 'none', background: 'var(--ac)', color: '#fff', cursor: generating ? 'wait' : 'pointer',
        }}>
          {generating ? '생성 중...' : '보고서 생성'}
        </button>
      </div>
    </div>
  );
}
