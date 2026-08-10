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
  room_id    uuid references rooms on delete cascade,
  owner_id   uuid references auth.users,
  text       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users
);

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
drop policy if exists "방 사람이 방 이름을 고친다" on rooms;
create policy "방 사람이 방 이름을 고친다" on rooms
  for update using (is_member(id));

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

  select json_build_object(
    'id', target.id,
    'name', target.name,
    'color', target.color,
    'owner', (select display_name from room_members
              where room_id = target.id and user_id = target.created_by),
    'members', (select coalesce(json_agg(display_name order by joined_at), '[]'::json)
                from room_members where room_id = target.id),
    'count', (select count(*) from room_members where room_id = target.id)
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
  update memos      set room_id = null, owner_id = keeper, updated_at = now() where room_id = room;
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
  update memos      set owner_id = heir, updated_at = now() where room_id = room;

  update rooms set created_by = heir where id = room;
  update room_members set role = 'owner'  where room_id = room and user_id = heir;
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
