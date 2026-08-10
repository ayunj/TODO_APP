'use client';

import { PostponeIcon } from '@/components/Icons';
import { addDays, diffDays, shortDate, todayStr } from '@/lib/date';
import { ask } from '@/lib/ask';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { canPostpone } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import type { Task } from '@/lib/types';

/** 메모는 일별 화면에서만 보인다 — 이 컴포넌트만 메모를 그린다 */
export default function TaskRow({ task, showDate = false }: { task: Task; showDate?: boolean }) {
  const { categoryOf, toggleTask, removeTask, postponeTasks, setDoneBy } = useStore();
  const { account } = useAuth();
  const { membersOf } = useRooms();
  const { openSheet } = useUi();
  const today = todayStr();
  const category = categoryOf(task.categoryId);

  // 차례 — `안 정함`이면 아무 말도 안 한다. 먼저 보는 사람이 하면 되는 일이다.
  const people = task.roomId ? membersOf(task.roomId) : [];
  const mine = task.assigneeId === account?.id;
  const turn = task.assigneeId
    ? mine
      ? '내 차례'
      : `${people.find((m) => m.userId === task.assigneeId)?.displayName ?? '누군가'} 차례`
    : '';

  const cycleLabel =
    task.repeatDays === 1 ? '매일' : task.repeatDays > 1 ? `${task.repeatDays}일마다` : '';

  // 밀린 일을 빨갛게 칠하지 않는다. 지났으면 며칠 지났다고만 적는다.
  const late = !task.done && task.date < today ? diffDays(task.date, today) : 0;

  /** 이름 배지를 누르면 그 방 사람들이 뜨고, 고르면 이름만 갈아 끼운다 */
  const pickDoneBy = async () => {
    const others = people.filter((m) => m.displayName !== task.doneBy);
    if (others.length === 0) return;
    // 둘뿐이면 물을 것도 없이 상대에게 넘긴다 — 대개 그 경우다
    if (others.length === 1) {
      const yes = await ask({
        title: `${others[0].displayName}가 했나요?`,
        loses: `지금은 ${task.doneBy}가 한 걸로 돼 있어요.`,
        keeps: '이름만 바뀌고 완료한 시각은 그대로예요.',
        go: '바꾸기',
      });
      if (yes) setDoneBy(task.id, others[0].displayName);
      return;
    }
    openSheet({ kind: 'doneBy', id: task.id });
  };

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
        className={`mt-px grid h-[25px] w-[25px] flex-none place-items-center rounded-full border-[1.8px] text-[12px] font-bold active:scale-90 ${
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
          className={`block break-words text-[15px] font-medium leading-[1.45] ${
            task.done ? 'text-done line-through decoration-1' : ''
          }`}
        >
          {task.title}
          {task.priority === 3 && <span className="ml-1.5 text-[13px] text-star">★</span>}
        </span>

        {task.memo && (
          <span
            className={`mt-2 block whitespace-pre-wrap break-words rounded-xl text-[12.5px] leading-[1.55] ${
              task.done ? 'bg-transparent px-0 pb-0 pt-0.5 text-done' : 'bg-memo px-3 py-2.5 text-ink2'
            }`}
          >
            {task.memo}
          </span>
        )}

        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink3">
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
          {/*
            `누가 할까`와 `누가 했나`가 한 자리를 나눠 쓴다.
            끝나는 순간 `남편 차례`가 `나`로 바뀐다.
            차례 칩은 옅게, 이름 배지는 진하게 — 앞엣것은 아직 안 일어난 일이고
            뒤엣것은 일어난 일이다.
          */}
          {!task.done && turn && (
            <span className="rounded-full bg-accent-tint px-[9px] py-0.5 text-[10.5px] font-medium text-accent">
              {turn}
            </span>
          )}
        </span>
      </button>

      {/*
        누가 했는지는 고칠 수 있어야 한다.
        남편이 해놓고 안 눌러서 내가 대신 누르는 일이 실제로 잦다 — 그러면 내가 한 걸로 남는다.
        지우고 다시 체크하면 완료한 시각이 바뀌고 반복이면 회차가 하나 더 생긴다.
        **이름만 갈아 끼우는 게 맞다.**
      */}
      {task.done && task.doneBy && people.length > 0 && (
        <button
          type="button"
          aria-label={`${task.doneBy}가 했어요 — 바꾸기`}
          onClick={pickDoneBy}
          className="mt-0.5 flex-none rounded-full bg-accent-soft px-[9px] py-0.5 text-[10.5px] font-medium text-accent active:opacity-70"
        >
          {task.doneBy}
        </button>
      )}

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
          className="grid h-7 w-7 place-items-center rounded-[10px] text-[16px] text-faint active:bg-sunk active:text-high"
        >
          ×
        </button>
      </span>
    </li>
  );
}
