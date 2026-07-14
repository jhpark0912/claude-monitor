import { useEffect } from 'react';

/** ref 바깥 mousedown 시 onOutside 호출. 드롭다운/팝오버 닫기에 사용. */
export function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}
