'use client';

import { useMemo } from 'react';
import CategoryBars from './log/CategoryBars';
import HabitGrid from './log/HabitGrid';
import { addDays, daysFrom, daysInMonth, monthStart, weekStartOf } from '@/lib/date';
import { tasksInMonth, tasksInRange } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 기록 — 되풀이하는 일을 격자로 칠해 보여준다 (반복 기록 · 습관 트래커).
 *
 * 폭이 둘이다. **한 달치는 칸이 작아 하루하루가 안 보이고, 주간은 칸이 커서 요일이 들어간다.**
 */
export default function LogScreen() {
  const { tasks, weekStart } = useStore();
  const { cursor, filter, logSpan, setLogSpan } = useUi();

  const weekly = logSpan === 'week';
  const from = weekly ? weekStartOf(cursor, weekStart) : monthStart(cursor);
  const days = useMemo(
    () => daysFrom(from, weekly ? 7 : daysInMonth(cursor)),
    [from, weekly, cursor],
  );

  const spanTasks = useMemo(
    () =>
      weekly
        ? tasksInRange(tasks, from, addDays(from, 6), filter)
        : tasksInMonth(tasks, cursor, filter),
    [weekly, tasks, from, cursor, filter],
  );

  const done = spanTasks.filter((t) => t.done).length;
  const rate = spanTasks.length ? Math.round((done / spanTasks.length) * 100) : 0;

  return (
    <>
      <div className="mb-2.5 flex gap-1 rounded-2xl bg-sunk p-1">
        {(['week', 'month'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setLogSpan(s)}
            className={`flex-1 rounded-[14px] py-2 text-[12.5px] font-medium transition-colors ${
              logSpan === s ? 'bg-card text-ink shadow-card' : 'text-ink3'
            }`}
          >
            {s === 'week' ? '주간' : '월간'}
          </button>
        ))}
      </div>

      <div className="mb-2 rounded-card px-[18px] pb-4 pt-[18px] shadow-card [background:var(--card)]">
        <span className="text-[12px] text-ink3">{weekly ? '이번 주' : '이번 달'} 완료율</span>
        <span className="my-0.5 mb-3 block font-round text-[38px] leading-[1.1]">
          {rate}
          <small className="ml-0.5 text-[16px] text-ink3">%</small>
          {rate === 100 && spanTasks.length > 0 && <span className="float-right text-[30px]">🏆</span>}
        </span>
        <span className="block h-[9px] overflow-hidden rounded-full bg-track">
          <i
            className="block h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${rate}%` }}
          />
        </span>
      </div>

      {/*
        주간에는 카테고리 막대를 안 그린다.
        한 주치는 표본이 적어 `2/3` 같은 숫자가 아무 말도 안 한다.
      */}
      {!weekly && <CategoryBars monthTasks={spanTasks} />}

      <HabitGrid spanTasks={spanTasks} days={days} />
    </>
  );
}
