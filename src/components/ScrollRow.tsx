'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 가로로 넘치는 한 줄.
 * 스크롤바를 숨겨두면 잘린 게 고장처럼 보인다 — 넘치는 쪽 끝을 흐려서 더 있다고 알린다.
 */
export default function ScrollRow({
  children,
  className = '',
  ...rest
}: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const over = el.scrollWidth - el.clientWidth;
      setEdge({ start: el.scrollLeft > 4, end: over > 4 && el.scrollLeft < over - 4 });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [children]);

  return (
    <div className={`relative -mx-4 ${className}`} {...rest}>
      <div ref={ref} className="no-scrollbar flex gap-[7px] overflow-x-auto px-4">
        {children}
      </div>

      {edge.start && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-bg to-transparent" />
      )}
      {edge.end && (
        <span className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-bg to-transparent" />
      )}
    </div>
  );
}
