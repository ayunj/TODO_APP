'use client';

import { useEffect, useRef, useState } from 'react';
import Tomato, { type Pose } from './Tomato';
import { onToast } from '@/lib/toast';

export default function Toast() {
  const [message, setMessage] = useState('');
  const [pose, setPose] = useState<Pose | undefined>(undefined);
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const off = onToast((m, p) => {
      setMessage(m);
      setPose(p);
      setOn(true);
      if (timer.current) clearTimeout(timer.current);
      // 그림이 붙으면 볼 것이 하나 더 생기니 조금 더 세워둔다
      timer.current = setTimeout(() => setOn(false), p ? 2600 : 1900);
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
      className={`pointer-events-none fixed left-1/2 z-40 flex items-center gap-2.5 rounded-full bg-ink text-[13px] text-white shadow-[0_8px_24px_rgba(62,58,77,.25)] transition duration-200 ${
        // 그림이 붙으면 왼쪽 여백을 줄여 그림이 알약에 담긴 것처럼 보이게 한다
        pose ? 'py-2 pl-2.5 pr-5' : 'px-5 py-3'
      } ${
        on ? 'translate-x-[-50%] translate-y-0 opacity-100' : 'translate-x-[-50%] translate-y-[10px] opacity-0'
      }`}
      style={{ bottom: 'calc(var(--bar) + 28px + env(safe-area-inset-bottom))' }}
    >
      {pose && <Tomato pose={pose} size={38} className="flex-none" />}
      {message}
    </div>
  );
}
