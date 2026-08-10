'use client';

import { useEffect, useState } from 'react';
import CategoryFilter from './CategoryFilter';
import { BackIcon, GearIcon, MemoIcon, ShopIcon } from './Icons';
import { DOW, addDays, addMonths, dowOf, monthOf, todayStr, yearOf, dayOf } from '@/lib/date';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

const round =
  'grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-card text-ink2 shadow-card active:bg-sunk';

/**
 * 상단 고정 헤더.
 * 윗줄에 드나드는 곳(장보기·메모·설정), 아랫줄에 날짜와 이동 — 한 줄에 몰면 좁은 폰에서 빡빡하다.
 */
export default function Header() {
  const { view, cursor, setCursor, pushView, popView } = useUi();
  const { shopping, memos, memoSeenAt } = useStore();
  // 마지막으로 본 뒤에 고쳐진 메모가 있으면 점을 띄운다
  const unseenMemo = memos.some((m) => m.text.trim() && m.updatedAt > memoSeenAt);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  const shell = `sticky top-0 z-[15] -mx-4 bg-bg px-4 ${stuck ? 'shadow-[0_1px_0_var(--line)]' : ''}`;
  const pushed = view === 'shop' || view === 'memo';

  // 밀고 들어온 화면 — 뒤로가기 하나면 된다. 날짜도 카테고리도 없다.
  if (pushed) {
    const left = shopping.filter((i) => !i.done).length;
    return (
      <header className={shell}>
        <div className="flex items-center gap-1.5 pb-[14px] pt-[calc(14px+env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="돌아가기"
            onClick={popView}
            className="-ml-1.5 grid h-[38px] w-[38px] flex-none place-items-center rounded-full text-ink2 active:bg-sunk"
          >
            <BackIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-medium tracking-[.1em] text-ink3">
              {view === 'shop'
                ? left > 0
                  ? `${left}개 담아둠`
                  : '살 것 적어두기'
                : memos.length > 0
                  ? `${memos.length}장`
                  : '흘러가지 않는 것들'}
            </div>
            <h1 className="mt-px font-round text-[21px] font-normal leading-[1.2] tracking-[-.02em]">
              {view === 'shop' ? '장보기' : '메모'}
            </h1>
          </div>
        </div>
      </header>
    );
  }

  const step = (n: number) => setCursor(view === 'day' ? addDays(cursor, n) : addMonths(cursor, n));
  const isToday = cursor === todayStr();
  const left = shopping.filter((i) => !i.done).length;
  const eyebrow =
    view === 'day'
      ? isToday
        ? '오늘도 하나씩'
        : `${yearOf(cursor)}년`
      : view === 'month'
        ? `${yearOf(cursor)}년`
        : '반복 기록';

  return (
    <header className={shell}>
      {/* 윗줄 — 드나드는 곳 */}
      <div className="flex items-center gap-2 pt-[calc(12px+env(safe-area-inset-top))]">
        <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium tracking-[.1em] text-ink3">
          {eyebrow}
        </span>

        <button
          type="button"
          aria-label={left > 0 ? `장보기 ${left}개 담아둠` : '장보기'}
          onClick={() => pushView({ kind: 'shop' })}
          className={`relative ${round}`}
        >
          <ShopIcon className="h-[19px] w-[19px]" />
          {left > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-medium text-white">
              {left}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={unseenMemo ? '메모 — 새로 적힌 것이 있음' : '메모'}
          onClick={() => pushView({ kind: 'memo' })}
          className={`relative ${round}`}
        >
          <MemoIcon className="h-[19px] w-[19px]" />
          {unseenMemo && (
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-accent" />
          )}
        </button>

        <button
          type="button"
          aria-label="설정"
          onClick={() => pushView({ kind: 'settings' })}
          className={round}
        >
          <GearIcon className="h-[19px] w-[19px]" />
        </button>
      </div>

      {/* 아랫줄 — 날짜와 이동 */}
      <div className="flex items-end gap-2 pb-3 pt-1.5">
        <h1 className="min-w-0 flex-1 font-round text-[22px] font-normal leading-[1.2] tracking-[-.02em]">
          {view === 'day' ? (
            <>
              {monthOf(cursor)}월 {dayOf(cursor)}일{' '}
              <span className="text-ink3">{DOW[dowOf(cursor)]}요일</span>
            </>
          ) : view === 'month' ? (
            `${monthOf(cursor)}월`
          ) : (
            `${monthOf(cursor)}월 기록`
          )}
        </h1>

        <div className="flex flex-none items-center gap-px pb-0.5">
          <button
            type="button"
            aria-label="이전"
            onClick={() => step(-1)}
            className="grid h-[30px] w-[30px] place-items-center rounded-[10px] text-[16px] text-ink3 active:bg-sunk"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="오늘로"
            onClick={() => setCursor(todayStr())}
            className="grid h-[30px] w-[30px] place-items-center rounded-[10px] text-[16px] text-ink3 active:bg-sunk"
          >
            ·
          </button>
          <button
            type="button"
            aria-label="다음"
            onClick={() => step(1)}
            className="grid h-[30px] w-[30px] place-items-center rounded-[10px] text-[16px] text-ink3 active:bg-sunk"
          >
            ›
          </button>
        </div>
      </div>

      <CategoryFilter />
    </header>
  );
}
