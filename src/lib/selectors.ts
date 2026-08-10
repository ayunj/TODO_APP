import { addDays, monthKey } from './date';
import type { DateStr, Memo, Preset, ShopItem, Task, Trashed } from './types';

/**
 * 내가 손볼 수 있는 카테고리 — 개인 것과 **내가 연 방**에 내가 나눈 것.
 *
 * 남이 연 방에서 나눠준 것은 그 방을 연 사람 것이다. 이름이나 색을 손대면
 * 방 사람들 화면이 다 같이 바뀐다. 쓰는 데는 그대로고(필터에도 뜨고 할 일도 담긴다)
 * **고치는 자리에만** 없다.
 *
 * 어느 방인지 모르겠으면 뺀다 — 못 받아온 방일 수도 나간 방일 수도 있는데
 * 둘 다 내가 고칠 것은 아니다.
 *
 * 설정 첫 화면의 개수와 목록이 같은 것을 세야 해서 여기 한 벌만 둔다.
 */
export const myCategories = <C extends { roomId: string | null }>(
  categories: C[],
  rooms: { id: string; mine: boolean }[],
): C[] => categories.filter((c) => !c.roomId || rooms.some((r) => r.id === c.roomId && r.mine));

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
        rooms: t.roomId ? [t.roomId] : [],
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
        rooms: i.roomId ? [i.roomId] : [],
        at: i.deletedAt,
        by: i.deletedBy,
      });
  // 여러 방에 걸린 메모는 그 방들 지운 것에 다 뜬다 — 어디서 찾아도 되돌릴 수 있게
  for (const m of memos)
    if (fresh(m.deletedAt))
      rows.push({
        kind: 'memo',
        id: m.id,
        title: memoTitle(m.text),
        categoryId: null,
        rooms: m.roomIds,
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

/**
 * 걸린 카테고리들. `null`이면 안 가린다.
 *
 * 하나가 아니라 여럿인 까닭은 **묶음으로도 거르기 때문**이다 —
 * `우리집`을 고르면 그 방 카테고리가 다 걸리고, 그 안에서 하나를 더 고르면 그것만 걸린다.
 * 무엇이 담기는지는 `useTaskFilter()`가 정한다.
 */
export type Filter = string[] | null;

/**
 * 거르는 자는 카테고리 하나뿐이다.
 * 차례로 거르는 자를 한때 뒀다가 걷어냈다 — 누가 할 일인지는 할 일 줄이 이미 말한다.
 */
export const matches = (task: { categoryId: string }, filter: Filter): boolean =>
  !filter || filter.includes(task.categoryId);

/** 우선순위 높은 순, 같으면 만든 순 */
export const sortTasks = (list: Task[]): Task[] =>
  [...list].sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt));

/**
 * 월별 달력 칸에 쓰는 순서 — **안 한 것이 먼저**다.
 *
 * 칸 하나에 세 줄까지만 보이는데, 완료한 것이 그 자리를 먼저 먹으면
 * 정작 남은 일이 `+2` 뒤로 숨는다. 일별 화면과 같은 규칙이다 —
 * 숨기지 않고 아래로 내린다.
 */
export const sortForCell = (list: Task[]): Task[] =>
  [...list].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      b.priority - a.priority ||
      a.createdAt.localeCompare(b.createdAt),
  );

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
 * 기록 탭 격자.
 * 행이 되는 조건 = 즐겨찾기에 있는 제목이거나, 그 폭에 주기가 설정된 항목의 제목.
 * 제목이 같으면 한 행으로 묶는다 — 그래서 제목을 고치면 그 달 격자가 두 행으로 갈라진다.
 *
 * **주간만 이 조건을 안 건다**(`everyTitle`). 열이 일곱뿐이라 자리가 넉넉하고,
 * 한 주에 한 번짜리 할 일 하나를 끝냈는데 화면이 비어 있으면
 * 아무것도 안 한 것처럼 읽힌다 — 한 달치는 그러기엔 행이 너무 불어난다.
 */
export function habitRows(
  spanTasks: Task[],
  presets: Preset[],
  colorOf: (categoryId: string) => string,
  everyTitle = false,
): HabitRow[] {
  const isFrequent = (title: string) =>
    presets.some((p) => p.title === title) ||
    spanTasks.some((t) => t.title === title && t.repeatDays > 0);

  const titles = [...new Set(spanTasks.map((t) => t.title))].filter(
    (title) => everyTitle || isFrequent(title),
  );

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
