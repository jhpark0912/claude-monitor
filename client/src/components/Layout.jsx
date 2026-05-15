import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import ProjectFilter from './ProjectFilter';

const STORAGE_KEY = 'dashboard-selected-project';

export default function Layout({ children }) {
  const [project, setProject] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'all';
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, project);
  }, [project]);

  const isDaily = location.pathname.startsWith('/daily');
  const isMonitor = location.pathname === '/monitor';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--glass)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-bd)',
        padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.3px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff',
          }}>C</div>
          <span><span style={{ color: 'var(--ac)' }}>Claude</span> Session Dashboard</span>
        </div>

        <nav style={{
          display: 'flex', gap: 2, background: 'var(--s1)', borderRadius: 'var(--rs)',
          padding: 3, border: '1px solid var(--bd)',
        }}>
          <NavTab
            active={isDaily}
            onClick={() => navigate(`/daily/${dayjs().format('YYYY-MM-DD')}`)}
          >
            일자별
          </NavTab>
          <NavTab active={isMonitor} onClick={() => navigate('/monitor')}>
            모니터링
          </NavTab>
        </nav>

        <ProjectFilter value={project} onChange={setProject} />
      </header>

      <main style={{ marginTop: 52, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>
        {typeof children === 'function' ? children({ project }) : children}
      </main>
    </div>
  );
}

function NavTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px', borderRadius: 8, border: 'none',
        background: active ? 'var(--ac)' : 'transparent',
        color: active ? '#fff' : 'var(--mt)',
        cursor: 'pointer', fontSize: 12, fontWeight: 600,
        fontFamily: 'inherit', transition: 'all .15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--tx)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--mt)'; }}
    >
      {children}
    </button>
  );
}
