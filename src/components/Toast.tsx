'use client';

import { useEffect, useRef, useState } from 'react';
import { onToast } from '@/lib/toast';

export default function Toast() {
  const [message, setMessage] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const off = onToast((m) => {
      setMessage(m);
      setOn(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOn(false), 1900);
    });
    return () => {
      off();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 z-40 rounded-full bg-ink px-5 py-3 text-[14px] text-white shadow-[0_8px_24px_rgba(62,58,77,.25)] transition duration-200 ${
        on ? 'translate-x-[-50%] translate-y-0 opacity-100' : 'translate-x-[-50%] translate-y-[10px] opacity-0'
      }`}
      style={{ bottom: 'calc(var(--bar) + 28px + env(safe-area-inset-bottom))' }}
    >
      {message}
    </div>
  );
}
