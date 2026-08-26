-- 할 일 앱 2단계 스키마
-- Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 한 번 실행하면 된다.
--
-- 설계 두 가지만 미리 말해둔다.
--
-- 1) 지우는 대신 deleted_at을 단다.
--    두 기기가 같이 쓰면 "지웠다"도 전해져야 한다. 진짜로 지워버리면
--    상대 기기에는 그 줄이 그냥 남아 있다가 다음 동기화 때 되살아난다.
--
--    지운 것에는 두 가지가 있고 deleted_by가 가른다.
--      있음 — 사람이 지운 것. 30일 동안 `지운 것`에 남고 누구나 되돌릴 수 있다
--      없음 — 그냥 없앤 것 (다음 회차 정리·전체 초기화·30일 지난 것).
--             앱이 받아오지도 않는다. 되돌릴 것이 아니라 치운 것이다
--
-- 2) 충돌은 항목 단위로 updated_at이 늦은 쪽이 이긴다.
--    목록을 통째로 덮어쓰지 않는다 — 상대가 방금 체크한 게 사라지면 안 된다.

-- ───────────────────────── 방 ─────────────────────────

-- 로그인 계정은 여기서 만들지 않는다. Supabase가 auth.users에 알아서 넣는다.
-- 아래 테이블들은 그걸 참조만 한다.

create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- 방 칩·배지 색. 팔레트에서 고른 HEX. 카테고리와 같은 팔레트를 쓴다.
  color      text not null default '#A9B8F4',
  -- 초대장에 실리는 값. 아래 make_join_code()가 넣는다 (표를 만든 뒤에 기본값을 건다).
  join_code  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now()
);
-- 이미 만들어져 있던 방에도 색 칸을 더한다 (두 번 돌려도 되게)
alter table rooms add column if not exists color text not null default '#A9B8F4';

/*
 * 이 방이 무엇을 나누는가 — 할 일 · 장보기 · 메모.
 *
 * 방을 만들 때 고르는 게 제일 좋은 안전장치다. 나중에 실수를 막는 게 아니라
 * **길을 아예 안 내는 방식**이라서 그렇다. 회사방에서 장보기를 끄면
 * 담을 때 뜨는 목록에 회사방이 아예 안 나온다 — 고를 수 없으니 잘못 누를 수 없다.
 *
 * 기본은 할 일만 켜둔다. 잘못 눌러 새는 걸 막자는 게 목적이니 기본값도 그쪽이다.
 * (할 일에 딸린 `어느 카테고리를 나눌까`는 categories.room_id가 들고 있다)
 */
alter table rooms add column if not exists share_tasks boolean not null default true;
alter table rooms add column if not exists share_shop  boolean not null default false;
alter table rooms add column if not exists share_memo  boolean not null default false;

/**
 * 초대 코드를 만든다 — 여덟 자를 넷씩 끊어 `8F3K-2QMD`로 읽는다.
 *
 * uuid 32글자는 **손으로 옮겨 적을 수 있는 길이가 아니다.**
 * 헷갈리는 글자(0 O 1 I L)는 빼서 받아 적다 틀릴 자리를 없앤다.
 * 하이픈은 보여줄 때만 끼우고 담을 때는 여덟 자만 담는다.
 */
create or replace function make_join_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  made text;
  i int;
begin
  loop
    made := '';
    for i in 1..8 loop
      made := made || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where join_code = made);
  end loop;
  return made;
end $$;

alter table rooms alter column join_code set default make_join_code();
-- 옛 32자리로 남아 있는 코드는 새 여덟 자로 갈아준다
update rooms set join_code = make_join_code() where length(join_code) <> 8;

create table if not exists room_members (
  room_id      uuid not null references rooms on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null,
  -- 'owner'는 방을 만든 사람. 지금은 권한 차이를 두지 않고 자리만 잡아둔다.
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (room_id, user_id)
);

/**
 * 이 사람이 그 방 사람인가.
 * 정책 안에서 room_members를 직접 조회하면 그 테이블의 정책이 다시 불려서 무한히 돈다.
 * security definer로 한 겹 감싸 그 고리를 끊는다.
 */
create or replace function is_member(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from room_members m
    where m.room_id = target and m.user_id = auth.uid()
  );
$$;

-- ──────────────────────── 데이터 ────────────────────────
-- room_id가 있으면 방 것, 없으면 owner_id 개인 것.

create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references rooms on delete cascade,
  owner_id   uuid references auth.users,
  name       text not null,
  color      text not null,
  sort_order int  not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- 사람이 지웠으면 그 사람. 뒷정리로 없앤 것은 비어 있다.
  deleted_by uuid references auth.users
);

create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references rooms on delete cascade,
  owner_id     uuid references auth.users,
  title        text not null,
  memo         text not null default '',
  category_id  uuid references categories on delete set null,
  priority     smallint not null default 2,
  date         date not null,
  repeat_days  int  not null default 0,
  repeat_until date,
  cycle_since  date,
  parent_id    uuid references tasks on delete set null,
  done         boolean not null default false,
  done_on      date,
  done_by      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  -- 방 `지운 것`에서 "남편이 지움"이라고 적는 자리
  deleted_by   uuid references auth.users
);
/*
 * 누가 하나 — null이면 `안 정함`. **기본이 안 정함이다.**
 * 이름(text)이 아니라 사람(uuid)으로 담는다. 이름으로 담으면 상대가 별명을 바꾼 순간
 * 옛 할 일들이 옛 이름으로 남는다. done_by와 다른 칸인 까닭이기도 하다 —
 * 저쪽은 `누가 했나`고 이쪽은 `누가 할까`다.
 *
 * 한 명만 고른다. 여럿을 담으면 표가 하나 더 필요하고
 * "둘 중 하나만 하면 끝인가 둘 다 해야 끝인가"라는 답 없는 물음이 따라온다.
 */
alter table tasks add column if not exists assignee_id uuid references auth.users;

/*
 * 다음 회차는 — once(이번만) · same(같은 사람) · rotate(번갈아).
 * 한 번 정한 사람이 다음 회차까지 계속 따라붙는 건 놀라운 일이라 **고를 때만 그렇게 된다.**
 */
alter table tasks add column if not exists rotate text not null default 'once';
-- presets에도 같은 칸이 붙는다. 그건 표를 만든 뒤에 — 아래에 있다.

/*
 * 차례가 **언제 · 누구 손에서** 넘어왔나. `앱을 열었을 때 뜨는 띠`가 이 둘로 선다.
 *
 * `updated_at`으로는 못 센다. 제목만 고쳐도 밀리는 칸이라
 * 이미 내 차례인 일을 내가 한 번 고치면 `내 차례가 됐어요`가 다시 뜬다.
 * **차례가 바뀔 때만** 미는 칸이 따로 있어야 한다.
 *
 * `assigned_by`가 있어야 내가 나에게 준 것을 거른다 — 방금 내가 적어 넣은 일로
 * 띠가 뜨면 앱이 헛말을 하는 것이다. 교대로 넘어온 것은 체크한 사람이 넘긴 것으로 적는다.
 * `deleted_at`·`deleted_by` 짝과 같은 결이다.
 */
alter table tasks add column if not exists assigned_at timestamptz;
alter table tasks add column if not exists assigned_by uuid references auth.users;

create index if not exists tasks_room_date  on tasks (room_id, date);
create index if not exists tasks_owner_date on tasks (owner_id, date);
-- 동기화는 "지난번 이후 바뀐 것만" 받아온다
create index if not exists tasks_room_updated on tasks (room_id, updated_at);

create table if not exists presets (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references rooms on delete cascade,
  owner_id     uuid references auth.users,
  title        text not null,
  memo         text not null default '',
  category_id  uuid references categories on delete set null,
  priority     smallint not null default 2,
  repeat_days  int  not null default 0,
  repeat_until date,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  deleted_by   uuid references auth.users
);

/*
 * 즐겨찾기에도 배정이 붙는다 — 위 tasks와 같은 두 칸이다.
 *
 * **여기 있는 까닭은 순서 때문이다.** 위에 뒀더니 빈 DB에서 표가 생기기도 전에
 * `alter table presets`가 돌아 `relation "presets" does not exist`로 멈췄다.
 * 이미 도는 DB에서는 표가 있으니 안 걸렸고, 그래서 오래 안 보였다.
 */
alter table presets add column if not exists assignee_id uuid references auth.users;
alter table presets add column if not exists rotate text not null default 'once';

-- 장보기 — 날짜도 주기도 없다. bought_on 하나로 목록과 기록이 갈린다.
create table if not exists shop_items (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references rooms on delete cascade,
  owner_id   uuid references auth.users,
  title      text not null,
  note       text not null default '',
  place      text not null default '',
  done       boolean not null default false,
  bought_on  date,
  done_by    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users
);

