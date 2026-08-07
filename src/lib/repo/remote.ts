import { supabase } from '../supabase';
import type { Snapshot } from '../repository';
import type { Category, Memo, Preset, Priority, Room, RoomMember, RoomPeek, ShopItem, Task } from '../types';

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
    room_id: c.roomId,
    owner_id: owner,
    name: c.name,
    color: c.color,
    sort_order: c.order,
    updated_at: c.updatedAt,
    deleted_at: null,
  }),
  tasks: (t: Task, owner: string): Row => ({
    id: t.id,
    room_id: t.roomId,
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
    room_id: p.roomId,
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
    room_id: i.roomId,
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
    room_id: m.roomId,
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
    roomId: (r.room_id as string) ?? null,
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

  // 내 개인 것(owner_id = 나)과 방 것(room_id 있음)을 함께 받는다.
  // 방 것은 RLS가 '내가 든 방'으로만 걸러주므로, 여기서 방 id를 일일이 대지 않아도 된다.
  const read = async (kind: Kind) => {
    const { data, error } = await client
      .from(TABLES[kind])
      .select('*')
      .or(`owner_id.eq.${owner},room_id.not.is.null`)
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

/* ═════════════════════════ 방 ═════════════════════════ */
/**
 * 방은 이 기기에 담지 않는다 — 서버에만 있고, 화면이 필요할 때 여기서 곧장 받아온다.
 * 할 일·장보기와 달리 오프라인으로 만들 수 없는 것이라 (남과 나누는 것이므로)
 * Repository(로컬+동기화) 겹을 지나지 않고 Supabase를 바로 부른다.
 */

const roomBack = (r: Row, me: string): Room => ({
  id: String(r.id),
  name: String(r.name ?? ''),
  color: String(r.color ?? '#A9B8F4'),
  code: String(r.join_code ?? ''),
  createdBy: String(r.created_by ?? ''),
  mine: String(r.created_by ?? '') === me,
});

const memberBack = (r: Row): RoomMember => ({
  roomId: String(r.room_id),
  userId: String(r.user_id),
  displayName: String(r.display_name ?? ''),
  role: String(r.role ?? 'member'),
  joinedAt: String(r.joined_at ?? ''),
});

/** 내가 든 방과 그 방들의 사람 목록을 함께 받는다. RLS가 '내 방'으로만 걸러준다. */
export async function pullRooms(
  me: string,
): Promise<{ rooms: Room[]; members: RoomMember[] }> {
  const client = await supabase();
  const [roomsRes, membersRes] = await Promise.all([
    client.from('rooms').select('*'),
    client.from('room_members').select('*'),
  ]);
  if (roomsRes.error) throw roomsRes.error;
  if (membersRes.error) throw membersRes.error;

  return {
    rooms: (roomsRes.data ?? []).map((r) => roomBack(r as Row, me)),
    members: (membersRes.data ?? []).map((r) => memberBack(r as Row)),
  };
}

/** 방을 새로 연다. 만든 사람은 그대로 그 방의 주인이 된다. */
export async function createRoom(
  name: string,
  displayName: string,
  color: string,
  myId: string,
): Promise<Room> {
  const client = await supabase();
  const { data, error } = await client.rpc('create_room', {
    room_name: name,
    me: displayName,
    room_color: color,
  });
  if (error) throw error;
  return roomBack(data as Row, myId);
}

/** 코드로 방에 들어간다. 이미 든 방이면 이름만 새로 적는다. */
export async function joinRoom(code: string, displayName: string, myId: string): Promise<Room> {
  const client = await supabase();
  const { data, error } = await client.rpc('join_room', { code, me: displayName });
  if (error) throw error;
  return roomBack(data as Row, myId);
}

/** 들어가기 전에 어떤 방인지 먼저 본다. 없는 코드면 null. */
export async function peekRoom(code: string): Promise<RoomPeek | null> {
  const client = await supabase();
  const { data, error } = await client.rpc('peek_room', { code });
  if (error) throw error;
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    id: String(d.id),
    name: String(d.name ?? ''),
    color: String(d.color ?? '#A9B8F4'),
    owner: (d.owner as string) ?? null,
    members: Array.isArray(d.members) ? (d.members as string[]) : [],
    count: Number(d.count ?? 0),
  };
}

/** 방에서 내 자리만 뺀다. 방과 그 안의 것은 남는다 (남이 연 방일 때). */
export async function leaveRoom(roomId: string, me: string): Promise<void> {
  const client = await supabase();
  const { error } = await client
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', me);
  if (error) throw error;
}

/** 방 이름·색·코드를 고친다. 방 사람이면 누구나 되지만 화면에서는 주인에게만 연다. */
export async function updateRoom(
  roomId: string,
  patch: { name?: string; color?: string; join_code?: string },
): Promise<void> {
  const client = await supabase();
  const { error } = await client.from('rooms').update(patch).eq('id', roomId);
  if (error) throw error;
}
