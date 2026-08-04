'use client';

import { useEffect, useState } from 'react';
import CategoryFilter from './CategoryFilter';
import { GearIcon } from './Icons';
import { DOW, addDays, addMonths, dowOf, monthOf, todayStr, yearOf, dayOf } from '@/lib/date';
import { useUi } from '@/lib/ui';

/** 상단 고정 헤더 — 날짜 제목 + 이전/오늘/다음 + 설정 */
export default function Header() {
  const { view, cursor, setCursor, openSheet } = useUi();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  // 일별은 하루씩, 월·기록은 한 달씩
  const step = (n: number) =>
    setCursor(view === 'day' ? addDays(cursor, n) : addMonths(cursor, n));

  const isToday = cursor === todayStr();
  const eyebrow =
    view === 'day'
      ? isToday
        ? '오늘도 하나씩'
        : `${yearOf(cursor)}년`
      : view === 'month'
        ? `${yearOf(cursor)}년`
        : '자주 하는 일';

  return (
    <header
      className={`sticky top-0 z-[15] -mx-4 bg-bg px-4 ${stuck ? 'shadow-[0_1px_0_var(--line)]' : ''}`}
    >
      <div className="flex items-center gap-2 pb-3 pt-[calc(14px+env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-medium tracking-[.1em] text-ink3">{eyebrow}</div>
          <h1 className="mt-px font-round text-[21px] font-normal leading-[1.2] tracking-[-.02em]">
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
        </div>

        <div className="flex items-center gap-px">
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

        <button
          type="button"
          aria-label="설정"
          onClick={() => openSheet({ kind: 'settings' })}
          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-card text-ink2 shadow-card active:bg-sunk"
        >
          <GearIcon className="h-[19px] w-[19px]" />
        </button>
      </div>

      <CategoryFilter />
    </header>
  );
}
