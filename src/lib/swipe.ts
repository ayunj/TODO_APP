'use client';

import { useRef } from 'react';

/**
 * 옆으로 쓸어 날짜·달을 넘긴다. 헤더의 `‹ ›`와 같은 일을 손가락으로 하는 것.
 *
 * 손대지 말아야 할 것이 둘 있다.
 *
 * **가로로 스크롤되는 줄.** 카테고리 필터와 즐겨찾기 칩이 옆으로 넘어간다.
 * 그 위에서 쓸면 칩이 움직여야지 날짜가 넘어가면 안 된다.
 * `ScrollRow`가 붙여둔 `data-noswipe`를 만나면 손을 뗀다.
 *
 * **넘치는지로 판단하지 않는다.** 두 번 틀렸다.
 * 달력 칸은 `overflow-hidden`으로 제목을 자르느라 늘 넘쳐 있어서 월별이 통째로 안 넘어갔고,
 * 칩은 서너 개일 때 안 넘쳐서 같은 자리를 쓸었는데 어떤 날은 날짜가 넘어갔다.
 * "여기는 내 자리"라고 표시해두는 편이 낫다.
 *
 * **세로 스크롤.** 목록을 내리는 손짓은 완전히 수직이지 않다.
 * 가로가 세로보다 확실히 길 때만(1.5배) 넘긴다.
 */
export function useSwipe(onPrev: () => void, onNext: () => void) {
  const from = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      // 가로 스크롤 줄에서 시작했으면 그 줄에게 맡긴다
      let node = e.target as HTMLElement | null;
      while (node && node !== e.currentTarget) {
        if (node.hasAttribute('data-noswipe')) {
          from.current = null;
          return;
        }
        node = node.parentElement;
      }
      from.current = { x: t.clientX, y: t.clientY };
    },

    onTouchEnd: (e: React.TouchEvent) => {
      const start = from.current;
      from.current = null;
      if (!start) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;

      if (Math.abs(dx) < 55) return; // 톡 치는 것과 구분
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // 세로로 내리는 중

      // 왼쪽으로 쓸면 다음 장 — 종이를 넘기는 방향
      if (dx < 0) onNext();
      else onPrev();
    },
  };
}
