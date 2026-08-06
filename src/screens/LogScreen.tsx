'use client';

import { useMemo } from 'react';
import CategoryBars from './log/CategoryBars';
import HabitGrid from './log/HabitGrid';
import { tasksInMonth } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 기록 — 되풀이하는 일을 한 달치 격자로 칠해 보여준다 (반복 기록 · 습관 트래커) */
export default function LogScreen() {
  const { tasks } = useStore();
  const { cursor, filter } = useUi();

  const monthTasks = useMemo(() => tasksInMonth(tasks, cursor, filter), [tasks, cursor, filter]);
  const done = monthTasks.filter((t) => t.done).length;
  const rate = monthTasks.length ? Math.round((done / monthTasks.length) * 100) : 0;

  return (
    <>
      <div className="mb-2 rounded-card px-[18px] pb-4 pt-[18px] shadow-card [background:var(--card)]">
        <span className="text-[13px] text-ink3">이번 달 완료율</span>
        <span className="my-0.5 mb-3 block font-round text-[39px] leading-[1.1]">
          {rate}
          <small className="ml-0.5 text-[17px] text-ink3">%</small>
          {rate === 100 && monthTasks.length > 0 && (
            <span className="float-right text-[31px]">🏆</span>
          )}
        </span>
        <span className="block h-[9px] overflow-hidden rounded-full bg-track">
          <i
            className="block h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${rate}%` }}
          />
        </span>
      </div>

      <CategoryBars monthTasks={monthTasks} />
      <HabitGrid monthTasks={monthTasks} />
    </>
  );
}
