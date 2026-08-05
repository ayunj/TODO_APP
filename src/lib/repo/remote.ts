import { supabase } from '../supabase';
import type { Snapshot } from '../repository';
import type { Category, Memo, Preset, Priority, ShopItem, Task } from '../types';

/**
 * 서버 쪽 한 겹.
 * 로컬은 카멜케이스, Postgres는 스네이크케이스라 여기서만 이름을 바꿔 끼운다.
 *
 * 지우기는 진짜로 지우지 않고 deleted_at을 단다.
 * 진짜로 지워버리면 상대 기기에는 그 줄이 남아 있다가 다음에 되살아난다.
 */

type Row = Record<string, unknown>;

const asPriority = (n: unknown): Priority => {
  const v = Number(n);
  return v === 1 || v === 3 ? v : 2;
};

export const TABLES = {
  categories: 'categories',
  tasks: 'tasks',
  presets: 'presets',
  shopping: 'shop_items',
  memos: 'memos',
} as const;

export type Kind = keyof typeof TABLES;

/* ───────── 로컬 → 서버 ───────── */

const out = {
  categories: (c: Category, owner: string): Row => ({
    id: c.id,
    owner_id: owner,
    name: c.name,
    color: c.color,
    sort_order: c.order,
    updated_at: c.updatedAt,
    deleted_at: null,
  }),
  tasks: (t: Task, owner: string): Row => ({
    id: t.id,
    owner_id: owner,
    title: t.title,
    memo: t.memo,
    category_id: t.categoryId,
    priority: t.priority,
    date: t.date,
    repeat_days: t.repeatDays,
    repeat_until: t.repeatUntil,
    cycle_since: t.cycleSince,
    parent_id: t.parentId,
    done: t.done,
    done_on: t.doneOn,
    done_by: t.doneBy,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    deleted_at: null,
  }),
  presets: (p: Preset, owner: string): Row => ({
    id: p.id,
    owner_id: owner,
    title: p.title,
    memo: p.memo,
    category_id: p.categoryId,
    priority: p.priority,
    repeat_days: p.repeatDays,
    repeat_until: p.repeatUntil,
    updated_at: p.updatedAt,
    deleted_at: null,
  }),
  shopping: (i: ShopItem, owner: string): Row => ({
    id: i.id,
    owner_id: owner,
    title: i.title,
    note: i.note,
    place: i.place,
    done: i.done,
    bought_on: i.boughtOn,
    done_by: i.doneBy,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
    deleted_at: null,
  }),
  memos: (m: Memo, owner: string): Row => ({
    id: m.id,
    owner_id: owner,
    text: m.text,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    deleted_at: null,
  }),
};

/* ───────── 서버 → 로컬 ───────── */

const back = {
  categories: (r: Row, i: number): Category => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    color: String(r.color ?? '#8EC9B5'),
    order: Number(r.sort_order ?? i),
    updatedAt: String(r.updated_at ?? ''),
  }),
  tasks: (r: Row): Task => ({
    id: String(r.id),
    roomId: (r.room_id as string) ?? null,
    title: String(r.title ?? ''),
    memo: String(r.memo ?? ''),
    categoryId: String(r.category_id ?? ''),
    priority: asPriority(r.priority),
    date: String(r.date ?? ''),
    repeatDays: Number(r.repeat_days ?? 0),
    repeatUntil: (r.repeat_until as string) ?? null,
    cycleSince: (r.cycle_since as string) ?? null,
    parentId: (r.parent_id as string) ?? null,
    done: Boolean(r.done),
    doneOn: (r.done_on as string) ?? null,
    doneBy: (r.done_by as string) ?? null,
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  }),
  presets: (r: Row): Preset => ({
    id: String(r.id),
    roomId: (r.room_id as string) ?? null,
    title: String(r.title ?? ''),
    memo: String(r.memo ?? ''),
    categoryId: String(r.category_id ?? ''),
    priority: asPriority(r.priority),
    repeatDays: Number(r.repeat_days ?? 0),
    repeatUntil: (r.repeat_until as string) ?? null,
    updatedAt: String(r.updated_at ?? ''),
  }),
  shopping: (r: Row): ShopItem => ({
    id: String(r.id),
    roomId: (r.room_id as string) ?? null,
    title: String(r.title ?? ''),
    note: String(r.note ?? ''),
    place: String(r.place ?? ''),
    done: Boolean(r.done),
    boughtOn: (r.bought_on as string) ?? null,
    doneBy: (r.done_by as string) ?? null,
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  }),
  memos: (r: Row): Memo => ({
    id: String(r.id),
    roomId: (r.room_id as string) ?? null,
    text: String(r.text ?? ''),
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  }),
};

/* ───────── 주고받기 ───────── */

export async function pull(owner: string): Promise<Snapshot> {
  const client = await supabase();

  const read = async (kind: Kind) => {
    const { data, error } = await client
      .from(TABLES[kind])
      .select('*')
      .eq('owner_id', owner)
      .is('deleted_at', null);
    if (error) throw error;
    return (data ?? []) as Row[];
  };

  const [categories, tasks, presets, shopping, memos] = await Promise.all([
    read('categories'),
    read('tasks'),
    read('presets'),
    read('shopping'),
    read('memos'),
  ]);

  return {
    categories: categories.map(back.categories).sort((a, b) => a.order - b.order),
    tasks: tasks.map(back.tasks),
    presets: presets.map(back.presets),
    shopping: shopping.map(back.shopping).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    memos: memos.map(back.memos),
  };
}

/** 한 종류를 통째로 올린다. 같은 id가 있으면 덮어쓴다. */
export async function push(kind: Kind, rows: unknown[], owner: string): Promise<void> {
  if (rows.length === 0) return;
  const client = await supabase();
  const shape = out[kind] as (row: unknown, owner: string) => Row;
  const { error } = await client
    .from(TABLES[kind])
    .upsert(rows.map((r) => shape(r, owner)), { onConflict: 'id' });
  if (error) throw error;
}

/** 지우기 = deleted_at 달기 */
export async function drop(kind: Kind, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const client = await supabase();
  const { error } = await client
    .from(TABLES[kind])
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
}
