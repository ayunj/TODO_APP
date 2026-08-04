'use client';

import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';

interface Props {
  day: number;
  date: string;
  isToday: boolean;
  isSunday: boolean;
  tasks: Task[];
  onSelect: (date: string) => void;
}

/** 무엇을 하는 날인지 보여야 한다 — 제목 최대 3개, 넘치면 +N */
export default function MonthCell({ day, date, isToday, isSunday, tasks, onSelect }: Props) {
  const { categoryOf } = useStore();
  const shown = tasks.slice(0, 3);
  const rest = tasks.length - shown.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className="flex min-h-16 flex-col items-stretch gap-0.5 overflow-hidden rounded-xl bg-transparent px-[3px] py-[5px] active:bg-sunk"
    >
      <span
        className={`mx-auto grid h-[22px] w-[22px] place-items-center rounded-full text-center font-mono text-[12.5px] leading-[1.3] ${
          isToday ? 'bg-accent text-white' : isSunday ? 'text-high' : 'text-ink2'
        }`}
      >
        {day}
      </span>

      {shown.map((t) => (
        <span
          key={t.id}
          className={`flex items-center gap-[3px] overflow-hidden whitespace-nowrap text-[9px] leading-[1.4] ${
            t.done ? 'text-ink3' : 'text-ink2'
          }`}
        >
          <i
            className="h-1 w-1 flex-none rounded-full"
            style={{ background: categoryOf(t.categoryId).color }}
          />
          <span className={`overflow-hidden text-ellipsis ${t.done ? 'line-through' : ''}`}>
            {t.title}
          </span>
        </span>
      ))}

      {rest > 0 && <span className="text-center font-mono text-[8.5px] text-ink3">+{rest}</span>}
    </button>
  );
}
