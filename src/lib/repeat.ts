import { addDays, diffDays } from './date';
import { stamp, uid } from './id';
import type { DateStr, Task } from './types';

/**
 * 이 앱에서 제일 중요한 규칙.
 * 미래 회차를 미리 여러 개 만들지 않는다. 완료할 때 다음 1건만 만든다.
 */

/** 다음 회차의 기준일 = 실제로 체크한 날과 그 할 일의 날짜 중 늦은 쪽 */
export function baseOf(task: Task, todayStr: DateStr): DateStr {
  const done = task.doneOn ?? todayStr;
  return done > task.date ? done : task.date;
}

/**
 * 다음 회차 1건. 반복이 없거나 종료일을 넘기면 null.
 * null을 받았는데 task.repeatDays > 0 이면 "반복이 끝났습니다"인 경우다.
 */
export function spawnNext(task: Task, todayStr: DateStr): Task | null {
  if (task.repeatDays <= 0) return null;
  const since = baseOf(task, todayStr);
  const next = addDays(since, task.repeatDays);
  if (task.repeatUntil && next > task.repeatUntil) return null; // 반복 종료
  const now = stamp();
  return {
    id: uid(),
    roomId: task.roomId,
    title: task.title,
    memo: task.memo,
    categoryId: task.categoryId,
    priority: task.priority,
    date: next,
    repeatDays: task.repeatDays,
    repeatUntil: task.repeatUntil,
    cycleSince: since,
    parentId: task.id,
    done: false,
    doneOn: null,
    doneBy: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** 종료일이 지나서 더는 안 만드는 경우인지 */
export function isRepeatFinished(task: Task, todayStr: DateStr): boolean {
  return task.repeatDays > 0 && spawnNext(task, todayStr) === null;
}

/** 주기 진행률 = (오늘 − cycleSince) / (date − cycleSince), 0~1로 자른다 */
export function cycleProgress(
  task: Task,
  todayStr: DateStr,
): { total: number; gone: number; pct: number } | null {
  if (task.repeatDays <= 0) return null;
  const start = task.cycleSince ?? addDays(task.date, -task.repeatDays);
  const total = Math.max(1, diffDays(start, task.date));
  const gone = Math.max(0, diffDays(start, todayStr));
  return { total, gone, pct: Math.min(1, gone / total) };
}
