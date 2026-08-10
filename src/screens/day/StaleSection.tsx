'use client';

import TaskRow from './TaskRow';
import { todayStr } from '@/lib/date';
import { useTaskFilter } from '@/lib/filter';
import { staleTasks } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** 오늘 화면 맨 아래 접힌 상태로. 빨갛게 강조하지 않는다. */
export default function StaleSection() {
  const { tasks } = useStore();
  const { cats } = useTaskFilter();
  const stale = staleTasks(tasks, todayStr(), cats);

  if (stale.length === 0) return null;

  return (
    <details className="mt-6">
      <summary className="cursor-pointer list-none border-t border-line py-3 text-[12px] text-ink3 [&::-webkit-details-marker]:hidden">
        지난 미완료 {stale.length}개 보기
      </summary>
      <ul className="mt-2.5 flex list-none flex-col gap-[9px] p-0">
        {stale.map((t) => (
          <TaskRow key={t.id} task={t} showDate />
        ))}
      </ul>
    </details>
  );
}
