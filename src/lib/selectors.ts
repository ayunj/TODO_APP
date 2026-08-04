import { monthKey } from './date';
import type { DateStr, Preset, ShopItem, Task } from './types';

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

/** 오늘 화면 맨 아래 접어두는 지난 미완료 */
export const staleTasks = (tasks: Task[], today: DateStr, filter: Filter): Task[] =>
  sortTasks(tasks.filter((t) => !t.done && t.date < today && matches(t, filter)));

export const tasksInMonth = (tasks: Task[], cursor: DateStr, filter: Filter): Task[] => {
  const prefix = monthKey(cursor);
  return tasks.filter((t) => t.date.startsWith(prefix) && matches(t, filter));
};

export const presetsFor = (presets: Preset[], filter: Filter): Preset[] =>
  presets.filter((p) => matches(p, filter));

export interface HabitRow {
  title: string;
  color: string;
  /** 날짜(1~31) → 상태 */
  mark: Record<number, 'done' | 'todo'>;
  count: number;
  /** 제목을 눌렀을 때 열 항목 */
  sampleId: string;
}

/**
 * 기록 탭 격자.
 * "자주 하는 일" = 자주 쓰는 일에 있는 제목이거나, 주기가 설정된 항목의 제목.
 * 제목이 같으면 한 행으로 묶는다.
 */
export function habitRows(
  monthTasks: Task[],
  presets: Preset[],
  colorOf: (categoryId: string) => string,
): HabitRow[] {
  const isFrequent = (title: string) =>
    presets.some((p) => p.title === title) ||
    monthTasks.some((t) => t.title === title && t.repeatDays > 0);

  const titles = [...new Set(monthTasks.map((t) => t.title))].filter(isFrequent);

  return titles
    .map((title) => {
      const items = monthTasks.filter((t) => t.title === title);
      const mark: Record<number, 'done' | 'todo'> = {};
      items.forEach((t) => {
        mark[Number(t.date.slice(8))] = t.done ? 'done' : 'todo';
      });
      return {
        title,
        color: colorOf(items[0].categoryId),
        mark,
        count: items.filter((t) => t.done).length,
        sampleId: items[0].id,
      };
    })
    .sort((a, b) => b.count - a.count);
}
