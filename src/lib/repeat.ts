import { addDays, diffDays } from './date';
import { stamp, uid } from './id';
import type { DateStr, Task } from './types';

/**
 * 이 앱에서 제일 중요한 규칙.
 * 미래 회차를 미리 여러 개 만들지 않는다. 완료할 때 다음 1건만 만든다.
 */

/**
 * 다음 회차의 기준일 = **그 할 일의 날짜**. 체크한 시각은 안 본다.
 *
 * `date`가 곧 '한 날'이다. 지난 날짜를 체크하면 그 날 한 걸로 적는다 —
 * 어제 한 걸 오늘 적어도 어제 한 것이다.
 * 밀린 걸 지금 했다면 날짜를 오늘로 옮기고 체크한다. 그러면 오늘 기준으로 다음이 잡힌다.
 *
 * 예전에는 `max(체크한 날, date)`였다. 그러면 어제짜 매일 항목을 오늘 체크했을 때
 * 다음이 모레가 되고 오늘 칸이 비었다. 한 공식으로 두 뜻을 다 담으려다 생긴 일이라,
 * '언제 했는지'를 `date` 하나에 맡기는 쪽으로 정리했다.
 */
export function baseOf(task: Task): DateStr {
  return task.date;
}

/**
 * 다음 회차 1건. 반복이 없거나 종료일을 넘기면 null.
 * null을 받았는데 task.repeatDays > 0 이면 "반복이 끝났습니다"인 경우다.
 */
/**
 * 다음 회차의 차례는 누구인가.
 *
 * **반복에 배정을 붙이면 교대가 된다** — 설거지 하루씩, 분리수거 한 주씩.
 * 집안일 앱에서 사람들이 실제로 싸우는 지점이 정확히 여기다.
 *
 * `heirs`는 방에 들어온 순서대로의 사람들이다. 뽑기는 안 만든다 —
 * 운이 나쁘면 한 사람이 세 번 연속 걸리고, 그때 "왜 또 나야"가 생긴다.
 */
export function nextAssignee(task: Task, heirs: string[] = []): string | null {
  if (!task.assigneeId) return null; // 안 정함은 계속 안 정함이다
  if (task.rotate === 'same') return task.assigneeId;
  if (task.rotate !== 'rotate') return null; // once — 이번만
  const i = heirs.indexOf(task.assigneeId);
  if (i < 0 || heirs.length === 0) return task.assigneeId; // 그 사람이 방에서 빠졌으면 그대로 둔다
  return heirs[(i + 1) % heirs.length];
}

export function spawnNext(task: Task, heirs: string[] = []): Task | null {
  if (task.repeatDays <= 0) return null;
  const since = baseOf(task);
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
    assigneeId: nextAssignee(task, heirs),
    rotate: task.rotate,
    done: false,
    doneOn: null,
    doneBy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedBy: null,
  };
}

/** 종료일이 지나서 더는 안 만드는 경우인지 */
export function isRepeatFinished(task: Task): boolean {
  return task.repeatDays > 0 && spawnNext(task) === null;
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
