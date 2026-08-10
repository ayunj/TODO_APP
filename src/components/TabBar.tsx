'use client';

import { DayIcon, LogIcon, MonthIcon } from './Icons';
import { todayStr } from '@/lib/date';
import { useUi } from '@/lib/ui';
import type { Tab } from '@/lib/ui';

type IconType = React.ComponentType<{ className?: string }>;

/** 메인은 할 일이다. 장보기는 탭이 아니라 헤더에서 밀고 들어간다. */
const TABS: { v: Tab; label: string; Icon: IconType }[] = [
  { v: 'day', label: '일', Icon: DayIcon },
  { v: 'month', label: '월', Icon: MonthIcon },
  { v: 'log', label: '기록', Icon: LogIcon },
];

/**
 * 하단 고정 탭바. 상단 세그먼트 컨트롤은 쓰지 않는다.
 *
 * **보고 있던 탭을 한 번 더 누르면 오늘로 돌아온다** — 일은 오늘, 월은 이번 달,
 * 기록은 이번 주·이번 달. 사흘 뒤를 보다가 오늘로 오려면 그전에는 화살표를 세 번 눌러야 했다.
 * 누르던 자리를 한 번 더 누르는 건 이미 손에 익은 손짓이라 새로 배울 게 없다.
 */
export default function TabBar() {
  const { view, setTab, setCursor } = useUi();

  const press = (v: Tab, on: boolean) => {
    if (!on) {
      setTab(v);
      return;
    }
    setCursor(todayStr());
    // 멀리 내려와 있으면 날짜만 바뀌고 화면은 그대로라 아무 일도 안 한 것처럼 보인다
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
              onClick={() => press(v, on)}
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
