'use client';

import { useState } from 'react';
import type { DateStr } from '@/lib/types';

/**
 * 날짜가 바뀌면 그쪽에서 밀려 들어온다. 어느 쪽으로 갔는지 손에 남게.
 *
 * **어떻게 바뀌었는지는 안 본다.** 쓸어 넘겼든 헤더의 `‹ ›`를 눌렀든 달력 칸을 눌렀든,
 * 날짜만 비교해서 방향을 정한다. 그래서 넘기는 길이 늘어도 여기는 손댈 일이 없다.
 *
 * `key`를 날짜로 주는 게 핵심이다. 같은 요소를 두면 애니메이션이 한 번만 돌고 만다.
 */
export default function SlidePage({
  cursor,
  children,
}: {
  cursor: DateStr;
  children: React.ReactNode;
}) {
  const [prev, setPrev] = useState(cursor);
  const [dir, setDir] = useState<'next' | 'prev' | null>(null);

  // 렌더 중에 맞춰둔다 — 효과로 미루면 한 프레임 늦어 첫 칸이 깜빡인다
  if (cursor !== prev) {
    setDir(cursor > prev ? 'next' : 'prev');
    setPrev(cursor);
  }

  return (
    <div key={cursor} className={dir ? `slide-${dir}` : undefined}>
      {children}
    </div>
  );
}
