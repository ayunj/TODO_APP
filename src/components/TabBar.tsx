'use client';

import { DayIcon, LogIcon, MonthIcon, ShopIcon } from './Icons';
import { useUi } from '@/lib/ui';
import type { ViewKind } from '@/lib/types';

type IconType = React.ComponentType<{ className?: string }>;

const TABS: { v: ViewKind; label: string; Icon: IconType }[] = [
  { v: 'day', label: '일', Icon: DayIcon },
  { v: 'month', label: '월', Icon: MonthIcon },
  { v: 'shop', label: '장보기', Icon: ShopIcon },
  { v: 'log', label: '기록', Icon: LogIcon },
];

/** 하단 고정 탭바. 상단 세그먼트 컨트롤은 쓰지 않는다. */
export default function TabBar() {
  const { view, setView } = useUi();

  return (
    <nav
      role="tablist"
      className="fixed inset-x-0 bottom-0 z-[25] flex border-t border-line2 bg-card px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-tabs"
    >
      <span className="mx-auto flex w-full max-w-[520px]">
        {TABS.map(({ v, label, Icon }) => {
          const on = view === v;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setView(v)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[14px] py-[5px] text-[10.5px] font-medium ${
                on ? 'text-accent' : 'text-ink3'
              }`}
            >
              <Icon className="h-[23px] w-[23px]" />
              {label}
            </button>
          );
        })}
      </span>
    </nav>
  );
}
