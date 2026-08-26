'use client';

import { useEffect, useState } from 'react';
import { BackIcon } from './Icons';
import { useUi } from '@/lib/ui';

interface Props {
  title: string;
  /** 벗을 겹이 없는 자리(탭으로 뜨는 설정)에서는 화살표를 안 그린다 */
  back?: boolean;
  /** 제목 오른쪽에 붙는 것 — 방 설정의 `내가 연 방` 칩 같은 것 */
  right?: React.ReactNode;
  /**
   * 화살표를 눌렀을 때 할 일. 안 주면 겹을 하나 벗는다(`popView`).
   *
   * **한 화면 안에서 층이 갈리는 자리**에 쓴다 — [상점 채우기](../screens/ShopAdminScreen.tsx)의
   * `올린 것 → 채우기`가 그렇다. 그건 겹을 쌓은 것이 아니라 같은 겹 안에서 바뀌는 것이라
   * `popView`를 부르면 화면을 통째로 나가버린다.
   */
  onBack?: () => void;
}

/**
 * 밀고 들어온 화면의 제목 줄. 나가는 길은 왼쪽 화살표 하나다.
 *
 * 설정 갈래는 층이 셋까지 가는데(설정 → 같이 쓰기 → 방 설정),
 * 시트를 쌓으면 어디까지 왔는지가 안 보인다. 뒤로가기 하나로 층이 정리되는 쪽을 택했다.
 */
export default function PageBar({ title, right, back = true, onBack }: Props) {
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
        {back && (
          <button
            type="button"
            aria-label="돌아가기"
            onClick={onBack ?? popView}
            className="-ml-1.5 grid h-[38px] w-[38px] flex-none place-items-center rounded-full text-ink2 active:bg-sunk"
          >
            <BackIcon className="h-5 w-5" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate font-round text-[19px] font-normal leading-[1.2] tracking-[-.02em]">
          {title}
        </h1>
        {right}
      </div>
    </header>
  );
}
