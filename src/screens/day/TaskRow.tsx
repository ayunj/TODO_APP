'use client';

import { PostponeIcon } from '@/components/Icons';
import { addDays, diffDays, shortDate, todayStr } from '@/lib/date';
import { cycleProgress } from '@/lib/repeat';
import { canPostpone } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import type { Task } from '@/lib/types';

/** 메모는 일별 화면에서만 보인다 — 이 컴포넌트만 메모를 그린다 */
export default function TaskRow({ task, showDate = false }: { task: Task; showDate?: boolean }) {
  const { categoryOf, toggleTask, removeTask, postponeTasks } = useStore();
  const { openSheet } = useUi();
  const today = todayStr();
  const category = categoryOf(task.categoryId);
  const cycle = cycleProgress(task, today);

  const cycleLabel =
    task.repeatDays === 1 ? '매일' : task.repeatDays > 1 ? `${task.repeatDays}일마다` : '';

  // 밀린 일을 빨갛게 칠하지 않는다. 지났으면 며칠 지났다고만 적는다.
  const late = !task.done && task.date < today ? diffDays(task.date, today) : 0;

  return (
    <li
      className={`flex items-start gap-3 rounded-card px-[15px] ${
        task.done ? 'bg-sunk py-[13px]' : 'bg-card py-[15px] shadow-card'
      }`}
    >
      <button
        type="button"
        aria-label="완료 표시"
        aria-pressed={task.done}
        onClick={() => toggleTask(task.id)}
        className={`mt-px grid h-[25px] w-[25px] flex-none place-items-center rounded-full border-[1.8px] text-[13px] font-bold active:scale-90 ${
          task.done ? 'border-ok bg-ok text-white' : 'border-edge text-transparent'
        }`}
      >
        ✓
      </button>

      <button
        type="button"
        aria-label="수정"
        onClick={() => openSheet({ kind: 'task', id: task.id })}
        className="min-w-0 flex-1 bg-transparent text-left"
      >
        <span
          className={`block break-words text-[16px] font-medium leading-[1.45] ${
            task.done ? 'text-done line-through decoration-1' : ''
          }`}
        >
          {task.title}
          {task.priority === 3 && <span className="ml-1.5 text-[14px] text-star">★</span>}
        </span>

        {task.memo && (
          <span
            className={`mt-2 block whitespace-pre-wrap break-words rounded-xl text-[13.5px] leading-[1.55] ${
              task.done ? 'bg-transparent px-0 pb-0 pt-0.5 text-done' : 'bg-memo px-3 py-2.5 text-ink2'
            }`}
          >
            {task.memo}
          </span>
        )}

        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink3">
          <span className="inline-flex items-center gap-[5px]">
            <span className="h-[7px] w-[7px] rounded-full" style={{ background: category.color }} />
            {category.name}
          </span>
          {cycleLabel && (
            <>
              <span className="text-faint">·</span>
              <span>{cycleLabel}</span>
            </>
          )}
          {!task.done && task.repeatDays > 0 && task.repeatUntil && (
            <>
              <span className="text-faint">·</span>
              <span className="font-mono">~{shortDate(task.repeatUntil)}까지</span>
            </>
          )}
          {showDate && (
            <>
              <span className="text-faint">·</span>
              <span className="font-mono">{shortDate(task.date)}</span>
            </>
          )}
          {late > 0 && !showDate && (
            <>
              <span className="text-faint">·</span>
              <span>{late}일 지남</span>
            </>
          )}
          {task.done && task.doneBy && (
            <span className="rounded-full bg-accent-soft px-[9px] py-0.5 text-[11.5px] font-medium text-accent">
              {task.doneBy}
            </span>
          )}
        </span>

        {/* 반복 항목은 얇은 상태 게이지로 주기 진행률만 보여준다 (경고 아님) */}
        {!task.done && cycle && (
          <span className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-sunk">
            <i
              className="block h-full rounded-full"
              style={{ width: `${Math.round(cycle.pct * 100)}%`, background: 'var(--cycle)' }}
            />
          </span>
        )}
      </button>

      <span className="flex flex-none flex-col items-center gap-0.5">
        {/* 오늘 지나면 안 해도 되는 일이 있으니 한 건씩도 넘길 수 있게 — 오늘·어제 것만 */}
        {!task.done && canPostpone(task.date, today) && (
          <button
            type="button"
            aria-label="내일로 미루기"
            onClick={() => {
              // 오늘·어제 것만 여기 오니 갈 곳은 늘 내일이다
              const next = addDays(today, 1);
              postponeTasks([task.id], next);
              toast(`${task.title} — ${shortDate(next)}로 미뤘어요`);
            }}
            className="grid h-7 w-7 place-items-center rounded-[10px] text-faint active:bg-sunk active:text-accent"
          >
            <PostponeIcon className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          aria-label="삭제"
          onClick={() => removeTask(task.id)}
          className="grid h-7 w-7 place-items-center rounded-[10px] text-[17px] text-faint active:bg-sunk active:text-high"
        >
          ×
        </button>
      </span>
    </li>
  );
}
