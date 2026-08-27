import { DEFAULT_BEAR, DEFAULT_ROOM, builtinImg, shopPath, withBundled } from '../costumes';
import { noticeImageUrl, shopImageUrl, supabase } from '../supabase';
import type { Snapshot } from '../repository';
import type {
  Category,
  Costume,
  CostumeSet,
  Gomdori,
  Memo,
  Notice,
  Nudge,
  Preset,
  Priority,
  Room,
  RoomMember,
  RoomPeek,
  Rotate,
  Shop,
  ShopFamily,
  ShopItem,
  Task,
} from '../types';

/**
 * 서버 쪽 한 겹.
 * 로컬은 카멜케이스, Postgres는 스네이크케이스라 여기서만 이름을 바꿔 끼운다.
 *
 * 지우기는 진짜로 지우지 않고 deleted_at을 단다.
 * 진짜로 지워버리면 상대 기기에는 그 줄이 남아 있다가 다음에 되살아난다.
 *
 * 그런데 지운 것에는 두 가지가 있다 — **deleted_by가 가른다.**
 *   - 있음: 사람이 지운 것. 30일 동안 `지운 것`에 남고 되돌릴 수 있다
 *   - 없음: 그냥 없앤 것 (다음 회차 정리·전체 초기화 같은 뒷정리).
 *     이건 받아오지도 않는다 — 되돌릴 것이 아니라 치운 것이다
 */

type Row = Record<string, unknown>;

const asPriority = (n: unknown): Priority => {
  const v = Number(n);
  return v === 1 || v === 3 ? v : 2;
};

/** 칸이 없던 시절 줄은 `이번만`으로 읽는다 — 기본이 그쪽이다 */
const asRotate = (v: unknown): Rotate => (v === 'same' || v === 'rotate' ? v : 'once');

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
    assignee_id: t.assigneeId,
    assigned_at: t.assignedAt,
    assigned_by: t.assignedBy,
    rotate: t.rotate,
    done: t.done,
    done_on: t.doneOn,
    done_by: t.doneBy,
    done_by_id: t.doneById,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    deleted_at: t.deletedAt,
    deleted_by: t.deletedBy,
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
    assignee_id: p.assigneeId,
    rotate: p.rotate,
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
    deleted_at: i.deletedAt,
    deleted_by: i.deletedBy,
  }),
  memos: (m: Memo, owner: string): Row => ({
    id: m.id,
    // 메모만 여러 방에 동시에 걸린다. room_id는 방 하나만 걸리던 시절 칸이라 비워둔다.
    room_id: null,
    room_ids: m.roomIds,
    owner_id: owner,
    text: m.text,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    updated_by: m.updatedBy,
    deleted_at: m.deletedAt,
    deleted_by: m.deletedBy,
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
    assigneeId: (r.assignee_id as string) ?? null,
    assignedAt: (r.assigned_at as string) ?? null,
    assignedBy: (r.assigned_by as string) ?? null,
    rotate: asRotate(r.rotate),
    done: Boolean(r.done),
    doneOn: (r.done_on as string) ?? null,
    doneBy: (r.done_by as string) ?? null,
    doneById: (r.done_by_id as string) ?? null,
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
    deletedAt: (r.deleted_at as string) ?? null,
    deletedBy: (r.deleted_by as string) ?? null,
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
    assigneeId: (r.assignee_id as string) ?? null,
    rotate: asRotate(r.rotate),
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
    deletedAt: (r.deleted_at as string) ?? null,
    deletedBy: (r.deleted_by as string) ?? null,
  }),
  memos: (r: Row): Memo => ({
    id: String(r.id),
    // 옛 줄은 room_id 하나만 들고 있다 — 그 방 하나가 든 목록으로 읽는다
    roomIds: Array.isArray(r.room_ids)
      ? (r.room_ids as string[])
      : r.room_id
        ? [String(r.room_id)]
        : [],
    text: String(r.text ?? ''),
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
    updatedBy: (r.updated_by as string) ?? null,
    deletedAt: (r.deleted_at as string) ?? null,
    deletedBy: (r.deleted_by as string) ?? null,
  }),
};

/* ───────── 주고받기 ───────── */

/** 지운 것이 남아 있는 날수. 이보다 오래된 것은 받아오지도 않는다. */
export const TRASH_DAYS = 30;

