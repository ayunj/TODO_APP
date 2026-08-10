import { addDays, monthKey } from './date';
import type { DateStr, Memo, Preset, ShopItem, Task, Trashed } from './types';

/** 살아 있는 것 — 지운 것은 화면 어디에도 안 나온다 */
export const alive = <T extends { deletedAt: string | null }>(rows: T[]): T[] =>
  rows.filter((r) => !r.deletedAt);

/** 메모는 제목 칸이 없다 — 첫 줄이 제목 노릇을 한다 */
const memoTitle = (text: string) => text.split('\n').find((l) => l.trim())?.trim() ?? '빈 메모';

/**
 * 지운 것 — 할 일·장보기·메모를 한 줄 모양으로 모아 늦게 지운 것부터.
 * 30일이 지난 것은 여기서 빠진다. 진짜로 치우는 일은 앱을 열 때 따로 한다.
 */
export function trashOf(
  tasks: Task[],
  shopping: ShopItem[],
  memos: Memo[],
  since: string,
): Trashed[] {
  const rows: Trashed[] = [];
  const fresh = (at: string | null): at is string => Boolean(at) && at! >= since;

  for (const t of tasks)
    if (fresh(t.deletedAt))
      rows.push({
        kind: 'task',
        id: t.id,
        title: t.title,
        categoryId: t.categoryId,
        roomId: t.roomId,
        at: t.deletedAt,
        by: t.deletedBy,
      });
  for (const i of shopping)
    if (fresh(i.deletedAt))
      rows.push({
        kind: 'shop',
        id: i.id,
        title: i.title,
        categoryId: null,
        roomId: i.roomId,
        at: i.deletedAt,
        by: i.deletedBy,
      });
  for (const m of memos)
    if (fresh(m.deletedAt))
      rows.push({
        kind: 'memo',
        id: m.id,
        title: memoTitle(m.text),
        categoryId: null,
        roomId: m.roomId,
        at: m.deletedAt,
        by: m.deletedBy,
      });

  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * 장보기에서 목록과 기록을 가르는 단 하나의 규칙.
 * 오늘 담은 것까지는 목록에 남는다 — 마트에서 "이거 담았나" 확인이 돼야 하니까.
 * 그 전에 담은 것은 다음 날 저절로 기록으로 내려간다. 치우는 버튼이 없는 이유다.
 */
export const onShopList = (item: ShopItem, today: DateStr): boolean =>
  !item.done || item.boughtOn === today;

/** 필터가 null이면 전체 */
export type Filter = string | null;

export const matches = (task: { categoryId: string }, filter: Filter): boolean =>
  !filter || task.categoryId === filter;

/** 우선순위 높은 순, 같으면 만든 순 */
export const sortTasks = (list: Task[]): Task[] =>
  [...list].sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

export const tasksOn = (tasks: Task[], date: DateStr, filter: Filter): Task[] =>
  tasks.filter((t) => t.date === date && matches(t, filter));

/**
 * 미루기가 보이는 날 — 오늘과 어제뿐.
 *
 * 앞날짜 것은 아직 밀린 게 아니라 미룰 것도 없고,
 * 그저께보다 오래된 것은 이미 안 하기로 한 일에 가깝다.
 * 미루기는 "오늘 여기까지"를 접는 동작이라 그 언저리에서만 뜻이 있다.
 */
export const canPostpone = (date: DateStr, today: DateStr): boolean =>
  date === today || date === addDays(today, -1);

/** 오늘 화면 맨 아래 접어두는 지난 미완료 */
export const staleTasks = (tasks: Task[], today: DateStr, filter: Filter): Task[] =>
  sortTasks(tasks.filter((t) => !t.done && t.date < today && matches(t, filter)));

export const tasksInMonth = (tasks: Task[], cursor: DateStr, filter: Filter): Task[] => {
  const prefix = monthKey(cursor);
  return tasks.filter((t) => t.date.startsWith(prefix) && matches(t, filter));
};

/** from부터 to까지 (양끝 포함) — 기록 탭 주간이 쓴다 */
export const tasksInRange = (
  tasks: Task[],
  from: DateStr,
  to: DateStr,
  filter: Filter,
): Task[] => tasks.filter((t) => t.date >= from && t.date <= to && matches(t, filter));

export const presetsFor = (presets: Preset[], filter: Filter): Preset[] =>
  presets.filter((p) => matches(p, filter));

export interface HabitRow {
  title: string;
  color: string;
  /** 날짜('YYYY-MM-DD') → 상태. 주간과 월간이 같은 표를 쓴다. */
  mark: Record<DateStr, 'done' | 'todo'>;
  count: number;
}

/**
 * 기록 탭 격자(`반복 기록`).
 * 행이 되는 조건 = 즐겨찾기에 있는 제목이거나, 그 달에 주기가 설정된 항목의 제목.
 * 제목이 같으면 한 행으로 묶는다 — 그래서 제목을 고치면 그 달 격자가 두 행으로 갈라진다.
 */
export function habitRows(
  spanTasks: Task[],
  presets: Preset[],
  colorOf: (categoryId: string) => string,
): HabitRow[] {
  const isFrequent = (title: string) =>
    presets.some((p) => p.title === title) ||
    spanTasks.some((t) => t.title === title && t.repeatDays > 0);

  const titles = [...new Set(spanTasks.map((t) => t.title))].filter(isFrequent);

  return titles
    .map((title) => {
      const items = spanTasks.filter((t) => t.title === title);
      const mark: Record<DateStr, 'done' | 'todo'> = {};
      items.forEach((t) => {
        mark[t.date] = t.done ? 'done' : 'todo';
      });
      return {
        title,
        color: colorOf(items[0].categoryId),
        mark,
        count: items.filter((t) => t.done).length,
      };
    })
    .sort((a, b) => b.count - a.count);
}
