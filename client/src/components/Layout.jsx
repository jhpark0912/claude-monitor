import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const THEME_KEY = 'dashboard-theme';
const FONTSIZE_KEY = 'dashboard-fontsize';

export default function Layout({ children, showKanban = false }) {
  const project = 'all';
  const location = useLocation();
  const navigate = useNavigate();

  const isTimeline = location.pathname.startsWith('/timeline');
  const isAnalytics = location.pathname === '/analytics';
  const isReports = location.pathname.startsWith('/reports');
  const isMonitor = location.pathname === '/monitor';
  const isKanban = location.pathname.startsWith('/kanban');

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

        <nav style={{ display: 'flex', gap: 0 }}>
          <NavTab
            active={isTimeline}
            onClick={() => navigate(`/timeline/${dayjs().format('YYYY-MM-DD')}`)}
          >
            타임라인
          </NavTab>
          <NavTab active={isAnalytics} onClick={() => navigate('/analytics')}>
            분석
          </NavTab>
          <NavTab active={isReports} onClick={() => navigate('/reports/daily')}>
            보고서
          </NavTab>
          <NavTab active={isMonitor} onClick={() => navigate('/monitor')}>
            모니터링
          </NavTab>
          {showKanban && (
            <NavTab active={isKanban} onClick={() => navigate('/kanban')}>
              칸반
            </NavTab>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
          <FontSizeControl />
        </div>
      </header>

      <main style={{ marginTop: 52, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
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
        padding: '8px 18px', border: 'none', background: 'transparent',
        color: active ? 'var(--tx)' : 'var(--mt)',
        cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
        fontFamily: 'inherit', transition: 'all .15s',
        borderBottom: active ? '2px solid var(--ac)' : '2px solid transparent',
        marginBottom: -1,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--tx)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = active ? 'var(--tx)' : 'var(--mt)'; }}
    >
      {children}
    </button>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem(THEME_KEY) || 'light',
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? '라이트 모드' : '다크 모드'}
      style={{
        width: 32, height: 32, borderRadius: 'var(--rx)', border: '1px solid var(--bd)',
        background: 'transparent', cursor: 'pointer', fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s', color: 'var(--mt)',
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
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

const FONT_SIZES = [
  { key: 'small', label: 'S' },
  { key: 'medium', label: 'M' },
  { key: 'large', label: 'L' },
];

function FontSizeControl() {
  const [size, setSize] = useState(() =>
    localStorage.getItem(FONTSIZE_KEY) || 'medium',
  );

  useEffect(() => {
    document.documentElement.dataset.fontsize = size;
    localStorage.setItem(FONTSIZE_KEY, size);
  }, [size]);

  return (
    <div
      title="글씨 크기"
      style={{
        display: 'flex', gap: 1, background: 'var(--s1)', borderRadius: 'var(--rx)',
        padding: 2, border: '1px solid var(--bd)',
      }}
    >
      {FONT_SIZES.map((s) => (
        <button
          key={s.key}
          onClick={() => setSize(s.key)}
          style={{
            width: 24, height: 24, borderRadius: 4, border: 'none',
            background: size === s.key ? 'var(--ac)' : 'transparent',
            color: size === s.key ? '#fff' : 'var(--mt)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all .15s',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
