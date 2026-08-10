'use client';

import { useEffect, useState } from 'react';
import { BackIcon } from './Icons';
import { useUi } from '@/lib/ui';

interface Props {
  title: string;
  /** 제목 오른쪽에 붙는 것 — 방 설정의 `내가 연 방` 칩 같은 것 */
  right?: React.ReactNode;
}

/**
 * 밀고 들어온 화면의 제목 줄. 나가는 길은 왼쪽 화살표 하나다.
 *
 * 설정 갈래는 층이 셋까지 가는데(설정 → 같이 쓰기 → 방 설정),
 * 시트를 쌓으면 어디까지 왔는지가 안 보인다. 뒤로가기 하나로 층이 정리되는 쪽을 택했다.
 */
export default function PageBar({ title, right }: Props) {
  const { popView } = useUi();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-[15] -mx-4 bg-bg px-4 ${stuck ? 'shadow-[0_1px_0_var(--line)]' : ''}`}
    >
      <div className="flex items-center gap-1.5 pb-[14px] pt-[calc(14px+env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="돌아가기"
          onClick={popView}
          className="-ml-1.5 grid h-[38px] w-[38px] flex-none place-items-center rounded-full text-ink2 active:bg-sunk"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-round text-[19px] font-normal leading-[1.2] tracking-[-.02em]">
          {title}
        </h1>
        {right}
      </div>
    </header>
  );
}