-- 메모 — 흘러가지 않는 종이. 제목 칸은 없다 (첫 줄이 제목 노릇을 한다).
create table if not exists memos (
  id         uuid primary key default gen_random_uuid(),
  -- 방 하나만 걸리던 시절 칸. 지금은 아래 room_ids를 쓴다 (옛 줄 때문에 남겨둔다).
  room_id    uuid references rooms on delete cascade,
  /*
   * **메모만 여러 방에 동시에 걸린다.** 비어 있으면 나만 보는 것.
   *
   * 할 일은 카테고리가 방 하나를 물고 있고, 장보기는 한 곳만 간다 —
   * 어차피 따로 사야 하니까. 와이파이 비밀번호는 집에서도 회사에서도
   * 같은 종이 한 장이라 여기만 여럿이다. 한 장을 여러 방에 둬도 내용은 하나다.
   *
   * 이음표를 따로 만들지 않는다. 한 메모가 걸리는 방은 많아야 몇 개고,
   * 표를 하나 더 만들면 맞추기(sync)에서 줄이 아니라 관계를 견줘야 한다.
   */
  room_ids   uuid[] not null default '{}',
  owner_id   uuid references auth.users,
  text       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 내가 본 뒤에 **남이** 고친 것에만 점이 뜬다
  updated_by uuid references auth.users,
  deleted_at timestamptz,
  deleted_by uuid references auth.users
);
alter table memos add column if not exists room_ids uuid[] not null default '{}';
alter table memos add column if not exists updated_by uuid references auth.users;
-- 방 하나만 걸리던 시절 메모를 옮겨 담는다
update memos set room_ids = array[room_id] where room_id is not null and room_ids = '{}';
-- 여러 방을 걸러 찾는 자리라 GIN이 맞다
create index if not exists memos_room_ids on memos using gin (room_ids);

-- ───────────────────────── RLS ─────────────────────────
-- 방 것이면 그 방 사람만, 개인 것이면 본인만.

alter table rooms        enable row level security;
alter table room_members enable row level security;
alter table categories   enable row level security;
alter table tasks        enable row level security;
alter table presets      enable row level security;
alter table shop_items   enable row level security;
alter table memos        enable row level security;

-- 두 번 돌려도 되게 지우고 다시 만든다
drop policy if exists "방 사람만 본다" on rooms;
create policy "방 사람만 본다" on rooms
  for select using (is_member(id));
drop policy if exists "누구나 자기 방을 만든다" on rooms;
create policy "누구나 자기 방을 만든다" on rooms
  for insert with check (created_by = auth.uid());
-- 방을 고치는 건 연 사람만. 손님이 방 이름·나누는 것·초대 코드를 바꿀 일이 없다.
-- 주인이 바뀌는 길과 코드 새로 만들기는 security definer 함수라 여기 안 걸린다.
drop policy if exists "방 사람이 방 이름을 고친다" on rooms;
drop policy if exists "방은 연 사람이 고친다" on rooms;
create policy "방은 연 사람이 고친다" on rooms
  for update using (created_by = auth.uid());

drop policy if exists "같은 방 사람끼리 서로 보인다" on room_members;
create policy "같은 방 사람끼리 서로 보인다" on room_members
  for select using (is_member(room_id));
drop policy if exists "내 자리만 내가 뺀다" on room_members;
create policy "내 자리만 내가 뺀다" on room_members
  for delete using (user_id = auth.uid());
drop policy if exists "내 이름은 내가 고친다" on room_members;
create policy "내 이름은 내가 고친다" on room_members
  for update using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['categories', 'tasks', 'presets', 'shop_items', 'memos']
  loop
    execute format($f$
      drop policy if exists "읽기"   on %1$I;
      drop policy if exists "쓰기"   on %1$I;
      drop policy if exists "고치기" on %1$I;

      create policy "읽기" on %1$I for select
        using (
          case when room_id is null then owner_id = auth.uid()
               else is_member(room_id) end
        );
      create policy "쓰기" on %1$I for insert
        with check (
          case when room_id is null then owner_id = auth.uid()
               else is_member(room_id) end
        );
      create policy "고치기" on %1$I for update
        using (
          case when room_id is null then owner_id = auth.uid()
               else is_member(room_id) end
        );
    $f$, t);
  end loop;
end $$;

/*
 * 메모만 따로 건다 — 위 정책은 room_id 하나로 따지는데 메모는 목록으로 따져야 한다.
 * 걸린 방 중 **하나라도 내가 든 방이면** 보이고 고칠 수 있다.
 * (이 블록은 위 반복문 뒤에 와야 한다. 거기서 memos에도 한 번 걸고 지나간다.)
 */
drop policy if exists "읽기"   on memos;
drop policy if exists "쓰기"   on memos;
drop policy if exists "고치기" on memos;

create policy "읽기" on memos for select
  using (
    owner_id = auth.uid()
    or exists (select 1 from unnest(room_ids) as r(id) where is_member(r.id))
  );
create policy "쓰기" on memos for insert
  with check (
    owner_id = auth.uid()
    or exists (select 1 from unnest(room_ids) as r(id) where is_member(r.id))
  );
create policy "고치기" on memos for update
  using (
    owner_id = auth.uid()
    or exists (select 1 from unnest(room_ids) as r(id) where is_member(r.id))
  );

-- delete 정책은 일부러 없다. 지우기는 deleted_at을 다는 update로만 한다.

-- ─────────────────────── 방 만들기·들어가기 ───────────────────────

