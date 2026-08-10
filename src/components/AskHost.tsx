'use client';

import { useEffect, useRef, useState } from 'react';
import { onAsk, type Question } from '@/lib/ask';

/**
 * 묻는 말은 두 줄로 — **무엇이 없어지는지 한 줄, 안심할 것 한 줄.** 그게 끝이다.
 * 그리고 버튼 이름을 물음에 맞춘다.
 */
export default function AskHost() {
  const [q, setQ] = useState<Question | null>(null);
  const reply = useRef<((yes: boolean) => void) | null>(null);

  useEffect(
    () =>
      onAsk((question, answer) => {
        reply.current = answer;
        setQ(question);
      }),
    [],
  );

  useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const close = (yes: boolean) => {
    reply.current?.(yes);
    reply.current = null;
    setQ(null);
  };

  if (!q) return null;

  return (
    <>
      <div className="fixed inset-0 z-[45] bg-[rgba(62,58,77,.35)]" onClick={() => close(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={q.title}
        className="fixed left-1/2 top-1/2 z-[46] w-[min(340px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 rounded-card bg-card p-5 shadow-[0_20px_50px_rgba(62,58,77,.25)]"
      >
        <h2 className="font-round text-[16px] leading-[1.4]">{q.title}</h2>
        {(q.loses || q.keeps) && (
          <div className="mt-2.5 space-y-1 text-[12.5px] leading-[1.6] text-ink2">
            {q.loses && <p>{q.loses}</p>}
            {q.keeps && <p className="text-ink3">{q.keeps}</p>}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="flex-1 rounded-2xl bg-sunk py-[13px] text-[13.5px] font-medium text-ink2 active:opacity-80"
          >
            그만두기
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`flex-1 rounded-2xl py-[13px] text-[13.5px] font-medium text-white active:scale-[.99] ${
              q.danger ? 'bg-high' : 'bg-accent'
            }`}
          >
            {q.go}
          </button>
        </div>
      </div>
    </>
  );
}
