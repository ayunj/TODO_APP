'use client';

import WelcomeArt from './WelcomeArt';
import { useStore } from '@/lib/store';

/**
 * 처음 열었을 때 한 번만 나오는 화면.
 * 탭바도 + 버튼도 아직 없다 — 누를 곳이 하나뿐이어야 한다.
 */
export default function WelcomeScreen() {
  const { finishWelcome } = useStore();

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-[520px] flex-col px-5"
      style={{
        paddingTop: 'calc(24px + env(safe-area-inset-top))',
        paddingBottom: 'calc(30px + env(safe-area-inset-bottom))',
      }}
    >
      <WelcomeArt />

      <h2 className="text-center font-round text-[25px] font-normal tracking-[-0.02em]">
        오늘도 하나씩
      </h2>
      <p className="mb-[26px] mt-[9px] text-center text-[13.5px] leading-[1.7] text-ink3">
        반복되는 집안일, 언제 했는지
        <br />더 이상 기억하지 않아도 됩니다.
      </p>

      <div className="mb-auto mt-9 pb-5">
        <button
          type="button"
          onClick={finishWelcome}
          className="w-full rounded-[18px] bg-accent py-[17px] text-center text-[15.5px] font-medium text-white shadow-fab active:scale-[.99]"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
