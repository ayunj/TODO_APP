'use client';

import { useMemo } from 'react';
import MonthCell from './month/MonthCell';
import { DOW, daysInMonth, firstDow, monthKey, todayStr } from '@/lib/date';
import { sortTasks, tasksInMonth, tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 월별 — 상단 요약 세 숫자 + 달력. 막대 그래프로 대체하지 않는다. */
export default function MonthScreen() {
  const { tasks } = useStore();
  const { cursor, filter, setCursor, setView } = useUi();
  const today = todayStr();

  const monthTasks = useMemo(() => tasksInMonth(tasks, cursor, filter), [tasks, cursor, filter]);
  const doneCount = monthTasks.filter((t) => t.done).length;
  const rate = monthTasks.length ? Math.round((doneCount / monthTasks.length) * 100) : 0;

  const prefix = monthKey(cursor);
  const pad = firstDow(cursor);
  const last = daysInMonth(cursor);

  const goto = (date: string) => {
    setCursor(date);
    setView('day');
  };

  return (
    <>
      <div className="mb-[14px] flex gap-[9px]">
        {[
          { k: '할 일', v: String(monthTasks.length) },
          { k: '완료', v: String(doneCount) },
          { k: '달성률', v: `${rate}`, unit: '%' },
        ].map((s) => (
          <div key={s.k} className="flex-1 rounded-2xl bg-card px-[13px] py-3 shadow-card">
            <span className="block text-[10.5px] text-ink3">{s.k}</span>
            <span className="mt-0.5 block font-round text-[20px] font-medium">
              <span className="font-mono">{s.v}</span>
              {s.unit && <small className="text-[12px] text-ink3">{s.unit}</small>}
            </span>
          </div>
        ))}
      </div>

      {/*
        폭을 넓혀 글자를 더 넣어보려 했는데 되돌렸다.
        화면 여백 밖으로 8px 밀고 카드 여백·칸 사이까지 줄여도 46.3px → 50.6px,
        글자로는 반 자(4.7 → 5.2)였다. 여백을 다 버려야 겨우 한 자를 더 얻는다.
        7칸을 390px에 나누는 한 못 벗어나는 한계라, 여백을 지키는 쪽을 택했다.
      */}
      <div className="grid grid-cols-7 gap-[3px] rounded-card bg-card px-2 py-3 shadow-card">
        {DOW.map((w, i) => (
          <span
            key={w}
            className={`pb-[7px] text-center text-[11px] ${i === 0 ? 'text-high' : 'text-ink3'}`}
          >
            {w}
          </span>
        ))}

        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad-${i}`} className="invisible min-h-16" />
        ))}

        {Array.from({ length: last }, (_, i) => {
          const day = i + 1;
          const date = `${prefix}-${String(day).padStart(2, '0')}`;
          const all = tasksOn(tasks, date, filter);
          return (
            <MonthCell
              key={date}
              day={day}
              date={date}
              isToday={date === today}
              isSunday={(pad + i) % 7 === 0}
              tasks={sortTasks(all)}
              onSelect={goto}
            />
          );
        })}
      </div>
    </>
  );
}
