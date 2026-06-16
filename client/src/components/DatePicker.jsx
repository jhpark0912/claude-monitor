import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export default function DatePicker({ value, onChange, reportDates }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(value ? dayjs(value).format('YYYY-MM') : dayjs().format('YYYY-MM'));
  const ref = useRef(null);

  useEffect(() => {
    if (value) setViewMonth(dayjs(value).format('YYYY-MM'));
  }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const target = dayjs(viewMonth + '-01');
  const daysInMonth = target.daysInMonth();
  const startDow = target.day();
  const today = dayjs().format('YYYY-MM-DD');
  const reportSet = new Set(reportDates || []);

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewMonth(dayjs(viewMonth + '-01').subtract(1, 'month').format('YYYY-MM'));
  const nextMonth = () => setViewMonth(dayjs(viewMonth + '-01').add(1, 'month').format('YYYY-MM'));

  const select = (day) => {
    const date = `${viewMonth}-${String(day).padStart(2, '0')}`;
    onChange(date);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer', textAlign: 'center', minWidth: 140 }}>
        {value ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', color: 'var(--tx)' }}>
              {dayjs(value).format('MM월 DD일')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--dm)', marginTop: 2 }}>
              {dayjs(value).format('YYYY년 dddd')}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 16, color: 'var(--dm)' }}>날짜 선택</div>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: 8, zIndex: 100, width: 280, padding: '12px 14px',
          background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--r)',
          boxShadow: 'var(--shadow-h)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <ArrowBtn onClick={prevMonth}>&#8249;</ArrowBtn>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>
              {target.format('YYYY년 MM월')}
            </span>
            <ArrowBtn onClick={nextMonth}>&#8250;</ArrowBtn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
            {DOW.map((d) => (
              <div key={d} style={{ fontSize: 10, color: 'var(--dm)', padding: '4px 0', fontWeight: 600 }}>{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const date = `${viewMonth}-${String(day).padStart(2, '0')}`;
              const isToday = date === today;
              const isSelected = date === value;
              const hasReport = reportSet.has(date);
              const isFuture = dayjs(date).isAfter(dayjs(), 'day');
              return (
                <div
                  key={day}
                  onClick={() => !isFuture && select(day)}
                  style={{
                    padding: '5px 0', fontSize: 12, borderRadius: 6,
                    cursor: isFuture ? 'default' : 'pointer',
                    opacity: isFuture ? 0.3 : 1,
                    fontWeight: isSelected ? 700 : 400,
                    color: isSelected ? '#fff' : isToday ? 'var(--ac)' : 'var(--tx)',
                    background: isSelected ? 'var(--ac)' : 'transparent',
                    position: 'relative',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected && !isFuture) e.currentTarget.style.background = 'var(--s2)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {day}
                  {hasReport && !isSelected && (
                    <div style={{
                      position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%', background: 'var(--ac)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 6, border: '1px solid var(--bd)',
      background: 'transparent', color: 'var(--mt)', cursor: 'pointer', fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}
