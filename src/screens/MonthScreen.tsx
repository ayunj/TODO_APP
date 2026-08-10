'use client';

import { useMemo } from 'react';
import MonthCell from './month/MonthCell';
import { DOW, daysInMonth, dowOf, firstDow, monthKey, todayStr } from '@/lib/date';
import { sortTasks, tasksInMonth, tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 월별 — 상단 요약 세 숫자 + 달력. 막대 그래프로 대체하지 않는다. */
export default function MonthScreen() {
  const { tasks, weekStart } = useStore();
  const { cursor, filter, setCursor, setTab } = useUi();
  const today = todayStr();

  const monthTasks = useMemo(() => tasksInMonth(tasks, cursor, filter), [tasks, cursor, filter]);
  const doneCount = monthTasks.filter((t) => t.done).length;
  const rate = monthTasks.length ? Math.round((doneCount / monthTasks.length) * 100) : 0;

  const prefix = monthKey(cursor);
  // 앞을 몇 칸 비울지는 주가 어디서 시작하느냐에 달렸다 (앱 설정 · 주 시작)
  const pad = (firstDow(cursor) - weekStart + 7) % 7;
  const last = daysInMonth(cursor);
  const dow = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);

  const goto = (date: string) => {
    setCursor(date);
    setTab('day');
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
        {dow.map((d) => (
          <span
            key={d}
            className={`pb-[7px] text-center text-[11px] ${d === 0 ? 'text-high' : 'text-ink3'}`}
          >
            {DOW[d]}
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
              // 첫 칸이 아니라 진짜 일요일에 붉게 — 주가 월요일에 시작해도 자리를 안 옮긴다
              isSunday={dowOf(date) === 0}
              tasks={sortTasks(all)}
              onSelect={goto}
            />
          );
        })}
      </div>
    </>
  );
}
