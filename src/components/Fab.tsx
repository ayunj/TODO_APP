'use client';

import { useUi } from '@/lib/ui';

/** 탭바 위 오른쪽. 홈 인디케이터에 가리지 않게 --bar 만큼 띄운다. */
export default function Fab() {
  const { openSheet } = useUi();

  return (
    <button
      type="button"
      aria-label="할 일 추가"
      onClick={() => openSheet({ kind: 'task', id: null })}
      className="fixed z-[26] grid h-14 w-14 place-items-center rounded-full bg-accent text-[28px] font-light leading-none text-white shadow-fab active:scale-95"
      style={{
        right: 'max(18px, calc(50vw - 242px))',
        bottom: 'calc(var(--bar) + 20px + env(safe-area-inset-bottom))',
      }}
    >
      +
    </button>
  );
}