export async function pull(owner: string): Promise<Snapshot> {
  const client = await supabase();
  const since = new Date(Date.now() - TRASH_DAYS * 86400_000).toISOString();

  // 내 개인 것(owner_id = 나)과 방 것(room_id 있음)을 함께 받는다.
  // 방 것은 RLS가 '내가 든 방'으로만 걸러주므로, 여기서 방 id를 일일이 대지 않아도 된다.
  //
  // 살아 있는 것에 더해 **사람이 지운 것 30일치**를 같이 받는다 —
  // 그래야 남편이 지운 것이 내 `지운 것`에도 뜬다. 두 or는 서로 and로 걸린다.
  const read = async (kind: Kind, trashed = false) => {
    let q = client.from(TABLES[kind]).select('*');
    // 메모는 방을 여럿 걸 수 있어 room_id로 가릴 수가 없다.
    // 어차피 RLS가 `내 것이거나 내가 든 방 것`으로만 주므로 여기서 더 조일 게 없다.
    if (kind !== 'memos') q = q.or(`owner_id.eq.${owner},room_id.not.is.null`);
    q = trashed
      ? q.or(`deleted_at.is.null,and(deleted_at.gte.${since},deleted_by.not.is.null)`)
      : q.is('deleted_at', null);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Row[];
  };

  // 되돌릴 수 있는 것은 셋뿐이다. 카테고리·즐겨찾기는 지우면 그걸로 끝이라 안 받아온다.
  const [categories, tasks, presets, shopping, memos] = await Promise.all([
    read('categories'),
    read('tasks', true),
    read('presets'),
    read('shopping', true),
    read('memos', true),
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

/**
 * 그냥 없애기 = deleted_at을 달고 **deleted_by를 비운다.**
 *
 * 뒷정리하는 쪽이다 — 다음 회차 정리·전체 초기화·30일 지난 것.
 * deleted_by를 비워야 `지운 것`에 안 뜬다. 되돌릴 것이 아니라 치운 것이다.
 * 사람이 지운 것은 이 길로 오지 않는다. 그건 deleted_at을 단 채로 저장(push)한다.
 */
export async function drop(kind: Kind, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const client = await supabase();
  const { error } = await client
    .from(TABLES[kind])
    .update({ deleted_at: new Date().toISOString(), deleted_by: null })
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
  // 칸이 없던 시절 방은 할 일만 켜둔 것으로 읽는다 — 기본이 그쪽이다
  shareTasks: r.share_tasks !== false,
  shareShop: r.share_shop === true,
  shareMemo: r.share_memo === true,
  // 칸이 없던 시절 방은 켜져 있던 것으로 읽는다 — 기본이 켜짐이다
  shareNudge: r.share_nudge !== false,
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
    members: Array.isArray(d.members)
      ? (d.members as Record<string, unknown>[]).map((m) => ({
          name: String(m.name ?? ''),
          owner: m.owner === true,
        }))
      : [],
    count: Number(d.count ?? 0),
    shareTasks: d.shareTasks !== false,
    shareShop: d.shareShop === true,
    shareMemo: d.shareMemo === true,
    cats: Array.isArray(d.cats)
      ? (d.cats as Record<string, unknown>[]).map((c) => ({
          name: String(c.name ?? ''),
          color: String(c.color ?? '#A9B8F4'),
        }))
      : [],
  };
}

/**
 * 그만 나누기 — 내가 연 방을 닫는다.
 * 안에 있던 것은 도로 내 것이 된다 (서버가 room_id를 먼저 풀고 방을 지운다).
 */
export async function closeRoom(roomId: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.rpc('close_room', { room: roomId });
  if (error) throw error;
}

/** 맡기고 나가기 — 주인만 바뀌고 방은 그대로 산다 */
export async function handOverRoom(roomId: string, heir: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.rpc('hand_over_room', { room: roomId, heir });
  if (error) throw error;
}

/**
 * 내가 열어놓고 밖에 나와 있는 방을 거둬들인다.
 * 주인이 `나가기`를 누를 수 있던 때에 갇힌 것들을 주워온다. 거둔 방 수를 돌려준다.
 */
export async function reclaimMyRooms(): Promise<number> {
  const client = await supabase();
  const { data, error } = await client.rpc('reclaim_my_rooms');
  if (error) throw error;
  return Number(data ?? 0);
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

/** 방 이름·색·나누는 것을 고친다. 방 사람이면 누구나 되지만 화면에서는 주인에게만 연다. */
export async function updateRoom(
  roomId: string,
  patch: {
    name?: string;
    color?: string;
    share_tasks?: boolean;
    share_shop?: boolean;
    share_memo?: boolean;
    share_nudge?: boolean;
  },
): Promise<void> {
  const client = await supabase();
  const { error } = await client.from('rooms').update(patch).eq('id', roomId);
  if (error) throw error;
}

/** 코드를 새로 만든다. 겹치지 않게 고르는 일은 서버가 한다. */
export async function resetJoinCode(roomId: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.rpc('reset_join_code', { room: roomId });
  if (error) throw error;
}

/** 이 방에서 불릴 내 이름을 고친다. 방마다 따로 걸린다. */
export async function renameMe(roomId: string, me: string, myId: string): Promise<void> {
  const client = await supabase();
  const { error } = await client
    .from('room_members')
    .update({ display_name: me })
    .eq('room_id', roomId)
    .eq('user_id', myId);
  if (error) throw error;
}

/** 카테고리를 방에 연다 — 그 안의 할 일·즐겨찾기가 같이 간다 */
export async function shareCategory(categoryId: string, roomId: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.rpc('share_category', { target: categoryId, room: roomId });
  if (error) throw error;
}

/** 도로 개인 것으로 거둔다 */
export async function unshareCategory(categoryId: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.rpc('unshare_category', { target: categoryId });
  if (error) throw error;
}

/* ───────── 콕 찌르기 ───────── */

/**
 * 콕 한 번. 남은 횟수를 돌려준다.
 *
 * **세는 것도 넣는 것도 서버가 한다.** 폰에서 세면 앱을 지웠다 깔면 0이 되고,
 * 표에 바로 넣게 두면 한도가 뜻을 잃는다.
 *
 * `whom`이 없으면 방 전체에게 간다 — `안 정함`인 일을 찌르는 자리다.
 */
export async function sendNudge(
  roomId: string,
  taskId: string,
  whom: string | null,
): Promise<number> {
  const client = await supabase();
  const { data, error } = await client.rpc('send_nudge', {
    room: roomId,
    task: taskId,
    whom,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** 남은 횟수 — **누르기 전에** 보여준다. 읽기만 하고 채우지는 않는다. */
export async function nudgesLeft(roomId: string): Promise<number> {
  const client = await supabase();
  const { data, error } = await client.rpc('nudges_left', { room: roomId });
  if (error) throw error;
  return Number(data ?? 0);
}

/** 나에게 온 콕. 늦게 온 것이 앞에 온다. */
export async function pullNudges(): Promise<Nudge[]> {
  const client = await supabase();
  const { data, error } = await client
    .from('nudges')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => nudgeBack(r as Row));
}

/**
 * 본 것은 지운다. **기록으로 안 남긴다** —
 * 쌓아두면 증거가 되고, 증거가 되면 싸움이 된다.
 */
export async function clearNudges(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const client = await supabase();
  const { error } = await client.from('nudges').delete().in('id', ids);
  if (error) throw error;
}

const nudgeBack = (r: Row): Nudge => ({
  id: String(r.id),
  roomId: String(r.room_id),
  fromName: String(r.from_name ?? '누군가'),
  taskId: (r.task_id as string) ?? null,
  taskTitle: String(r.task_title ?? ''),
  categoryId: (r.category_id as string) ?? null,
  createdAt: String(r.created_at ?? ''),
});

/* ───────── 푸시 ───────── */

/**
 * 이 기기를 콕 받을 곳으로 적어둔다.
 * 열쇠가 토큰이라 같은 기기가 다시 불러도 줄이 안 늘어난다.
 */
export async function saveDeviceToken(token: string, me: string): Promise<void> {
  const client = await supabase();
  const { error } = await client
    .from('device_tokens')
    .upsert({ token, user_id: me, updated_at: new Date().toISOString() }, { onConflict: 'token' });
  if (error) throw error;
}

/**
 * 방금 보낸 콕을 상대 폰까지 밀어준다.
 *
 * **안 되면 그냥 넘어간다.** 콕은 이미 `nudges`에 들어가 있어서 상대가
 * 앱을 열면(또는 열려 있으면 실시간으로) 뜬다 — 푸시는 그걸 **빨리** 알리는 것뿐이다.
 * 파이어베이스가 안 붙어 있어도 여기서 앱이 멈추면 안 된다.
 */
export async function pushNudge(roomId: string, taskId: string): Promise<void> {
  const client = await supabase();
  await client.functions.invoke('push-nudge', { body: { room: roomId, task: taskId } });
}

/* ─────────────────────── 곰돌이와 코스튬 ─────────────────────── */

/**
 * 지금 얼마 있나 · 무엇을 가졌나 · 무엇을 입고 있나.
 *
 * **포인트는 서버가 센다.** 폰에 담아두면 개발자 도구로 고쳐지고,
 * 이 앱은 로그인 없이도 도는 게 원칙이라 **포인트는 로그인한 사람만** 갖는다.
 * 그래서 로컬 저장소(IndexedDB) 쪽에는 짝이 없다 — 여기 하나뿐이다.
 *
 * `my_points()`는 셈하기 전에 **안 준 것부터 채운다.** 앱이 `포인트 주세요`를
 * 따로 부를 자리가 없는 까닭이다.
 */
export async function pullGomdori(): Promise<Gomdori> {
  const client = await supabase();

  const [points, owned, worn] = await Promise.all([
    client.rpc('my_points'),
    client.from('costume_owned').select('item_key'),
    client.from('gomdori').select('worn_bear, worn_room').maybeSingle(),
  ]);
  if (points.error) throw points.error;
  if (owned.error) throw owned.error;
  if (worn.error) throw worn.error;

  const row = worn.data as { worn_bear?: string; worn_room?: string } | null;
  return {
    points: Number(points.data ?? 0),
    owned: ((owned.data ?? []) as Row[]).map((r) => String(r.item_key)),
    // 아직 한 번도 안 갈아입었으면 줄이 없다 — 그때는 기본 모습이다
    wornBear: row?.worn_bear ?? DEFAULT_BEAR,
    wornRoom: row?.worn_room ?? DEFAULT_ROOM,
  };
}

/**
 * 상점에 걸린 것 전부 — 대분류 · 중분류 · 세트 · 물건.
 *
 * **로그인 안 해도 읽힌다.** 값표는 누구나 보는 것이고(파는 중인 것만),
 * 여기서 막으면 로그인 전 상점이 통째로 빈다.
 *
 * 넷을 한꺼번에 부른다. 넷 다 작고 서로를 기다릴 까닭이 없다 —
 * 줄줄이 부르면 상점 열 때 왕복이 네 번 붙는다.
 */
export async function pullShop(): Promise<Shop> {
  const client = await supabase();

  const [g, f, s, c, k] = await Promise.all([
    client.from('shop_group').select('group_key, name').order('ord'),
    client.from('shop_family').select('family_key, group_key, name, active').order('ord'),
    client
      .from('costume_season')
      .select('season_key, name, note, family_key, banner_at')
      .order('ord'),
    client
      .from('costume_catalog')
      .select('item_key, kind, price, season, name, family_key, active, opened_at, updated_at')
      .order('created_at'),
    /*
      **랭킹은 못 받아와도 넘어간다.** 상점이 안 뜨는 것보다 줄 하나가 없는 편이
      낫고, 옛 DB에는 이 함수가 아직 없다 — 그때 여기서 던지면 상점이 통째로
      박혀둔 목록으로 물러선다.
    */
    client.rpc('shop_rank'),
  ]);
  for (const r of [g, f, s, c]) if (r.error) throw r.error;

  /*
    중분류를 물건보다 먼저 세운다 — **그림 자리를 짓는 데 쓴다**(아래 `shopPath`).
  */
  const families: ShopFamily[] = ((f.data ?? []) as Row[]).map((r) => ({
    key: String(r.family_key),
    group: String(r.group_key),
    name: String(r.name),
    active: Boolean(r.active),
  }));

  /*
    그림 자리는 **값표에 적혀 오지 않는다. 지어 쓴다** —
    `<대분류>/<중분류>/<종류>/<열쇠>.png`([costumes.ts](../costumes.ts)의 `shopPath`).

    **앱이 들고 나가는 것이 있으면 그게 먼저다.** 기본 곰돌이와 기본 룸 둘인데,
    그 둘은 통에 올릴 일이 없어서 자리를 지어 봐야 없는 것을 부르러 간다 —
    로그인 전에도 서버를 못 읽어도 서 있어야 하는 둘이라 헛걸음을 안 시킨다.
  */
  /*
    **주소 끝에 판을 붙인다** — `?v=<고친 때>`.

    자리는 분류와 열쇠로 짓는 것이라 **다시 올려도 주소가 같다.** 그러면 브라우저가
    물고 있던 옛 그림을 그대로 다시 쓴다 — 채우는 사람이 크기를 고쳐 올렸는데
    화면이 안 바뀌어서 `저장이 안 됐나` 하게 된다.

    판은 `updated_at`에서 낸다. **담아두는 칸을 새로 만들지 않는다** —
    값표를 고칠 때마다 트리거가 이미 갱신하고 있고, 그림을 올리는 길은
    [상점 채우기](../../screens/admin/AdminForm.tsx)뿐인데 거기서는 값표도 같이 고친다.

    (`npm run shop`으로 통에만 올리면 판이 안 움직인다. 그때는 한 시간 기다리거나
    관리자 화면에서 아무 것이나 한 번 고쳐주면 된다.)
  */
  const stamp = (r: Row) => {
    const at = r.updated_at ? Date.parse(String(r.updated_at)) : NaN;
    return Number.isNaN(at) ? '' : `?v=${Math.floor(at / 1000)}`;
  };

  const items: Costume[] = ((c.data ?? []) as Row[]).map((r) => {
    const item: Costume = {
      key: String(r.item_key),
      name: String(r.name ?? r.item_key),
      price: Number(r.price ?? 0),
      kind: (String(r.kind) as Costume['kind']) ?? 'bear',
      family: r.family_key ? String(r.family_key) : undefined,
      season: r.season ? String(r.season) : undefined,
      // 안 내려오면 참으로 둔다 — 우리에게 내려온 것은 파는 것이라는 뜻이다
      active: r.active === undefined ? true : Boolean(r.active),
      // 안 내려오면 **언제 켜졌는지 모르는 것**이다. 오늘 켜진 것이 아니다
      openedAt: r.opened_at ? String(r.opened_at) : undefined,
    };
    const own = builtinImg(item.key);
    const at = own ? undefined : shopPath(item, families);
    return { ...item, img: own ?? (at ? shopImageUrl(at) + stamp(r) : undefined) };
  });

  const pick = (season: string, kind: Costume['kind']): Costume =>
    items.find((i) => i.season === season && i.kind === kind) ?? {
      key: `${season}-${kind}`,
      name: '준비 중',
      price: 0,
      kind,
      season,
    };

  /*
    세트는 **곰 하나 · 방 하나 · 소품 하나가 다 찬 것만** 세운다.
    덜 찬 세트를 세우면 상점에 `준비 중` 칸이 뜨고, 그건 파는 물건처럼 읽힌다.
  */
  const sets: CostumeSet[] = ((s.data ?? []) as Row[])
    .map((r) => {
      const key = String(r.season_key);
      return {
        key,
        name: String(r.name),
        note: String(r.note ?? ''),
        family: r.family_key ? String(r.family_key) : undefined,
        bear: pick(key, 'bear'),
        room: pick(key, 'room'),
        pose: pick(key, 'pose'),
        /*
          배너 자리도 **적어둔 것이 아니라 지은 것**이다 —
          `season/<열쇠>/banner.png`. 올린 때가 없으면 배너가 없다.
        */
        banner: r.banner_at
          ? shopImageUrl(bannerPath(key)) + stamp({ updated_at: r.banner_at })
          : undefined,
      };
    })
    .filter((set) => [set.bear, set.room, set.pose].every((i) => i.name !== '준비 중'));

  /*
    **앱이 들고 나가는 둘을 얹어서 돌려준다**(`withBundled`) — 기본 곰돌이와 기본 룸.
    값표에 줄이 있든 없든 늘 서야 하는 것이라 여기서 한 번 챙긴다.
    화면마다 챙기게 두면 어느 화면에서만 빠지는 날이 온다.
  */
  /*
    많이 산 차례 — **열쇠만 늘어놓은 줄.** 수는 안 내려온다.
    못 받아왔으면 빈 줄이고, 그러면 랭킹 줄이 아예 안 선다.
  */
  const rank = k.error
    ? []
    : ((k.data ?? []) as Row[])
        .slice()
        .sort((a, b) => Number(a.rank) - Number(b.rank))
        .map((r) => String(r.item_key));

  return withBundled({
    groups: ((g.data ?? []) as Row[]).map((r) => ({
      key: String(r.group_key),
      name: String(r.name),
    })),
    families,
    sets,
    items,
    rank,
  });
}

/**
 * 세트 배너가 통 어디 있나 — **적어두지 않고 짓는다.**
 *
 * `season/<세트 열쇠>/banner.png`. 파는 물건의 그림 자리(`shopPath`)와 같은 규칙인데,
 * 배너는 **세트에 하나뿐**이라 종류도 번호표도 낄 자리가 없다.
 *
 * 올리는 쪽(`uploadSeasonBanner`)과 보는 쪽(`pullShop`)이 이 한 줄을 같이 본다.
 */
export const bannerPath = (season: string): string => `season/${season}/banner.png`;

/**
 * 지금 띄울 공지 — **켜진 것 중 제일 새것 하나.**
 *
 * 여러 개를 쌓아 띄우지 않는다. 앱을 열자마자 팝업이 둘 뜨면 첫째를 닫는 손이
 * 둘째도 닫는다 — 읽히지도 않고 닫혔다는 셈만 남는다.
 *
 * **로그인 안 해도 읽힌다.** 공지는 로그인해야 볼 것이 아니다.
 */
export async function pullNotice(): Promise<Notice | null> {
  const client = await supabase();
  const { data, error } = await client
    .from('notice')
    .select('id, title, body, active, image, updated_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? asNotice(data as Row) : null;
}

/** 관리자가 보는 목록 — **쓰다 만 것까지.** 값표 정책과 같은 얼개다. */
export async function pullNotices(): Promise<Notice[]> {
  const client = await supabase();
  const { data, error } = await client
    .from('notice')
    .select('id, title, body, active, image, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(asNotice);
}

const asNotice = (r: Row): Notice => {
  const id = String(r.id);
  // 판은 고친 때다. 초까지면 충분하다 — 같은 초에 두 번 고칠 일이 없다.
  const version = String(r.updated_at ?? '');
  const at = Date.parse(version);
  return {
    id,
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    active: Boolean(r.active),
    version,
    /*
      **자리는 `id`로 짓고, 판을 주소 끝에 붙인다.** 다시 올려도 주소가 같아서
      안 붙이면 브라우저가 물고 있던 옛 사진을 그대로 다시 쓴다.
    */
    image: r.image
      ? noticeImageUrl(id) + (Number.isNaN(at) ? '' : `?v=${Math.floor(at / 1000)}`)
      : undefined,
  };
};

/**
 * 공지를 쓰거나 고친다. **새로 쓰는 것은 안 띄우고 들어온다**(`active` 기본 false) —
 * 쓰다 만 것이 뜨는 사고를 막는다. 켜는 것은 목록의 스위치다.
 */
export async function saveNotice(notice: {
  id?: string;
  title: string;
  body: string;
}): Promise<string> {
  const client = await supabase();
  const row = { title: notice.title, body: notice.body };

  if (notice.id) {
    // 고친 줄이 돌아오는지 본다 — RLS가 막으면 오류 없이 `0줄`로 지나간다
    const { data, error } = await client
      .from('notice')
      .update(row)
      .eq('id', notice.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('못 고쳤어요 — 관리자 계정인지 확인해 주세요');
    return notice.id;
  }

  const { data, error } = await client.from('notice').insert(row).select('id').single();
  if (error) throw error;
  return String((data as Row).id);
}

/**
 * 띄우거나 내린다.
 *
 * **켜진 것이 하나여야 한다.** 여럿 켜두면 제일 새것만 뜨는데, 목록에서는 둘 다
 * 켜져 보여서 **어느 것이 뜨는지 알 수가 없다.** 그래서 켤 때 나머지를 내린다.
 */
export async function setNoticeActive(id: string, active: boolean): Promise<void> {
  const client = await supabase();
  if (active) {
    const { error } = await client.from('notice').update({ active: false }).neq('id', id);
    if (error) throw error;
  }
  const { data, error } = await client
    .from('notice')
    .update({ active })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('못 바꿨어요 — 관리자 계정인지 확인해 주세요');
}

/**
 * 공지 사진을 올린다 — 자리는 `notice/<id>.png`.
 *
 * **공지를 먼저 써야** 부를 수 있다. `id`가 자리를 정하기 때문이다.
 * `upsert`로 올린다 — 지웠다 올리면 그 사이에 앱을 켠 사람에게 빈 자리가 뜬다.
 */
export async function uploadNoticeImage(id: string, body: Blob): Promise<void> {
  const client = await supabase();
  const { error } = await client.storage.from('notice').upload(`${id}.png`, body, {
    contentType: 'image/png',
    upsert: true,
    // 주소 끝에 판이 붙으니(`asNotice`) 오래 물려도 된다
    cacheControl: '3600',
  });
  if (error) throw error;
}

/**
 * 사진이 있다고/없다고 적는다.
 *
 * **표에는 참·거짓만 담는다.** 자리는 `id`로 짓는 것이라 적어둘 것이 없고,
 * 있나 없나는 지어서 알 수가 없다 — 글만 있는 공지가 많아서, 없는 것을 부르러
 * 가면 열 때마다 404를 먹는다.
 */
export async function setNoticeImage(id: string, has: boolean): Promise<void> {
  const client = await supabase();
  const { data, error } = await client
    .from('notice')
    .update({ image: has })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('못 바꿨어요 — 관리자 계정인지 확인해 주세요');
}

/**
 * 지운다. **공지는 아무도 가진 것이 아니라** 지워도 남의 줄이 가리킬 데를 잃지 않는다.
 *
 * 통에 있는 사진도 같이 치운다 — 가리키는 데가 없는 사진이 쌓일 까닭이 없다.
 * 사진 지우기가 막혀도 공지는 지운다(**둘 중 하나는 되어야** 목록이 정리된다).
 */
export async function removeNotice(id: string): Promise<void> {
  const client = await supabase();
  await client.storage
    .from('notice')
    .remove([`${id}.png`])
    .catch(() => {});
  const { error } = await client.from('notice').delete().eq('id', id);
  if (error) throw error;
}

/**
 * **상점을 채울 수 있는 사람인가.**
 *
 * `shop_admins`는 `자기 줄만` 보이게 열어뒀다 — 그래서 한 줄이 오면 나다.
 * 명단에 넣는 길은 **앱에 없다.** SQL Editor에서 손으로 넣는다
 * (관리자 하나가 새면 상점 전체가 샌다).
 *
 *   insert into shop_admins (user_id)
 *   select id from auth.users where email = '내메일@example.com'
 *   on conflict do nothing;
 *
 * **이걸로 화면을 열고 말고를 정한다.** 진짜로 막는 것은 여기가 아니라
 * RLS다(`is_shop_admin()`) — 앱이 뭐라고 하든 통과 값표는 서버가 막는다.
 * 그러니 이 함수는 **안 보여줄 것을 안 보여주는 것**이지 지키는 것이 아니다.
 */
export async function amShopAdmin(): Promise<boolean> {
  const client = await supabase();
  const { data, error } = await client.from('shop_admins').select('user_id').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/**
 * 그림을 통에 올린다. **자리는 분류와 열쇠로 짓는다** — 적어둔 것을 쓰지 않는다
 * ([costumes.ts](../costumes.ts)의 `shopPath`).
 *
 * `upsert`로 올린다. 다시 그려 올릴 때 지웠다 올리게 하면
 * 지운 뒤 올리기 전에 상점을 연 사람에게 빈 칸이 뜬다.
 *
 * 막히면 그대로 던진다 — **거의 다 관리자가 아니라서 막힌 것**이고
 * (`shop` 통은 `is_shop_admin()`만 쓴다), 그건 화면에 그대로 적어야 안다.
 */
export async function uploadShopImage(
  item: Costume,
  families: ShopFamily[],
  body: Blob,
): Promise<string> {
  const at = shopPath(item, families);
  if (!at) throw new Error('중분류가 없어 그림 자리를 정할 수 없습니다');

  const client = await supabase();
  const { error } = await client.storage.from('shop').upload(at, body, {
    contentType: 'image/png',
    upsert: true,
    /*
      **오래 물려둔다.** 주소 끝에 `?v=<고친 때>`가 붙어서(`pullShop`) 다시 올리면
      주소가 달라진다 — 물려둔 것과 새것이 서로 다른 주소라 짧게 둘 까닭이 없다.
    */
    cacheControl: '3600',
  });
  if (error) throw error;
  return at;
}

/**
 * 세트 전부 — **덜 찬 것까지.**
 *
 * `pullShop()`은 곰·방·소품이 다 찬 세트만 세운다(상점에 `준비 중` 칸이 뜨면
 * 파는 물건처럼 읽힌다). 채우는 쪽에서는 **그 반대가 필요하다** —
 * 막 지은 빈 세트에 첫 물건을 넣어야 하니까.
 */
export async function pullSeasons(): Promise<CostumeSet[]> {
  const client = await supabase();
  const { data, error } = await client
    .from('costume_season')
    .select('season_key, name, note, family_key, banner_at')
    .order('ord');
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => {
    const key = String(r.season_key);
    return {
      key,
      name: String(r.name),
      note: String(r.note ?? ''),
      family: r.family_key ? String(r.family_key) : undefined,
      // 채우는 화면은 세트의 이름과 열쇠만 쓴다 — 안에 든 것은 값표를 세면 나온다
      bear: EMPTY_SLOT,
      room: EMPTY_SLOT,
      pose: EMPTY_SLOT,
      // **배너는 여기서도 봐야 한다** — 걸어둔 것을 다시 올리러 오는 자리다
      banner: r.banner_at
        ? shopImageUrl(bannerPath(key)) +
          `?v=${Math.floor(Date.parse(String(r.banner_at)) / 1000)}`
        : undefined,
    };
  });
}

/**
 * 세트 배너를 올린다 — **한 세트에 한 장.**
 *
 * 자리를 지어 쓰니(`bannerPath`) 다시 올려도 주소가 같다. 그래서 **올린 때를
 * 값표에 찍는다** — 그게 없으면 주소가 그대로라 브라우저가 옛 배너를 그냥 쓴다.
 * 그 칸은 `null`이면 배너가 없다는 뜻이기도 해서, 찍는 일이 두 가지를 한다.
 *
 * **통에 먼저 올리고 값표를 찍는다.** 반대로 하면 값표에는 배너가 있다고 적혔는데
 * 통이 비는 사이가 생기고, 그때 상점을 연 사람에게 **깨진 배너**가 뜬다.
 */
export async function uploadSeasonBanner(season: string, body: Blob): Promise<void> {
  const client = await supabase();
  const { error } = await client.storage.from('shop').upload(bannerPath(season), body, {
    contentType: 'image/png',
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw error;

  const { error: mark } = await client
    .from('costume_season')
    .update({ banner_at: new Date().toISOString() })
    .eq('season_key', season);
  if (mark) throw mark;
}

/**
 * 배너를 내린다 — **값표의 찍힌 때만 지운다.**
 *
 * 통에서 파일까지 지우지 않는다. 지우는 길과 올리는 길이 따로 있으면
 * 한쪽만 되고 한쪽은 막히는 날이 오는데(정책은 같지만 실패는 따로 난다),
 * **없다고 치는 것은 값표 한 칸이면 된다.** 다시 올리면 그 자리를 덮는다.
 */
export async function clearSeasonBanner(season: string): Promise<void> {
  const client = await supabase();
  const { error } = await client
    .from('costume_season')
    .update({ banner_at: null })
    .eq('season_key', season);
  if (error) throw error;
}

const EMPTY_SLOT: Costume = { key: '', name: '', price: 0, kind: 'bear' };

/**
 * 중분류를 짓는다 — **이름과 폴더를 같이 받는다.**
 *
 * 폴더를 안 받으면 `기념일`을 무엇으로 적어 폴더를 만들지 정할 길이 없다.
 * 그렇다고 이름을 그대로 폴더로 쓰면 한글이 주소에 실린다.
 *
 * **열쇠가 곧 폴더다.** 그래서 뒤엣것은 **한 번 정하면 안 바뀐다** —
 * 이미 쌓인 그림이 그 이름 밑에 있다. 이름은 언제든 고쳐도 된다.
 *
 * Storage에 폴더를 미리 만들 것은 없다. **경로 앞부분이 폴더 노릇을 해서**
 * `season/monsoon/gomdori/0000030.png`로 올리는 순간 그 자리가 생긴다.
 */
export async function createShopFamily(fam: {
  key: string;
  group: string;
  name: string;
}): Promise<void> {
  if (!/^[a-z][a-z0-9-]{1,23}$/.test(fam.key)) {
    throw new Error('폴더는 영어 소문자로 시작해 소문자·숫자·붙임표만, 2~24자');
  }
  const client = await supabase();
  const { error } = await client.from('shop_family').insert({
    family_key: fam.key,
    group_key: fam.group,
    name: fam.name,
    // 맨 뒤에 세운다 — 차례를 바꾸는 것은 여기서 할 일이 아니다
    ord: await nextOrd('shop_family'),
    active: true,
  });
  if (error) throw error;
}

/**
 * 세트를 짓는다 — **열쇠는 안 받는다.** `s000001`부터 번호표로 딴다.
 *
 * 물건 코드와 **번호표를 따로 쓴다.** 한 통에서 뽑으면 물건 스물아홉 개를 넣은 뒤
 * 만든 세트가 `0000030`이 되어 물건 코드처럼 읽힌다.
 *
 * **중분류는 시즌 밑에 있는 것이어야 한다.** 꾸미기 밑의 것을 달면 그 세트의
 * 물건들이 트리거를 타고 꾸미기로 끌려가 시즌 칩에서 사라진다 — 서버가 막는다
 * (`season_family_guard`).
 */
export async function createSeason(set: {
  family: string;
  name: string;
  note: string;
}): Promise<string> {
  const client = await supabase();
  const { data, error } = await client
    .from('costume_season')
    .insert({
      family_key: set.family,
      name: set.name,
      note: set.note,
      ord: await nextOrd('costume_season'),
    })
    .select('season_key')
    .single();
  if (error) throw error;
  return String((data as Row).season_key);
}

/**
 * 차례의 맨 뒤 — **새로 지은 것은 뒤에 선다.**
 * 다 같은 값을 주면 무엇이 먼저인지가 그때그때 달라진다.
 */
async function nextOrd(table: string): Promise<number> {
  const client = await supabase();
  const { data } = await client.from(table).select('ord').order('ord', { ascending: false }).limit(1);
  const top = ((data ?? []) as Row[])[0];
  return Number(top?.ord ?? 0) + 1;
}

/**
 * 파는 것을 넣거나 고친다.
 *
 * **열쇠를 안 보낸다.** 새로 넣는 것은 서버가 번호표로 딴다(`0000001`) —
 * 이름에서 지으면 이름을 고칠 때마다 코드를 고쳐야 하고, 고치면 이미 산 사람의
 * 줄이 가리킬 데를 잃는다.
 *
 * **새로 넣는 것은 숨김으로 들어온다**(`active` 기본값 false).
 * 반쯤 그린 것이 상점에 뜨는 사고를 막는다 — 그림을 올린 뒤 손으로 켠다.
 */
export async function saveShopItem(item: {
  key?: string;
  kind: Costume['kind'];
  name: string;
  price: number;
  family: string;
  /** 시즌 물건이면 어느 세트. **중분류는 안 보낸다** — 세트가 정한다. */
  season?: string;
}): Promise<string> {
  const client = await supabase();
  /*
    시즌 물건은 **세트만 보낸다.** 중분류는 서버 트리거가 세트에서 끌어온다
    (`sync_catalog_family`) — 물건마다 따로 적게 두면 할로윈 곰은 기념일인데
    할로윈 방은 계절인 일이 생긴다.
  */
  const row = {
    kind: item.kind,
    name: item.name,
    price: item.price,
    season: item.season ?? null,
    family_key: item.season ? undefined : item.family,
  };

  if (item.key) {
    // 고친 줄이 돌아오는지 본다 — RLS가 막으면 오류 없이 `0줄`로 지나간다
    const { data, error } = await client
      .from('costume_catalog')
      .update(row)
      .eq('item_key', item.key)
      .select('item_key');
    if (error) throw error;
    if (!data?.length) {
      throw new Error('못 고쳤어요 — 상점을 채울 수 있는 계정인지 확인해 주세요');
    }
    return item.key;
  }

  const { data, error } = await client
    .from('costume_catalog')
    .insert(row)
    .select('item_key')
    .single();
  if (error) throw error;
  return String((data as Row).item_key);
}

/**
 * 상점에 걸거나 내린다. **지우는 길은 없다** — 산 사람의 옷이 이름을 잃는다.
 *
 * **고친 줄이 돌아오는지 본다.** RLS가 막으면 Postgres는 오류를 안 낸다 —
 * `0줄 고쳤다`고 조용히 성공한다. 그대로 두면 스위치를 눌러도 아무 일이 안 나는데
 * 화면은 바뀐 것처럼 보이고, 다음에 받아오면 도로 켜져 있다.
 * **막힌 것을 막혔다고 말해야** 왜 안 되는지 알 수 있다.
 */
export async function setShopItemActive(key: string, active: boolean): Promise<void> {
  const client = await supabase();
  const { data, error } = await client
    .from('costume_catalog')
    .update({ active })
    .eq('item_key', key)
    .select('item_key');
  if (error) throw error;
  if (!data?.length) throw new Error('못 바꿨어요 — 상점을 채울 수 있는 계정인지 확인해 주세요');
}

/**
 * 산다. **값은 서버가 값표에서 찾는다** —
 * 앱이 값을 같이 보내면 `이 옷 0원이요`를 막을 수가 없다.
 * 남은 포인트를 돌려주고, 모자라면 던진다.
 */
export async function buyCostume(itemKey: string): Promise<number> {
  const client = await supabase();
  const { data, error } = await client.rpc('buy_costume', { item: itemKey });
  if (error) throw error;
  return Number(data ?? 0);
}

/** 입거나 깐다. 곰과 포즈는 곰 자리에, 방은 방 자리에 앉는다. */
export async function wearCostume(
  me: string,
  worn: { bear: string; room: string },
): Promise<void> {
  const client = await supabase();
  const { error } = await client.from('gomdori').upsert(
    {
      user_id: me,
      worn_bear: worn.bear,
      worn_room: worn.room,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
