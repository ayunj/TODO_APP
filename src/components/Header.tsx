'use client';

import { useEffect, useState } from 'react';
import CategoryFilter from './CategoryFilter';
import { BackIcon, MemoIcon, ShopIcon, StoreIcon } from './Icons';
import {
  DOW,
  addDays,
  addMonths,
  dowOf,
  monthOf,
  todayStr,
  weekStartOf,
  dayOf,
} from '@/lib/date';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

const round =
  'grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-card text-ink2 shadow-card active:bg-sunk';

/**
 * 상단 고정 헤더.
 * 윗줄에 드나드는 곳(장보기·메모·상점), 아랫줄에 날짜와 이동 —
 * 한 줄에 몰면 좁은 폰에서 빡빡하다.
 *
 * **홈에는 아랫줄이 없다.** 넘길 날짜가 없고, 곰돌이 칸이 바로 와야 한다.
 * 설정은 이제 탭이라 여기 톱니를 두지 않는다.
 */
export default function Header() {
  const { view, cursor, setCursor, pushView, popView, logSpan } = useUi();
  const { shopping, memos, memoSeenAt, weekStart } = useStore();
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
            {/*
              장보기는 개수가 할 말이 있다 — 몇 개 남았는지가 마트에서 쓰인다.
              메모는 아니다. 바로 아래에 목록이 있어 세어 적을 것이 없다.
            */}
            <div className="text-[10.5px] font-medium tracking-[.1em] text-ink3">
              {view === 'shop'
                ? left > 0
                  ? `${left}개 담아둠`
                  : '살 것 적어두기'
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

  const weekly = view === 'log' && logSpan === 'week';
  const step = (n: number) =>
    setCursor(view === 'day' ? addDays(cursor, n) : weekly ? addDays(cursor, n * 7) : addMonths(cursor, n));
  const left = shopping.filter((i) => !i.done).length;
  // 주간은 그 주의 첫날로 제목을 단다 — `8월 3일 주`
  const weekFrom = weekly ? weekStartOf(cursor, weekStart) : cursor;

  return (
    <header className={shell}>
      {/* 윗줄 — 로고와 드나드는 곳 */}
      <div className="flex items-center gap-2 pt-[calc(12px+env(safe-area-inset-top))]">
        {/*
          로고는 여백을 깎아 내보낸 것이라 그림 높이가 곧 글자 높이다 — `npm run logo`.
          안 뜨면 조용히 물러난다. 여기 자리가 비어도 아랫줄 날짜가 화면을 알려준다.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="dododu"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          className="h-5 w-auto flex-none select-none object-contain"
        />
        <span className="min-w-0 flex-1" />

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

        {/*
          상점. **알릴 것을 안 붙인다** — 장보기의 `3개 담아둠`이나 메모의 점과 달리
          포인트가 늘 때마다 점을 찍으면 사라고 조르는 게 된다.
        */}
        <button
          type="button"
          aria-label="상점"
          onClick={() => pushView({ kind: 'store' })}
          className={round}
        >
          <StoreIcon className="h-[19px] w-[19px]" />
        </button>

      </div>

      {/* 홈은 여기서 끝난다 — 넘길 날짜도 가릴 카테고리도 없다 */}
      {view === 'home' ? (
        <div className="h-3" />
      ) : (
        <>
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
          ) : weekly ? (
            `${monthOf(weekFrom)}월 ${dayOf(weekFrom)}일 주`
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
        </>
      )}
    </header>
  );
}
