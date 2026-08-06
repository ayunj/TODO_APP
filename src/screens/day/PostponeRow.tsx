'use client';

import { useRef } from 'react';
import { CalendarIcon } from '@/components/Icons';
import { addDays, shortDate } from '@/lib/date';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { DateStr, Task } from '@/lib/types';

/**
 * 하루를 닫는 동작. "오늘은 여기까지" 하는 순간은 하루에 한 번이지 항목마다 오지 않는다.
 * 기본은 내일, 달력을 누르면 다른 날로 보낼 수 있다.
 */
export default function PostponeRow({ tasks, from }: { tasks: Task[]; from: DateStr }) {
  const { postponeTasks } = useStore();
  const picker = useRef<HTMLInputElement>(null);
  const tomorrow = addDays(from, 1);

  const move = (to: DateStr) => {
    postponeTasks(
      tasks.map((t) => t.id),
      to,
    );
    toast(`${tasks.length}개를 ${shortDate(to)}로 미뤘어요`);
  };

  return (
    <div className="relative mt-[11px] flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => move(tomorrow)}
        className="flex-1 rounded-card bg-card p-[15px] text-[14.5px] font-medium text-ink2 shadow-card active:bg-sunk"
      >
        남은 {tasks.length}개 내일로 미루기
      </button>

      <button
        type="button"
        aria-label="날짜 골라서 미루기"
        onClick={() => {
          const input = picker.current;
          if (!input) return;
          try {
            input.showPicker();
          } catch {
            input.focus(); // showPicker를 막는 브라우저에서는 네이티브 동작에 맡긴다
          }
        }}
        className="grid w-[52px] flex-none place-items-center rounded-card bg-card text-ink2 shadow-card active:bg-sunk"
      >
        <CalendarIcon className="h-[19px] w-[19px]" />
      </button>

      {/* 달력은 네이티브 것을 쓴다. 안 보이게 두되 없애지는 않는다 — 자리를 알아야 그 옆에 뜬다. */}
      <input
        ref={picker}
        type="date"
        min={tomorrow}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => e.target.value && move(e.target.value)}
        className="pointer-events-none absolute bottom-0 right-0 h-full w-[52px] opacity-0"
      />
    </div>
  );
}
