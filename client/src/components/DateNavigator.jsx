import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

export default function DateNavigator({ date, onDateChange }) {
  const current = dayjs(date);
  const today = dayjs().format('YYYY-MM-DD');
  const isToday = date === today;

  const dateText = current.format('MM월 DD일');
  const dateSub = current.format('YYYY년') + ' ' + current.format('dddd');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <DateBtn onClick={() => onDateChange(current.subtract(1, 'day').format('YYYY-MM-DD'))}>
        &#8249;
      </DateBtn>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', color: 'var(--tx)' }}>
          {dateText}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dm)', marginTop: 2 }}>{dateSub}</div>
      </div>
      <DateBtn onClick={() => onDateChange(current.add(1, 'day').format('YYYY-MM-DD'))}>
        &#8250;
      </DateBtn>
      {!isToday && (
        <button
          onClick={() => onDateChange(today)}
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

function DateBtn({ onClick, children }) {
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
        e.currentTarget.style.borderColor = 'var(--bd2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--mt)';
        e.currentTarget.style.borderColor = 'var(--bd)';
      }}
    >
      {children}
    </button>
  );
}
