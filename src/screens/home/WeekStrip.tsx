'use client';

import { useMemo } from 'react';
import { DOW, dayOf, daysFrom, dowOf, monthOf, todayStr, weekStartOf } from '@/lib/date';
import { tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 이번 주 한 줄. 어느 날에 무엇이 있는지를 **점 하나**로만 말한다 —
 * 무엇인지는 눌러 들어가면 그 날 목록이 그대로 말해준다.
 *
 * 점 색은 그 날 **첫 할 일의 카테고리 색**이다. 여러 개면 어차피 다 못 그린다.
 */
export default function WeekStrip({ left }: { left: number }) {
  const { tasks, weekStart, categoryOf } = useStore();
  const { setCursor, setTab } = useUi();
  const today = todayStr();

  const days = useMemo(
    () => daysFrom(weekStartOf(today, weekStart), 7),
    [today, weekStart],
  );

  return (
    <section className="mb-[11px] flex items-stretch rounded-card bg-card shadow-card">
      <div className="flex min-w-0 flex-1 items-center py-[13px] pl-2.5 pr-1">
        <span className="flex-none pl-1.5 pr-1 text-[13.5px] font-bold">{monthOf(today)}월</span>
        {days.map((d) => {
          const list = tasksOn(tasks, d, null);
          const on = d === today;
          const sun = dowOf(d) === 0;
          const dot = list.length ? categoryOf(list[0].categoryId).color : null;

          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setCursor(d);
                setTab('day');
              }}
              className="min-w-0 flex-1 bg-transparent"
            >
              <span
                className={`block text-[10px] ${on ? 'text-accent' : sun ? 'text-high' : 'text-ink3'}`}
              >
                {DOW[dowOf(d)]}
              </span>
              <span
                className={`relative mx-auto mt-1 grid h-[25px] w-[25px] place-items-center rounded-full font-mono text-[12.5px] ${
                  on ? 'bg-accent font-medium text-white' : sun ? 'text-high' : ''
                }`}
              >
                {dayOf(d)}
                {dot && (
                  <i
                    className="absolute -bottom-1 left-1/2 -ml-[2px] h-1 w-1 rounded-full"
                    style={{ background: on ? 'var(--accent)' : dot }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex w-[80px] flex-none flex-col items-center justify-center gap-px border-l border-line2 px-1.5 py-[13px]">
        <span className="text-[11px] text-ink3">오늘 남은</span>
        <b className="font-mono text-[17px] font-bold text-accent">{left}</b>
      </div>
    </section>
  );
}