/** 받아 적은 코드를 다듬는다 — 대소문자·하이픈·공백은 안 따진다 */
create or replace function tidy_code(code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;

-- 초대 코드를 아는 사람은 그 방 사람이 아니어도 들어갈 수 있어야 하는데,
-- RLS만으로는 그게 안 된다 (아직 멤버가 아니니 방이 보이지 않는다).
-- 그래서 이 두 개만 security definer로 열어둔다.

create or replace function create_room(room_name text, me text, room_color text default '#A9B8F4')
returns rooms
language plpgsql
security definer
set search_path = public
as $$
declare made rooms;
begin
  -- security definer는 RLS를 지나치므로, 로그인 여부는 여기서 직접 본다
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  insert into rooms (name, color, created_by) values (room_name, room_color, auth.uid())
  returning * into made;

  insert into room_members (room_id, user_id, display_name, role)
  values (made.id, auth.uid(), me, 'owner');

  return made;
end $$;

/**
 * 코드를 넣었을 때 들어가기 전에 먼저 보여줄 미리보기.
 * 아직 멤버가 아니라 RLS로는 이 방이 안 보이므로 security definer로 한 겹 연다.
 * 이름·색·사람만 돌려주고 방 안의 할 일·메모 같은 내용은 주지 않는다.
 */
create or replace function peek_room(code text)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare target rooms; result json;
begin
  select * into target from rooms where join_code = tidy_code(code);
  if target.id is null then
    return null;
  end if;

  -- 이름·색·사람·나누는 것만 돌려준다. 방 안의 할 일·메모 같은 내용은 주지 않는다.
  select json_build_object(
    'id', target.id,
    'name', target.name,
    'color', target.color,
    'owner', (select display_name from room_members
              where room_id = target.id and user_id = target.created_by),
    'members', (select coalesce(json_agg(
                  json_build_object('name', display_name,
                                    'owner', user_id = target.created_by)
                  order by joined_at), '[]'::json)
                from room_members where room_id = target.id),
    'count', (select count(*) from room_members where room_id = target.id),
    'shareTasks', target.share_tasks,
    'shareShop', target.share_shop,
    'shareMemo', target.share_memo,
    'cats', (select coalesce(json_agg(
               json_build_object('name', name, 'color', color)
               order by sort_order), '[]'::json)
             from categories where room_id = target.id and deleted_at is null)
  ) into result;

  return result;
end $$;

create or replace function join_room(code text, me text)
returns rooms
language plpgsql
security definer
set search_path = public
as $$
-- 변수 이름을 found로 두면 plpgsql이 미리 쥐고 있는 FOUND를 가린다
declare target rooms;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  select * into target from rooms where join_code = tidy_code(code);
  if target.id is null then
    raise exception '초대 코드가 맞지 않습니다';
  end if;

  insert into room_members (room_id, user_id, display_name)
  values (target.id, auth.uid(), me)
  on conflict (room_id, user_id) do update set display_name = excluded.display_name;

  return target;
end $$;

/**
 * 코드를 새로 만든다 — 옛 초대장이 돌아다니는 게 마음에 걸릴 때 한 번 누르면 그전 것은 다 막힌다.
 * 기한은 두지 않는다. 코드는 방이 사는 동안만 산다.
 * 초대와 코드 만들기는 **주인만** 한다.
 */
create or replace function reset_join_code(room uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare made text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if not exists (select 1 from rooms where id = room and created_by = auth.uid()) then
    raise exception '방을 연 사람만 코드를 새로 만들 수 있습니다';
  end if;

  made := make_join_code();
  update rooms set join_code = made where id = room;
  return made;
end $$;

-- ─────────────────────── 방 끝내기 ───────────────────────

/**
 * 방 안의 것을 전부 개인 것으로 돌려놓는다.
 *
 * **방을 지우기 전에 반드시 이걸 먼저 부른다.** 표마다 room_id에
 * `on delete cascade`가 걸려 있어서, 그냥 지우면 방 안의 할 일·카테고리가
 * 같이 사라진다. 그만 나누는 건 **내 것을 도로 거두는 것**이지 버리는 게 아니다.
 */
create or replace function reclaim_room(room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare keeper uuid;
begin
  select created_by into keeper from rooms where id = room;
  if keeper is null then
    return;
  end if;

  -- 방은 내가 연 창문이다. 들어온 사람이 거기 만든 것도 내 카테고리에 한 일이라
  -- 임자 자리(owner_id)까지 연 사람에게 돌려놓는다.
  update categories set room_id = null, owner_id = keeper, updated_at = now() where room_id = room;
  update tasks      set room_id = null, owner_id = keeper, updated_at = now() where room_id = room;
  update presets    set room_id = null, owner_id = keeper, updated_at = now() where room_id = room;
  update shop_items set room_id = null, owner_id = keeper, updated_at = now() where room_id = room;

  -- 메모는 그 방만 목록에서 뺀다. 회사방을 닫는다고 집에도 걸린 메모가
  -- 집에서 사라지면 안 된다. 갈 곳이 없어진 것만 임자를 연 사람에게 돌려놓는다.
  update memos
     set room_ids = array_remove(room_ids, room),
         owner_id = case
                      when array_length(array_remove(room_ids, room), 1) is null then keeper
                      else owner_id
                    end,
         updated_at = now()
   where room = any(room_ids);
  update memos set room_id = null, owner_id = keeper, updated_at = now() where room_id = room;
end $$;

/**
 * 그만 나누기 — 내가 연 창문을 내가 닫는다. **나가는 게 아니다.**
 * 닫아도 내 화면에서는 아무것도 안 움직인다. 그 카테고리는 처음부터 내 것이었고
 * 내 목록에 있었다. 칩에서 공유 표시가 사라지는 게 전부다.
 */
create or replace function close_room(room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if not exists (select 1 from rooms where id = room and created_by = auth.uid()) then
    raise exception '방을 연 사람만 그만 나눌 수 있습니다';
  end if;

  perform reclaim_room(room);
  delete from rooms where id = room;
end $$;

/**
 * 내가 열어놓고 밖에 나와 있는 방을 거둬들인다.
 *
 * 주인이 `나가기`를 누를 수 있던 때가 있었다. 그러면 방은 살아 있는데 나는 밖이라,
 * **내가 나눈 내 카테고리를 내가 못 보게 된다** (RLS가 방 것은 방 사람에게만 준다).
 * 그 자리에서는 되돌릴 길이 화면에 없으니 여기서 조용히 주워온다.
 * 지금은 주인에게 `나가기`가 없어서 새로 생기지 않는다 — 남은 것을 치우는 함수다.
 */
create or replace function reclaim_my_rooms()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int := 0; r uuid;
begin
  if auth.uid() is null then
    return 0;
  end if;

  for r in
    select id from rooms
     where created_by = auth.uid()
       and not exists (
         select 1 from room_members m where m.room_id = rooms.id and m.user_id = auth.uid()
       )
  loop
    perform reclaim_room(r);
    delete from rooms where id = r;
    n := n + 1;
  end loop;

  return n;
end $$;

/**
 * 방에서 사람이 빠지면 그 사람에게 배정돼 있던 일은 `안 정함`으로 돌아간다.
 * 없는 사람 이름이 차례 칩에 남으면 아무도 그 일을 안 하게 된다.
 */
create or replace function drop_assignments(room uuid, who uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 넘어온 자취도 같이 지운다. 차례가 비었는데 `누가 언제 넘겼다`만 남아 있을 이유가 없다.
  update tasks set assignee_id = null, assigned_at = null, assigned_by = null, updated_at = now()
   where room_id = room and assignee_id = who;
  update presets set assignee_id = null, updated_at = now()
   where room_id = room and assignee_id = who;
end $$;

/**
 * 맡기고 나가기 — **주인만 바뀐다.** 내 폰에서만 사라진다.
 *
 * `그만 나누기`만 있으면 회사방에서 사고가 난다. 내가 방을 열어 팀이 반년을
 * 같이 썼는데 내가 나간다고 그 기록이 통째로 사라지면 안 된다.
 * 그건 내 집안일과 달리 **내 것이 아니라 팀 것**이다.
 *
 * 방 이름도 초대 코드도 그대로다. 남은 사람들 화면은 아무것도 안 변한다 —
 * 쓰던 게 그대로 있고, 새 주인만 초대·끝내기를 할 수 있게 될 뿐이다.
 */
create or replace function hand_over_room(room uuid, heir uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if not exists (select 1 from rooms where id = room and created_by = auth.uid()) then
    raise exception '방을 연 사람만 맡길 수 있습니다';
  end if;
  if heir = auth.uid() then
    raise exception '나에게는 맡길 수 없습니다';
  end if;
  if not exists (select 1 from room_members where room_id = room and user_id = heir) then
    raise exception '이 방에 없는 사람입니다';
  end if;

  -- 방 안의 것이 새 주인에게 옮겨간다. 안 옮기면 내가 빠지는 순간 임자 없는 줄이 된다.
  update categories set owner_id = heir, updated_at = now() where room_id = room;
  update tasks      set owner_id = heir, updated_at = now() where room_id = room;
  update presets    set owner_id = heir, updated_at = now() where room_id = room;
  update shop_items set owner_id = heir, updated_at = now() where room_id = room;
  /*
   * 메모는 임자를 안 옮긴다 — **여러 방에 걸려 있어서** 옮기면 다른 방에 걸린
   * 남의 종이까지 딸려간다. 안 옮겨도 되는 까닭은 RLS에 있다:
   * 메모는 임자가 아니라 걸린 방에 내가 들었는지로 보이고 고쳐진다.
   */

  update rooms set created_by = heir where id = room;
  update room_members set role = 'owner'  where room_id = room and user_id = heir;
  -- 내가 맡고 있던 차례는 비운다. 방에 없는 사람 이름이 남으면 아무도 그 일을 안 한다.
  perform drop_assignments(room, auth.uid());
  delete from room_members where room_id = room and user_id = auth.uid();
end $$;

-- ─────────────────────── 카테고리 나누기 ───────────────────────
-- 카테고리만 옮기면 상대에게는 이름만 보이고 할 일은 안 보인다.
-- 할 일만 옮기면 category_id가 상대가 못 읽는 줄을 가리켜 색도 이름도 안 뜬다.
-- RLS가 정확히 그렇게 막는다. 그래서 화면에서 여러 번 고치지 말고 한 번에 옮긴다.

/**
 * 내 카테고리 하나를 방에 연다. 그 안의 할 일·즐겨찾기가 같이 간다.
 *
 * **방을 여는 일은 연 사람만 한다.** 손님은 자기 카테고리를 남의 방에 얹지 못한다 —
 * 그건 방 안에서 하는 일이 아니라 방을 여는 일이라서 그렇다.
 * 같이 보고 싶으면 그 사람이 제 방을 만들어 나를 부른다.
 */
create or replace function share_category(target uuid, room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare cat categories;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if not exists (select 1 from rooms where id = room and created_by = auth.uid()) then
    raise exception '방을 연 사람만 나눌 수 있습니다';
  end if;

  select * into cat from categories where id = target and deleted_at is null;
  if cat.id is null then
    raise exception '카테고리를 찾을 수 없습니다';
  end if;
  if cat.owner_id is distinct from auth.uid() then
    raise exception '내 카테고리만 나눌 수 있습니다';
  end if;
  -- 카테고리 하나는 방 하나에 속한다. 두 방에 걸치면 할 일이 어느 쪽으로 갈지가 없다.
  if cat.room_id is not null and cat.room_id <> room then
    raise exception '이미 다른 방에서 나누고 있습니다';
  end if;

  -- updated_at을 같이 밀어야 다음 동기화가 이 줄들을 주워간다
  update categories set room_id = room, updated_at = now() where id = target;
  update tasks       set room_id = room, updated_at = now() where category_id = target;
  update presets     set room_id = room, updated_at = now() where category_id = target;
end $$;

/**
 * 도로 개인 것으로 거둔다. **끄는 건 공유를 푸는 것과 같은 일이다.**
 *
 * 안에 든 것은 누가 적었든 다 따라온다 — 방은 내가 연 창문이고,
 * 들어온 사람이 거기에 만들고 고친 것도 **내 카테고리에 한 일**이기 때문이다.
 * 그래서 주인 자리(owner_id)도 카테고리 임자에게 돌려놓는다. 안 그러면
 * 방은 닫혔는데 남의 개인 목록에 이 카테고리를 가리키는 줄만 남는다.
 */
create or replace function unshare_category(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare cat categories;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  select * into cat from categories where id = target;
  if cat.id is null then
    raise exception '카테고리를 찾을 수 없습니다';
  end if;
  if cat.owner_id is distinct from auth.uid() then
    raise exception '내 카테고리만 거둘 수 있습니다';
  end if;

  update categories set room_id = null, updated_at = now() where id = target;
  update tasks
     set room_id = null, owner_id = cat.owner_id, updated_at = now()
   where category_id = target;
  update presets
     set room_id = null, owner_id = cat.owner_id, updated_at = now()
   where category_id = target;
end $$;

-- ─────────────────────── 실시간 ───────────────────────
-- 상대가 체크한 게 바로 넘어오게. 방 단위로 걸러서 받는다.

-- 이미 올라가 있으면 에러가 나므로 삼킨다 (두 번 돌려도 되게)
do $$
declare t text;
begin
  foreach t in array array['tasks', 'shop_items', 'memos', 'categories', 'presets']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;


-- ─── 콕 찌르기 ─────────────────────────────────────────────────
-- 방마다 켜고 끈다 ─────────────────────────────────────────
-- 집에서 오는 콕은 귀엽지만 회사방에서 오는 건 재촉이다.
-- `무엇을 나눌까요` 옆자리에 하나 더 선다.
alter table rooms add column if not exists share_nudge boolean not null default true;


-- ─── 2. 한도는 방마다 · 보내는 사람마다 셋 ───────────────────────
-- **서버가 6시에 도는 일은 없다.** 찌를 때 마지막으로 채워진 시각을 보고,
-- 그게 마지막 아침 6시보다 앞이면 그 자리에서 셋으로 되돌린다.
-- 아무도 안 찌르면 아무 일도 안 일어난다.
--
-- **세는 건 서버가 한다.** 폰에서 세면 앱을 지웠다 깔면 0이 된다.
alter table room_members add column if not exists nudge_left  int not null default 3;
alter table room_members add column if not exists nudge_since timestamptz;

/**
 * 마지막으로 지나온 아침 6시 (Asia/Seoul).
 *
 * **UTC로 세면 하루가 엉뚱한 때 바뀐다.** 그리고 지금이 새벽 3시면
 * 오늘 6시는 아직 안 왔다 — 그때 기준을 오늘 6시로 잡으면 새벽마다 한 번씩 더 채워진다.
 */
create or replace function last_refill()
returns timestamptz
language sql
stable
as $$
  select case
    when (now() at time zone 'Asia/Seoul')::time >= '06:00'
      then date_trunc('day', now() at time zone 'Asia/Seoul') + interval '6 hour'
      else date_trunc('day', now() at time zone 'Asia/Seoul') - interval '18 hour'
  end at time zone 'Asia/Seoul'
$$;


-- ─── 3. 전달함 — 읽으면 지운다 ───────────────────────────────────
/*
 * **기록이 아니라 우편함이다.**
 *
 * 찌른 내역을 쌓지 않기로 한 것과 어긋나 보이지만 아니다 —
 * 이 줄은 받는 사람이 보는 순간 지워진다. 남는 것은 **내 남은 횟수**뿐이다.
 * 푸시(FCM)가 붙기 전까지는 남의 폰을 울릴 길이 없어서, 그때까지 이 함이 그 자리를 맡는다.
 *
 * 보낸 사람 이름은 **그때 그 이름을 그대로 담는다**(done_by와 같은 결).
 * 방을 나간 사람이 보낸 것도 이름은 읽혀야 한다.
 */
create table if not exists nudges (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms on delete cascade,
  to_user    uuid not null references auth.users on delete cascade,
  from_name  text not null,
  task_id    uuid references tasks on delete cascade,
  task_title text not null,
  -- 칩을 그리려고 담는다. 카테고리가 지워져도 줄은 떠야 해서 참조를 안 건다.
  category_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists nudges_to on nudges (to_user, created_at);

alter table nudges enable row level security;

-- 받는 사람만 읽고 지운다. **넣는 길은 아래 함수뿐이다** —
-- 아무나 넣을 수 있으면 한도가 뜻을 잃는다.
drop policy if exists nudges_read on nudges;
create policy nudges_read on nudges for select using (to_user = auth.uid());

drop policy if exists nudges_clear on nudges;
create policy nudges_clear on nudges for delete using (to_user = auth.uid());


-- ─── 4. 보내기 ───────────────────────────────────────────────────
/**
 * 콕 한 번. 남은 횟수를 돌려준다.
 *
 * `to_user`가 있으면 그 사람에게만, 없으면 **방 전체에게**(나는 빼고) 간다.
 * 아무도 안 하는 일을 찌르는 자리가 있어야 해서 그렇다.
 *
 * **한 번 찌르면 한 번 준다.** 방 전체로 나가도 셋 중 하나를 쓴 것이지
 * 사람 수만큼 쓰는 게 아니다 — 그러면 여럿인 방에서는 아무도 못 찌른다.
 */
create or replace function send_nudge(room uuid, task uuid, whom uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_name text;
  left_now int;
  title text;
  cat uuid;
begin
  if me is null then
    raise exception '로그인이 필요합니다';
  end if;

  select display_name into my_name from room_members where room_id = room and user_id = me;
  if my_name is null then
    raise exception '이 방에 없는 사람입니다';
  end if;

  if not exists (select 1 from rooms where id = room and share_nudge) then
    raise exception '이 방은 콕 찌르기를 꺼뒀습니다';
  end if;

  -- 마지막 아침 6시를 안 지났으면 그대로, 지났으면 그 자리에서 채운다
  update room_members
     set nudge_left  = case when nudge_since is null or nudge_since < last_refill() then 3 else nudge_left end,
         nudge_since = case when nudge_since is null or nudge_since < last_refill() then now() else nudge_since end
   where room_id = room and user_id = me
   returning nudge_left into left_now;

  if left_now <= 0 then
    raise exception '오늘은 다 썼어요';
  end if;

  select t.title, t.category_id into title, cat from tasks t where t.id = task;
  if title is null then
    raise exception '없는 할 일입니다';
  end if;

  insert into nudges (room_id, to_user, from_name, task_id, task_title, category_id)
  select room, m.user_id, my_name, task, title, cat
    from room_members m
   where m.room_id = room
     and m.user_id <> me
     and (whom is null or m.user_id = whom);

  if not found then
    raise exception '보낼 사람이 없습니다';
  end if;

  update room_members set nudge_left = nudge_left - 1
   where room_id = room and user_id = me
   returning nudge_left into left_now;

  return left_now;
end $$;

/**
 * 남은 횟수 — **누르기 전에** 보여준다.
 * 누른 뒤에 "다 썼습니다"가 뜨면 쓴 사람만 억울하다.
 *
 * 읽기만 한다. 채우는 것은 실제로 찌를 때 한 번에 일어난다 —
 * 보기만 했는데 값이 바뀌면 그게 배치나 다름없다.
 */
create or replace function nudges_left(room uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when m.nudge_since is null or m.nudge_since < last_refill() then 3
    else m.nudge_left
  end
    from room_members m
   where m.room_id = room and m.user_id = auth.uid()
$$;


-- 실시간으로도 받는다. **표를 만든 뒤에** 올려야 한다 —
-- 위쪽 publication 묶음은 이 표보다 먼저 도는 자리다.
do $$
begin
  alter publication supabase_realtime add table nudges;
exception when duplicate_object then null;
end $$;


-- ─────────────────────── 푸시 ───────────────────────
-- 어느 기기로 보낼까 ───────────────────────────────────────
/*
 * 사람 하나가 폰과 태블릿을 같이 쓸 수 있어서 **기기마다 한 줄**이다.
 * 열쇠는 토큰 그 자체다 — 같은 기기가 토큰을 새로 받으면 그건 새 줄이 맞고,
 * 옛 줄은 FCM이 `UNREGISTERED`로 알려줄 때 지운다.
 *
 * **이 표에는 알림 내용이 안 담긴다.** 어디로 보낼지만 안다.
 */
create table if not exists device_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  platform   text not null default 'android',
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user on device_tokens (user_id);

alter table device_tokens enable row level security;

-- 내 기기만 넣고 고치고 지운다. **남의 토큰은 읽지도 못한다** —
-- 남의 폰으로 보낼 수 있는 값이라 새어 나가면 안 된다.
drop policy if exists device_tokens_own on device_tokens;
create policy device_tokens_own on device_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ─── 2. 보낼 기기 목록 ───────────────────────────────────────────
/**
 * 방금 그 콕을 어디로 보내야 하나.
 *
 * **Edge Function이 아니라 여기서 고른다.** 함수는 열쇠를 들고 있어서
 * 마음만 먹으면 아무 줄이나 읽을 수 있는데, 고르는 규칙을 SQL 한자리에 묶어두면
 * 함수가 할 수 있는 일이 `이 목록으로 보내기` 하나로 줄어든다.
 *
 * 조건이 둘이다.
 *   - **방금 만들어진 콕**(15초)이어야 한다. 옛 줄로는 못 보낸다
 *   - **부르는 사람이 그 방 사람**이어야 한다
 *
 * 그래서 이 함수는 `security definer`인데도 남의 것을 캐낼 자리가 없다.
 */
create or replace function nudge_targets(room uuid, task uuid)
returns table (token text, from_name text, task_title text)
language sql
stable
security definer
set search_path = public
as $$
  select d.token, n.from_name, n.task_title
    from nudges n
    join device_tokens d on d.user_id = n.to_user
   where n.room_id = room
     and n.task_id = task
     and n.created_at > now() - interval '15 seconds'
     and exists (
       select 1 from room_members m
        where m.room_id = room and m.user_id = auth.uid()
     )
$$;

-- ─────────────────────── 곰돌이와 코스튬 ───────────────────────
--
-- 여기 **포인트 잔액 칸이 없다.** 일부러 없다.
-- 담아두면 체크를 풀었을 때 되돌리는 코드를 따로 짜야 하고, 그 코드는 반드시 어딘가에서 틀어진다.
-- tasks에서 파생시켜 그때그때 세면 체크를 풀면 저절로 도로 빠진다.
--
-- 담아두는 것은 둘뿐이다 — **가진 것**과 **지금 입은 것**.
-- 잔액은 `가입 100P + 번 것 − 산 값의 합`이라 이 둘만 있으면 나온다.

-- 누가 체크했나 — **계정으로**. done_by(표시 이름)는 화면에 적는 것이고 이건 세는 것이다.
-- 이름으로 세면 상대가 별명을 바꾼 순간 옛 점수가 남의 것이 된다.
alter table tasks add column if not exists done_by_id uuid references auth.users;

-- 지금 입은 옷과 깐 방. 계정 하나에 한 줄.
create table if not exists gomdori (
  user_id    uuid primary key references auth.users on delete cascade,
  worn_bear  text not null default 'base',
  worn_room  text not null default 'room-base',
  updated_at timestamptz not null default now()
);

/*
 * 파는 것 — 무엇을 얼마에.
 *
 * **앱 코드(src/lib/costumes.ts)에도 같은 목록이 있다.** 일부러 둘이다.
 *   앱   — 앱과 같이 나가는 그림. 그림이 앱 안에 있어야 **상점이 오프라인에서 뜬다**
 *   서버 — 값·이름·파는 중. 값을 앱만 알면 `이 옷 0원이요` 하고 사는 걸 막을 방법이 없다
 *
 * **이름과 파는 중이 여기로 왔다**([상점 채우기](../design/관리자.html)).
 * 옷 한 벌 늘릴 때마다 이 파일을 고쳐 돌리는 건 파는 사람이 할 일이 아니다.
 * 앱은 아직 costumes.ts를 본다 — 값표를 읽어 덮는 것은 앱 쪽 일이고 여기서는 자리만 만든다.
 */
create table if not exists costume_catalog (
  item_key   text primary key,
  -- 'bear' 곰 스타일 · 'room' 방 테마 · 'pose' 세트 완성 보상
  kind       text not null,
  price      int  not null default 0,
  -- 어느 시즌 세트에 딸린 것인가. 비어 있으면 늘 있는 것.
  season     text,
  -- 상점 카드에 그대로 뜨는 이름. 여덟 자를 넘기면 103px 칸에서 잘린다.
  name       text,
  /*
   * 올린 그림이 Storage 어디에 있나 — `<대분류>/<중분류>/<종류>/<코드>.png`.
   * 통 이름(`shop`)은 안 적는다. 통을 옮기면 스물아홉 줄을 다 고쳐야 한다.
   * **비어 있으면 앱이 가진 그림으로 선다.**
   */
  img        text,
  /*
   * **올리자마자 팔지 않는다.** 새로 넣는 것은 숨김으로 들어오고,
   * 관리자가 켜야 상점에 뜬다 — 반쯤 그린 것이 상점에 뜨는 사고를 막는다.
   */
  active     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이미 값표가 있는 DB에도 같은 칸을 단다
alter table costume_catalog add column if not exists name       text;
alter table costume_catalog add column if not exists img        text;
alter table costume_catalog add column if not exists active     boolean not null default false;
alter table costume_catalog add column if not exists created_at timestamptz not null default now();
alter table costume_catalog add column if not exists updated_at timestamptz not null default now();

-- 가진 것 — 산 것과 받은 것.
-- **산 값을 같이 박아둔다.** 값이 나중에 바뀌어도 이미 산 것은 그때 값으로 남아야
-- 잔액이 뒤늦게 흔들리지 않는다.
create table if not exists costume_owned (
  user_id  uuid not null references auth.users on delete cascade,
  item_key text not null,
  price    int  not null default 0,
  got_at   timestamptz not null default now(),
  primary key (user_id, item_key)
);

-- ─── 값표의 씨앗 ────────────────────────────────────────────────
/*
 * **앱이 그림을 갖고 있는 여섯 줄.** 여기서 심고, 다시는 안 덮는다.
 *
 * 한때 스물아홉 줄이 여기 있었다 — 모자 곰·피크닉 룸·할로윈 세트 …. 다 걷어냈다.
 * **이름과 값만 있고 그림이 없는 줄**이었고, 그런 줄은 상점 격자에 회색 네모로 떠서
 * `아직 안 그렸어요`가 아니라 **파는 물건으로 읽힌다** — 걸쳐봐도 안 바뀌고
 * 300P를 치른 뒤에도 안 바뀐다([2026-08-26](../sql/2026-08-26_빈-껍데기-지우고-코스튬-셋.sql)).
 *
 * 그래서 **여기 심는 것은 앱과 같이 나가는 그림이 있는 것뿐이다.**
 * `public/gomdori/`에 파일이 있는 여섯이고, `img`를 비워두면 앱이 제 그림으로 선다.
 * 앞으로 늘어나는 것은 여기가 아니라 [상점 채우기](../design/관리자.html)에서 들어온다 —
 * 그림을 Storage에 올리고 코드는 번호표로 딴다.
 *
 * 부딪히면 **안 덮는다.** 값표의 주인이 이 파일에서 관리자 화면으로 넘어갔고,
 * 덮으면 관리자가 고쳐놓은 값과 이름이 schema.sql을 한 번 돌릴 때마다 되돌아간다.
 */
insert into costume_catalog (item_key, kind, price, season, name, active) values
  ('base',      'bear',   0, null, '기본 곰돌이', true),
  ('rabbit',    'bear', 300, null, '곰토끼',     true),
  ('dragon',    'bear', 350, null, '곰드래곤',   true),
  ('princess',  'bear', 400, null, '공주 곰',    true),
  ('wizard',    'bear', 400, null, '마법사 곰',  true),

  ('room-base', 'room',   0, null, '기본 룸',    true)
on conflict (item_key) do nothing;

/*
 * 시즌 세트 — **관리자가 짓고 이름 붙인다.**
 *
 * 시즌 밑은 층이 하나 더 있다.
 *
 *   시즌 ─ 계절 ─ 봄꽃 세트 · 물놀이 세트 · 여름휴가 세트
 *        └ 기념일 ─ 할로윈 세트 · 크리스마스 세트
 *
 * **중분류도 세트도 늘어난다.** 중분류는 [[shop_family]]에, 세트는 여기에 한 줄씩.
 * 물건은 세트를 고르고, 중분류는 그 세트를 따라간다(아래 `catalog_family` 트리거) —
 * 물건마다 중분류를 고르게 두면 할로윈 곰은 기념일인데 할로윈 방은 계절인 일이 생긴다.
 *
 * 세트가 **열리는 조건은 여기 안 적는다.** 곰 하나·방 하나·소품 하나가 값표에 다 차면
 * 열린 것이고, 그건 값표를 세면 나온다. 적어두면 값표와 어긋날 자리가 하나 더 생긴다.
 */
create table if not exists costume_season (
  season_key text primary key,
  name       text not null,
  -- 상점 칩이 서는 차례
  ord        int  not null default 0,
  note       text,
  created_at timestamptz not null default now()
);

/*
 * **씨앗을 안 심는다.** 물놀이·할로윈·크리스마스·봄꽃·여름휴가 다섯이 여기 있었는데
 * 셋씩 열다섯 줄이 다 이름뿐이라 값표와 같이 걷어냈다.
 *
 * 세트는 이제 관리자가 짓는다 — 새로 짓는 것은 `s000001`부터 번호표로 딴다.
 * 옛 `s-swim` 같은 손으로 적은 열쇠는 그걸로 마지막이다.
 */

-- ─── 대분류와 중분류 ────────────────────────────────────────────
/*
 * 파는 것이 어느 칩 아래 서는가. **두 층이다.**
 *
 *   대분류 ─ 꾸미기 · 시즌          상점 위 칩
 *     중분류 ─ 일상 · 코스튬 …      그 아래 칩
 *
 * 전에는 `family text` 칸 하나에 `daily`/`costume`을 적어뒀다. 그걸 걷어낸다 —
 * **중분류는 관리자가 늘리는 것**이라 칸에 적어두면 늘릴 때마다 이 파일을 고쳐야 한다.
 *
 * `방`과 `내 옷장`은 여기 안 든다. **가로지르는 버튼**이라서다 —
 * 방은 `kind = 'room'`이고 내 옷장은 `costume_owned`다. 둘 다 대분류를 가로질러 고른다.
 */
create table if not exists shop_group (
  -- **열쇠가 곧 폴더 이름이다.** 그림이 `shop/<이 값>/…` 밑에 쌓인다.
  group_key text primary key check (group_key ~ '^[a-z][a-z0-9-]{1,23}$'),
  name      text not null,
  ord       int  not null default 0
);

/*
 * 중분류 — **관리자가 늘린다.**
 *
 * 이름과 **폴더를 같이 받는다.** 폴더를 따로 안 받으면 `기념일`을 무엇으로 적어
 * 폴더를 만들지 정할 길이 없다. 그렇다고 이름과 폴더를 두 칸에 나눠 담으면
 * 이름을 고칠 때 폴더가 따라 움직여야 하나 말아야 하나가 매번 물음이 된다.
 *
 * 그래서 **열쇠가 곧 폴더다.** 관리자는 `기념일`과 `holiday` 둘을 적고,
 * 뒤엣것은 한 번 정하면 안 바뀐다 — 이미 쌓인 그림이 그 이름 밑에 있다.
 */
create table if not exists shop_family (
  family_key text primary key check (family_key ~ '^[a-z][a-z0-9-]{1,23}$'),
  group_key  text not null references shop_group on delete restrict,
  name       text not null,
  ord        int  not null default 0,
  -- 끈 중분류는 상점 칩에서 빠진다. 그 안의 물건은 각자 `active`를 따른다.
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists shop_family_group on shop_family (group_key, ord);

insert into shop_group (group_key, name, ord) values
  ('deco',   '꾸미기', 1),
  ('season', '시즌',   2)
on conflict (group_key) do nothing;

insert into shop_family (family_key, group_key, name, ord, active) values
  ('daily',    'deco',   '일상',   1, true),
  ('costume',  'deco',   '코스튬', 2, true),
  /*
   * 룸은 **꺼진 채로 심는다.** 그림이 쌓일 폴더는 있어야 하는데
   * 상점에서는 `방` 버튼으로 따로 가니 중분류 칩으로 또 세우면 같은 것이 두 번 뜬다.
   * 켜고 싶으면 관리자가 켠다.
   */
  ('room',     'deco',   '룸',     3, false),
  ('seasonal', 'season', '계절',   1, true),
  ('holiday',  'season', '기념일', 2, true)
on conflict (family_key) do nothing;

-- ─── 물건이 어느 중분류인가 ─────────────────────────────────────
alter table costume_catalog add column if not exists family_key text references shop_family;

-- 옛 `family` 칸에 있던 것을 옮긴다. 값이 같아서 그대로 들어간다.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name = 'costume_catalog' and column_name = 'family') then
    execute 'update costume_catalog set family_key = family where family_key is null and family is not null';
    execute 'alter table costume_catalog drop column family';
  end if;
end $$;

/*
 * 시즌 물건의 중분류는 **세트가 정한다.** 물건마다 따로 적게 두면
 * 할로윈 곰은 기념일인데 할로윈 방은 계절인 일이 생긴다.
 */
alter table costume_season add column if not exists family_key text references shop_family;

-- 심어두는 세트가 없어 여기서 채울 것도 없다. 관리자가 지을 때 같이 고른다.

/*
 * 중분류는 **한 번만** 정해준다. 이미 값이 든 줄은 안 건드린다 —
 * 관리자가 옮겨둔 것을 schema.sql이 되돌리면 안 된다.
 */
update costume_catalog set family_key = 'daily'
 where kind = 'bear' and season is null and family_key is null
   and item_key in ('base');

update costume_catalog set family_key = 'costume'
 where kind = 'bear' and season is null and family_key is null
   and item_key in ('rabbit', 'dragon', 'princess', 'wizard');

update costume_catalog set family_key = 'room'
 where kind = 'room' and season is null and family_key is null;

/*
 * 시즌 물건은 제 세트를 따라간다. 넣을 때도 고칠 때도 여기서 맞춰주니
 * **관리자가 세트만 고르면 중분류는 안 물어봐도 된다.**
 */
create or replace function sync_catalog_family()
returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.season is not null then
    select family_key into new.family_key from costume_season where season_key = new.season;
  end if;
  new.updated_at = now();
  return new;
end $fn$;

drop trigger if exists catalog_family on costume_catalog;
create trigger catalog_family before insert or update on costume_catalog
  for each row execute function sync_catalog_family();

-- 이미 들어 있던 시즌 물건들도 한 번 맞춰준다
update costume_catalog c set family_key = s.family_key
  from costume_season s
 where c.season = s.season_key and c.family_key is distinct from s.family_key;

-- ─── 코드는 숫자로 딴다 ─────────────────────────────────────────
/*
 * 새로 올리는 것의 코드는 `0000001`부터 하나씩 올라간다.
 *
 * 전에는 이름에서 지었다(`모자 곰` → `b-hat`). 그러면 **이름을 고칠 때마다
 * 코드를 고쳐야 하나**가 따라오고, 고치면 이미 산 사람의 줄이 가리킬 데를 잃는다.
 * 숫자는 이름과 아무 상관이 없어서 그 물음이 아예 없다.
 *
 * **이미 있는 `hat` · `room-cafe`는 안 바꾼다.** 바꾸는 순간
 * `costume_owned`와 `gomdori.worn_bear`가 없는 것을 가리킨다.
 * 옛 이름과 새 숫자가 섞여 있는 건 보기 싫지만, 섞인 채로 도는 게 맞다.
 */
create sequence if not exists costume_code_seq start 1;

create or replace function next_item_code()
returns text language sql set search_path = public as $fn$
  select lpad(nextval('costume_code_seq')::text, 7, '0');
$fn$;

alter table costume_catalog alter column item_key set default next_item_code();

/*
 * **번호표를 뽑을 수 있게 열어준다.** 이걸 빼먹으면 관리자가 코드를 손으로 적지 않는 한
 * `permission denied for sequence`로 막힌다 — RLS가 아니라 권한에서 막히는 거라
 * 화면에는 `왜 안 되는지 알 수 없는 오류`로 뜬다.
 *
 * Supabase 밖(내려받은 postgres 같은 데)에는 이 역할이 없어서 넘어가게 뒀다.
 */
do $$
begin
  grant usage, select on sequence costume_code_seq to authenticated;
exception when undefined_object or insufficient_privilege then
  raise notice 'authenticated 역할이 없어 번호표 권한은 건너뛴다';
end $$;

/*
 * 세트 열쇠도 손으로 안 적는다. `s000001`부터 하나씩 올라간다.
 *
 * 물건 코드와 **번호표를 따로 쓴다.** 한 통에서 뽑으면 물건 스물아홉 개를 넣은 뒤
 * 만든 세트가 `0000030`이 되어 물건 코드처럼 읽힌다. 앞에 `s`를 붙이는 것도 같은 까닭이다.
 *
 * **이미 있는 `s-swim`·`s-hall`은 안 바꾼다** — 값표의 `season`이 그걸 가리키고 있다.
 */
create sequence if not exists costume_season_seq start 1;

create or replace function next_season_code()
returns text language sql set search_path = public as $fn$
  select 's' || lpad(nextval('costume_season_seq')::text, 6, '0');
$fn$;

alter table costume_season alter column season_key set default next_season_code();

do $$
begin
  grant usage, select on sequence costume_season_seq to authenticated;
exception when undefined_object or insufficient_privilege then
  raise notice 'authenticated 역할이 없어 세트 번호표 권한은 건너뛴다';
end $$;

/*
 * 세트의 중분류는 **시즌 밑에 있는 것이어야 한다.**
 *
 * 꾸미기 밑의 중분류를 세트에 달면 그 세트의 물건들이 트리거를 타고
 * `꾸미기 > 일상`으로 끌려간다 — 시즌 물건인데 시즌 칩에서 사라진다.
 * 상점에서 물건이 통째로 없어지는 꼴이라 여기서 막는다.
 */
create or replace function season_family_guard()
returns trigger language plpgsql set search_path = public as $fn$
declare g text;
begin
  if new.family_key is null then return new; end if;
  select group_key into g from shop_family where family_key = new.family_key;
  if g is distinct from 'season' then
    raise exception '세트의 중분류는 시즌 밑에 있어야 합니다 (%)', new.family_key;
  end if;
  return new;
end $fn$;

drop trigger if exists season_family on costume_season;
create trigger season_family before insert or update on costume_season
  for each row execute function season_family_guard();

/*
 * 값표의 `season`은 **있는 세트를 가리켜야 한다.** 없는 세트를 가리키면
 * 트리거가 중분류를 못 찾아 비워버리고, 그 물건은 어느 칩에도 안 선다.
 *
 * 이미 어긋난 줄이 있는 DB에서는 걸지 않고 넘어간다 — 여기서 멈추면
 * 나머지가 다 안 들어간다. 그때는 `notice`가 무엇을 봐야 하는지 알려준다.
 */
do $$
begin
  if exists (
    select 1 from costume_catalog c
     where c.season is not null
       and not exists (select 1 from costume_season s where s.season_key = c.season)
  ) then
    raise notice '없는 세트를 가리키는 물건이 있어 이음줄을 안 걸었다';
  else
    alter table costume_catalog
      add constraint costume_catalog_season_fk
      foreign key (season) references costume_season (season_key) on update cascade;
  end if;
exception when duplicate_object or duplicate_table then null;
end $$;

-- ─── 그림이 쌓이는 자리 ─────────────────────────────────────────
/*
 * `shop/<대분류>/<중분류>/<종류>/<코드>.png`
 *
 *   shop/deco/daily/gomdori/0000001.png
 *   shop/deco/room/background/0000020.png
 *   shop/season/holiday/prop/0000016.png
 *
 * **폴더가 셋인 까닭**은 그림이 오는 길이 셋이라서다 — 대분류로 시즌을 통째로 열고 닫고,
 * 중분류로 한 칩을 채우고, 종류로 그리는 사람이 다르다(곰은 캐릭터, 방은 배경).
 * 한 통에 다 부으면 스물아홉 장이 넘어가는 순간 무엇이 무엇인지 이름으로만 가려야 한다.
 *
 * 앱은 `img`에 적힌 것을 그대로 쓴다. 이 함수는 **관리자가 올릴 자리를 고를 때** 쓴다.
 */
create or replace function shop_folder(item text)
returns text language sql stable set search_path = public as $fn$
  select g.group_key || '/' || f.family_key || '/' ||
         case c.kind when 'bear' then 'gomdori'
                     when 'room' then 'background'
                     else 'prop' end
    from costume_catalog c
    join shop_family f on f.family_key = c.family_key
    join shop_group  g on g.group_key  = f.group_key
   where c.item_key = item;
$fn$;

-- ─── 얼마나 벌었나 ──────────────────────────────────────────────
/*
 * | 조건 | 보상 |
 * |---|---|
 * | 할 일 하나 **최초** 완료 | +5P |
 * | 하루에 받는 끝 | **30P** (여섯 개) |
 * | 그 주에 10개 | +20P |
 * | 그 주에 20개 | 추가 +30P |
 * | 그 주에 30개 | 추가 +50P |
 * | 첫 완료 같은 업적 | 한 번뿐인 별도 보상 |
 *
 * **한 줄이 한 번이다.** 준 것을 여기 적어두고 **다시는 안 준다** —
 * 그래서 체크를 풀었다 다시 눌러도 두 번 안 들어오고, 잘못 누른 것을 풀면
 * 값은 남지만 **더 얻을 것도 없다.** 되돌리는 코드가 없어서 틀어질 데가 없다.
 *
 * 볼 때마다 다시 세는 방식은 접었다. 그러면 오후에 할 일 하나를 적었다고
 * 아침에 본 포인트가 깎인다 — 이미 옷을 샀으면 잔액이 음수까지 간다.
 */
create table if not exists point_log (
  user_id uuid not null references auth.users on delete cascade,
  -- 'task' 할 일 하나 · 'week10' 'week20' 'week30' 주간 · 'first' 업적
  kind    text not null,
  -- 무엇 때문인지. 할 일 id · 그 주 월요일 · 업적 열쇠. **같은 것으로 두 번 안 준다.**
  ref     text not null,
  amount  int  not null,
  -- 어느 날 몫인가. 하루 상한을 이걸로 센다.
  on_date date not null,
  got_at  timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

/*
 * 아직 안 준 것을 채워 넣는다. 이미 준 줄은 안 건드린다.
 * 며칠 만에 앱을 켜도 그 사이 것이 이때 한꺼번에 들어온다.
 *
 * security definer라 RLS를 안 타니 **볼 수 있는 할 일인지 여기서 직접 가린다.**
 */
create or replace function stamp_points()
returns void language plpgsql security definer set search_path = public as $fn$
declare me uuid := auth.uid();
begin
  if me is null then return; end if;

  /*
   * 1) 할 일 하나에 5P — **하루 30P까지.**
   * 그 날 이미 준 것에 이번 순번을 더해 30을 넘지 않는 데까지만 넣는다.
   * 순번은 고친 때 순이라 먼저 끝낸 것이 먼저 값을 받는다.
   */
  insert into point_log (user_id, kind, ref, amount, on_date)
  select me, 'task', f.id::text, 5, f.done_on
    from (
      select t.id, t.done_on,
             row_number() over (partition by t.done_on order by t.updated_at, t.id) as seq
        from tasks t
       where t.done
         and t.deleted_at is null
         and t.done_on is not null
         and t.done_by_id = me
         and (t.owner_id = me or is_member(t.room_id))
         and not exists (
           select 1 from point_log p
            where p.user_id = me and p.kind = 'task' and p.ref = t.id::text
         )
    ) f
    left join (
      select on_date, sum(amount) as given
        from point_log where user_id = me and kind = 'task' group by on_date
    ) g on g.on_date = f.done_on
   where coalesce(g.given, 0) + f.seq * 5 <= 30
  on conflict do nothing;

  /*
   * 2) 주간 — 그 주에 값을 받은 할 일이 10·20·30개를 넘을 때마다 한 번씩.
   * 주는 **월요일에 시작한다**(`date_trunc('week')`). 앱 설정의 주 시작과 따로다 —
   * 화면을 어떻게 보든 한 주의 길이는 같아야 값이 흔들리지 않는다.
   */
  insert into point_log (user_id, kind, ref, amount, on_date)
  select me, s.kind, w.wk::text, s.amount, w.wk
    from (
      select date_trunc('week', on_date)::date as wk, count(*) as n
        from point_log where user_id = me and kind = 'task'
       group by 1
    ) w
    cross join (values ('week10', 10, 20), ('week20', 20, 30), ('week30', 30, 50))
              as s(kind, need, amount)
   where w.n >= s.need
  on conflict do nothing;

  -- 3) 업적 — 첫 완료. 한 번뿐이라 ref가 열쇠 그 자체다.
  insert into point_log (user_id, kind, ref, amount, on_date)
  select me, 'first', 'first-task', 50, min(on_date)
    from point_log where user_id = me and kind = 'task'
   having count(*) > 0
  on conflict do nothing;
end $fn$;

/*
 * **안 사도 갖는 것** — 값이 0인 것.
 *
 * 기본 곰돌이와 기본 룸이다. 값이 0이라 사려면 살 수는 있었는데, 그러면 갓 가입한
 * 사람의 옷장이 **비어 있고** 자기가 지금 입고 있는 곰이 상점에 `구매하기`로 떠 있다 —
 * **입고 있는 것을 사라고 하는 꼴**이라 0P라도 말이 안 된다.
 *
 * 열쇠 둘을 여기 적지 않고 **`값이 0인 것`으로 고른다.** 적어두면 나중에 기본 룸을
 * 다른 것으로 바꿀 때 이 함수도 같이 고쳐야 하는데, 그 날 잊는다.
 * 값이 0이라는 것이 곧 `안 받고 준다`는 뜻이라 규칙과 뜻이 같다.
 *
 * 포즈는 뺀다. 포즈도 값이 0이지만 **세트를 다 모아야 오는 것**이라
 * 여기 들면 아무나 그냥 갖게 된다 — 그건 `grant_poses()`가 따로 본다.
 *
 * 앱에도 같은 것이 있다(`FREEBIES`). 거기 한 번 더 두는 까닭은 **로그인 전과
 * 서버를 못 읽었을 때**를 메우기 위해서다 — 그 두 자리에서도 옷장은 안 비어야 한다.
 */
create or replace function grant_free()
returns void language sql security definer set search_path = public as $fn$
  insert into costume_owned (user_id, item_key, price)
  select auth.uid(), c.item_key, 0
    from costume_catalog c
   where c.price = 0
     and c.kind <> 'pose'
     and c.active
  on conflict (user_id, item_key) do nothing;
$fn$;

/*
 * 지금 얼마 있나 — **가입 100P + 받은 것 − 산 값의 합.**
 *
 * 셈하기 전에 안 준 것부터 채운다. 앱이 따로 부를 자리를 안 만들어도
 * 잔액을 볼 때마다 그 사이 것이 들어온다.
 *
 * 가입 100P를 어디에도 안 적어둔다. 계정이 있으면 받은 것이니 늘 더하면 된다.
 */
create or replace function my_points()
returns int language plpgsql security definer set search_path = public as $fn$
begin
  perform stamp_points();
  -- 안 사도 갖는 것부터. 세트를 세기 전에 넣어야 값이 0인 시즌 물건도 제대로 센다.
  perform grant_free();
  /*
   * 세트도 여기서 본다. 전에는 **살 때만** 봤는데, 그러면 소품이 숨김인 채로 세트를
   * 다 모은 사람은 관리자가 켜준 뒤에도 **뭔가 하나 더 사기 전까지** 못 받는다.
   */
  perform grant_poses();
  return 100
    + coalesce((select sum(amount)::int from point_log     where user_id = auth.uid()), 0)
    - coalesce((select sum(price)::int  from costume_owned where user_id = auth.uid()), 0);
end $fn$;

-- ─── 사기 ───────────────────────────────────────────────────────
/*
 * 세트를 다 모으면 포즈가 들어온다.
 * **살 때마다 확인한다** — 곰을 먼저 샀든 방을 먼저 샀든 그 순간 채워져야 한다.
 */
create or replace function grant_poses()
returns void language sql security definer set search_path = public as $fn$
  insert into costume_owned (user_id, item_key, price)
  select auth.uid(), p.item_key, 0
    from costume_catalog p
   where p.kind = 'pose'
     and p.season is not null
     -- 숨김인 소품은 아직 안 준다. 켜지면 다음에 잔액을 볼 때 들어온다.
     and p.active
     /*
      * **살 것이 하나라도 있는 세트여야 한다.** 이 줄이 없으면 소품만 덜렁 올려둔
      * 새 세트가 `다 모았다`로 읽혀서 모두에게 그냥 들어간다 —
      * 관리자가 곰을 올리기 전에 소품부터 올리면 바로 그 꼴이 된다.
      */
     and exists (
       select 1 from costume_catalog n2
        where n2.season = p.season and n2.kind <> 'pose'
     )
     -- 숨김이 된 곰·방도 그대로 센다. 빼면 하나 숨기는 순간 세트가 거저 열린다.
     and not exists (
       select 1 from costume_catalog n
        where n.season = p.season
          and n.kind <> 'pose'
          and n.item_key not in (
            select item_key from costume_owned where user_id = auth.uid()
          )
     )
  on conflict (user_id, item_key) do nothing;
$fn$;

/*
 * **값은 서버가 정한다.** 앱이 값을 같이 보내면 `이 옷 0원이요`를 막을 수가 없다.
 * 포즈는 파는 물건이 아니라 여기서 못 산다 — 세트를 다 모으면 위에서 저절로 들어온다.
 */
create or replace function buy_costume(item text)
returns int language plpgsql security definer set search_path = public as $fn$
declare
  cost  int;
  sort  text;
  live  boolean;
  purse int;
begin
  select price, kind, active into cost, sort, live
    from costume_catalog where item_key = item;
  if cost is null then
    raise exception '없는 코스튬입니다';
  end if;
  if sort = 'pose' then
    raise exception '포즈는 세트를 다 모으면 드립니다';
  end if;
  -- 숨김으로 둔 것은 상점에 안 뜨지만, **열쇠만 알면 부를 수 있는 자리**라 여기서도 막는다
  if not live then
    raise exception '아직 파는 물건이 아닙니다';
  end if;

  select my_points() into purse;
  if purse < cost then
    raise exception '포인트가 모자랍니다';
  end if;

  insert into costume_owned (user_id, item_key, price)
       values (auth.uid(), item, cost)
  on conflict (user_id, item_key) do nothing;

  perform grant_poses();
  return my_points();
end $fn$;

-- ─── 누가 채우나 ────────────────────────────────────────────────
/*
 * **상점을 채우는 사람.** 시안의 `아직 안 정한 것` 첫 줄에 있던 물음의 답이다.
 *
 * 역할 칸을 어딘가에 하나 더 다는 대신 표를 따로 뒀다. `auth.users`에 칸을 붙이면
 * Supabase가 관리하는 표를 우리가 건드리는 것이 되고, `room_members.role`에 얹으면
 * **방 안의 역할과 상점의 역할이 한 칸에 섞인다** — 방 주인은 상점과 아무 상관이 없다.
 *
 * **이 표에 넣는 길은 앱에 없다.** 여기 SQL Editor에서 손으로 넣는다 —
 * 관리자를 앱에서 늘릴 수 있게 하면 관리자 하나가 새면 상점 전체가 샌다.
 *
 *   insert into shop_admins (user_id)
 *   select id from auth.users where email = '내메일@example.com'
 *   on conflict do nothing;
 */
create table if not exists shop_admins (
  user_id  uuid primary key references auth.users on delete cascade,
  added_at timestamptz not null default now()
);

/*
 * 정책 안에서 `shop_admins`를 그냥 조회하면 그 표의 정책이 다시 불린다.
 * `is_member`와 같은 까닭으로 `security definer`로 감싼다.
 */
create or replace function is_shop_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from shop_admins where user_id = auth.uid());
$fn$;

/*
 * 그림 두는 곳 — 통 하나, 파일 이름은 코드 그대로 `shop/<코드>.png`.
 * **표의 열쇠와 파일 이름이 같아야** 어느 그림이 어느 물건인지 대조할 일이 없다.
 *
 * 통은 열어둔다(public). 상점 그림은 숨길 것이 아니고, 닫아두면 앱이 볼 때마다
 * 서명한 주소를 받아와야 해서 상점 격자 스물아홉 칸에 요청이 스물아홉 번 붙는다.
 *
 * Storage는 우리 표가 아니라 **Supabase 것**이라 권한이 모자랄 수 있다.
 * 막히면 멈추지 않고 넘어간다 — 대시보드에서 손으로 만들면 되는 일이다.
 */
do $$
begin
  insert into storage.buckets (id, name, public) values ('shop', 'shop', true)
  on conflict (id) do nothing;

  drop policy if exists "상점 그림은 누구나 본다"   on storage.objects;
  drop policy if exists "상점 그림은 관리자가 올린다" on storage.objects;
  drop policy if exists "상점 그림은 관리자가 바꾼다" on storage.objects;

  create policy "상점 그림은 누구나 본다" on storage.objects
    for select using (bucket_id = 'shop');
  create policy "상점 그림은 관리자가 올린다" on storage.objects
    for insert with check (bucket_id = 'shop' and is_shop_admin());
  create policy "상점 그림은 관리자가 바꾼다" on storage.objects
    for update using (bucket_id = 'shop' and is_shop_admin());
exception when insufficient_privilege then
  raise notice 'shop 통은 대시보드 Storage에서 만들어 주세요 — public, 관리자만 쓰기';
end $$;

-- ─── RLS ────────────────────────────────────────────────────────
alter table point_log       enable row level security;
alter table gomdori         enable row level security;
alter table costume_owned   enable row level security;
alter table costume_catalog enable row level security;
alter table costume_season  enable row level security;
alter table shop_admins     enable row level security;
alter table shop_group      enable row level security;
alter table shop_family     enable row level security;

drop policy if exists "내 것만"     on gomdori;
drop policy if exists "내가 넣는다" on gomdori;
drop policy if exists "내가 고친다" on gomdori;
create policy "내 것만"     on gomdori for select using (user_id = auth.uid());
create policy "내가 넣는다" on gomdori for insert with check (user_id = auth.uid());
create policy "내가 고친다" on gomdori for update using (user_id = auth.uid());

/*
 * 가진 것은 **읽기만** 열어둔다. 넣는 길은 위 buy_costume 하나뿐이다 —
 * insert를 열면 잔액을 안 보고 그냥 넣을 수 있다.
 */
drop policy if exists "내 것만" on costume_owned;
create policy "내 것만" on costume_owned for select using (user_id = auth.uid());

/*
 * 받은 것도 **읽기만** 열어둔다. 넣는 길은 stamp_points 하나뿐이다 —
 * insert를 열면 아무 값이나 적어 넣을 수 있다.
 */
drop policy if exists "내 것만" on point_log;
create policy "내 것만" on point_log for select using (user_id = auth.uid());

/*
 * 값표 — **파는 것만 보인다.** 숨김으로 둔 것은 관리자에게만 보인다.
 * 전에는 누구나 다 봤다. 그때는 값표가 앱과 같은 목록이라 새로 들어올 것이 없었고,
 * 지금은 **아직 안 그린 것이 여기 쌓인다** — 크리스마스 옷이 시월에 목록으로 새면
 * 시즌을 여는 재미가 그날로 없어진다.
 */
drop policy if exists "누구나 본다"     on costume_catalog;
drop policy if exists "파는 것만 보인다" on costume_catalog;
drop policy if exists "관리자가 올린다"  on costume_catalog;
drop policy if exists "관리자가 고친다"  on costume_catalog;
create policy "파는 것만 보인다" on costume_catalog
  for select using (active or is_shop_admin());
create policy "관리자가 올린다" on costume_catalog
  for insert with check (is_shop_admin());
create policy "관리자가 고친다" on costume_catalog
  for update using (is_shop_admin());
/*
 * **지우는 정책은 일부러 없다.** 산 사람의 `costume_owned`에 열쇠가 남아 있어서,
 * 값표에서 줄을 빼면 그 사람의 옷이 이름 없는 것이 된다.
 * 그만 파는 길은 `active`를 끄는 것 하나다.
 */

/*
 * 대분류와 중분류 — 누구나 읽는다. 상점 칩이 이걸로 서니 안 보이면 화면이 빈다.
 * **끈 중분류(`active = false`)까지 보인다** — 칩에서 뺄지는 앱이 정할 일이고,
 * 여기서 감추면 이미 그 중분류에 든 물건이 어디 것인지 앱이 모르게 된다.
 */
drop policy if exists "누구나 본다"   on shop_group;
drop policy if exists "관리자가 고친다" on shop_group;
create policy "누구나 본다"   on shop_group for select using (true);
create policy "관리자가 고친다" on shop_group for update using (is_shop_admin());

drop policy if exists "누구나 본다"   on shop_family;
drop policy if exists "관리자가 짓는다" on shop_family;
drop policy if exists "관리자가 고친다" on shop_family;
create policy "누구나 본다"   on shop_family for select using (true);
create policy "관리자가 짓는다" on shop_family for insert with check (is_shop_admin());
create policy "관리자가 고친다" on shop_family for update using (is_shop_admin());
/*
 * **대분류는 못 늘린다.** insert 정책이 없다 — 꾸미기와 시즌 둘이 상점 칩의 뼈대이고,
 * 셋째가 생기면 화면부터 다시 그려야 한다. 늘릴 일이 생기면 그때 SQL로 넣는다.
 *
 * 중분류도 **지우는 정책은 없다.** 든 물건이 가리킬 데를 잃는다 — `active`를 끈다.
 */

/*
 * 세트 — 누구나 읽고 **관리자가 짓는다.** 이름도 차례도 여기서 바꾼다.
 * 지우는 정책은 없다. 값표의 `season`이 가리키고 있어서,
 * 빼면 그 물건들이 어느 칩에도 안 선다.
 */
drop policy if exists "누구나 본다"   on costume_season;
drop policy if exists "관리자가 짓는다" on costume_season;
drop policy if exists "관리자가 고친다" on costume_season;
create policy "누구나 본다"   on costume_season for select using (true);
create policy "관리자가 짓는다" on costume_season for insert with check (is_shop_admin());
create policy "관리자가 고친다" on costume_season for update using (is_shop_admin());

/*
 * 관리자 명단은 **자기 줄만** 보인다 — 앱이 `나는 관리자인가`를 물어볼 자리다.
 * 넣고 빼는 정책은 없다. 그건 SQL Editor에서 손으로 하는 일이다.
 */
drop policy if exists "나인지만 본다" on shop_admins;
create policy "나인지만 본다" on shop_admins for select using (user_id = auth.uid());
