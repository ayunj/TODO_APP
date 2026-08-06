'use client';

import { bandOf } from '@/lib/constants';
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
      className="flex min-h-16 flex-col items-stretch gap-0.5 overflow-hidden rounded-xl bg-transparent px-[2px] py-[5px] active:bg-sunk"
    >
      <span
        className={`mx-auto grid h-[22px] w-[22px] place-items-center rounded-full text-center font-mono text-[13.5px] leading-[1.3] ${
          isToday ? 'bg-accent text-white' : isSunday ? 'text-high' : 'text-ink2'
        }`}
      >
        {day}
      </span>

      {/*
        카테고리를 옆의 점이 아니라 글씨 바탕으로 말한다.
        칸 하나가 폰에서 45px 남짓인데 점 4px + 간격 3px이 글자 자리를 7px 먹었다.
        바탕으로 옮기니 그만큼 글씨를 키울 수 있고, 점보다 눈에 잘 띈다.
      */}
      {shown.map((t) => (
        <span
          key={t.id}
          className={`overflow-hidden text-ellipsis whitespace-nowrap rounded-[4px] px-[2px] py-[1px] text-[10px] leading-[1.35] ${
            t.done ? 'text-ink3 line-through' : 'text-ink2'
          }`}
          style={{ background: bandOf(categoryOf(t.categoryId).color) }}
        >
          {t.title}
        </span>
      ))}

      {rest > 0 && <span className="text-center font-mono text-[9.5px] text-ink3">+{rest}</span>}
    </button>
  );
}
