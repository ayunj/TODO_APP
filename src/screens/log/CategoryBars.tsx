'use client';

import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';

export default function CategoryBars({ monthTasks }: { monthTasks: Task[] }) {
  const { categories } = useStore();

  const rows = categories
    .map((c) => {
      const group = monthTasks.filter((t) => t.categoryId === c.id);
      return { c, total: group.length, done: group.filter((t) => t.done).length };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) return null;

  return (
    <div className="mt-2.5 rounded-card bg-card px-[15px] py-4 shadow-card">
      <div className="mb-3 text-[12.5px] font-medium text-ink2">카테고리별 완료</div>
      {rows.map((r) => (
        <div
          key={r.c.id}
          className="grid grid-cols-[78px_1fr_34px] items-center gap-2.5 py-[7px]"
        >
          <span className="flex items-center gap-[7px] overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] text-ink2">
            <i className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: r.c.color }} />
            {r.c.name}
          </span>
          <span className="h-[9px] overflow-hidden rounded-full bg-sunk">
            <i
              className="block h-full rounded-full"
              style={{ width: `${Math.round((r.done / r.total) * 100)}%`, background: r.c.color }}
            />
          </span>
          <span className="text-right font-mono text-[11.5px] text-ink3">
            {r.done}/{r.total}
          </span>
        </div>
      ))}
    </div>
  );
}
