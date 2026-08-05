-- 할 일 앱 2단계 스키마
-- Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 한 번 실행하면 된다.
--
-- 설계 두 가지만 미리 말해둔다.
--
-- 1) 지우는 대신 deleted_at을 단다.
--    두 기기가 같이 쓰면 "지웠다"도 전해져야 한다. 진짜로 지워버리면
--    상대 기기에는 그 줄이 그냥 남아 있다가 다음 동기화 때 되살아난다.
--
-- 2) 충돌은 항목 단위로 updated_at이 늦은 쪽이 이긴다.
--    목록을 통째로 덮어쓰지 않는다 — 상대가 방금 체크한 게 사라지면 안 된다.

-- ───────────────────────── 방 ─────────────────────────

-- 로그인 계정은 여기서 만들지 않는다. Supabase가 auth.users에 알아서 넣는다.
-- 아래 테이블들은 그걸 참조만 한다.

create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- 초대 링크에 실리는 값. 이름이 곧 열쇠라 짐작하기 어렵게 랜덤으로 만든다.
  -- uuid에서 하이픈만 뺀다 — pgcrypto 같은 확장을 안 써도 되고 주소에서도 안 깨진다.
  join_code  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now()
);

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
  deleted_at timestamptz
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
  deleted_at   timestamptz
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
  deleted_at   timestamptz
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
  deleted_at timestamptz
);

-- 메모 — 흘러가지 않는 종이. 제목 칸은 없다 (첫 줄이 제목 노릇을 한다).
create table if not exists memos (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references rooms on delete cascade,
  owner_id   uuid references auth.users,
  text       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
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
-- 초대 코드를 아는 사람은 그 방 사람이 아니어도 들어갈 수 있어야 하는데,
-- RLS만으로는 그게 안 된다 (아직 멤버가 아니니 방이 보이지 않는다).
-- 그래서 이 두 개만 security definer로 열어둔다.

create or replace function create_room(room_name text, me text)
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

  insert into rooms (name, created_by) values (room_name, auth.uid())
  returning * into made;

  insert into room_members (room_id, user_id, display_name, role)
  values (made.id, auth.uid(), me, 'owner');

  return made;
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

  select * into target from rooms where join_code = code;
  if target.id is null then
    raise exception '초대 링크가 맞지 않습니다';
  end if;

  insert into room_members (room_id, user_id, display_name)
  values (target.id, auth.uid(), me)
  on conflict (room_id, user_id) do update set display_name = excluded.display_name;

  return target;
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
