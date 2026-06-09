import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

/**
 * 목~수 주기 계산.
 * 기준일로부터 "가장 최근 지난 목요일 ~ 그 다음 수요일" 범위를 반환.
 * 오늘이 목요일이면 오늘이 시작일.
 */
export function getWeekRange(baseDate) {
  const d = dayjs(baseDate);
  const dow = d.day(); // 0=일, 1=월, ..., 4=목, ..., 6=토
  // 목요일(4)까지의 거리를 계산하여 가장 최근 목요일 산출
  const diffToThursday = (dow - 4 + 7) % 7;
  const from = d.subtract(diffToThursday, 'day');
  const to = from.add(6, 'day');
  return { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') };
}

export default function WeekSelector({ baseDate, onBaseChange }) {
  const { from, to } = getWeekRange(baseDate);
  const fromD = dayjs(from);
  const toD = dayjs(to);

  const isThisWeek = (() => {
    const { from: curFrom } = getWeekRange(dayjs());
    return from === curFrom;
  })();

  const mainText = `${fromD.format('MM/DD')}(${fromD.format('dd')}) ~ ${toD.format('MM/DD')}(${toD.format('dd')})`;
  const subText = fromD.format('YYYY년');

  const handlePrev = () => onBaseChange(dayjs(baseDate).subtract(7, 'day').format('YYYY-MM-DD'));
  const handleNext = () => onBaseChange(dayjs(baseDate).add(7, 'day').format('YYYY-MM-DD'));
  const handleThisWeek = () => onBaseChange(dayjs().format('YYYY-MM-DD'));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <NavBtn onClick={handlePrev}>&#8249;</NavBtn>
      <div style={{ textAlign: 'center', minWidth: 200 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', color: 'var(--tx)' }}>
          {mainText}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dm)', marginTop: 2 }}>{subText}</div>
      </div>
      <NavBtn onClick={handleNext}>&#8250;</NavBtn>
      {!isThisWeek && (
        <button
          onClick={handleThisWeek}
          style={{
            padding: '6px 14px', borderRadius: 'var(--rx)', border: 'none',
            background: 'var(--ac)', color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
          }}
        >
          이번주
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
