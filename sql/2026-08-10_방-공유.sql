-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-10 · 방 공유
--
-- 1단계 스키마가 이미 올라가 있는 DB에 **얹는 부분만** 모았다.
-- Supabase → SQL Editor 에 통째로 붙여넣고 한 번 돌린다. 두 번 돌려도 된다.
--
-- 아직 아무것도 안 올린 DB라면 이게 아니라 ../supabase/schema.sql을 통째로 돌린다.
--
-- 담긴 것
--   1. rooms.color · 무엇을 나누는가(할 일·장보기·메모)
--   2. 여덟 자 초대 코드 (make_join_code · tidy_code · 옛 코드 일괄 교체)
--   3. create_room — 색 인자
--   4. peek_room   — 들어가기 전에 먼저 보여주는 것
--   5. join_room   — 코드를 다듬어 찾는다
--   6. reset_join_code — 코드 새로 만들기 (주인만)
--   7. share_category · unshare_category — 카테고리 나누기
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. 방에 색 칸, 그리고 무엇을 나누는가 ──────────────────────
alter table rooms add column if not exists color text not null default '#A9B8F4';

-- 방을 만들 때 고르는 게 제일 좋은 안전장치다. 나중에 실수를 막는 게 아니라
-- 길을 아예 안 내는 방식이라서 그렇다 — 회사방에서 장보기를 끄면 담을 때
-- 뜨는 목록에 회사방이 아예 안 나온다.
-- 기본은 할 일만 켜둔다. 잘못 눌러 새는 걸 막자는 게 목적이니 기본값도 그쪽이다.
alter table rooms add column if not exists share_tasks boolean not null default true;
alter table rooms add column if not exists share_shop  boolean not null default false;
alter table rooms add column if not exists share_memo  boolean not null default false;


-- ─── 2. 초대 코드를 여덟 자로 ───────────────────────────────────
-- uuid 32글자는 손으로 옮겨 적을 수 있는 길이가 아니다.
-- 헷갈리는 글자(0 O 1 I L)는 빼서 받아 적다 틀릴 자리를 없앤다.
-- 하이픈은 보여줄 때만 끼우고 담을 때는 여덟 자만 담는다 — 8F3K-2QMD

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

/** 받아 적은 코드를 다듬는다 — 대소문자·하이픈·공백은 안 따진다 */
create or replace function tidy_code(code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(code, ''), '[^a-zA-Z0-9]', '', 'g'));
$$;


-- ─── 3. create_room — 색 인자를 받는다 ──────────────────────────
-- 인자가 늘면 Postgres는 다른 함수로 본다. 그냥 두면 두 벌이 남으므로
-- 옛 두 인자짜리를 먼저 지운다. (앱은 이제 세 인자로만 부른다)
drop function if exists create_room(text, text);

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


-- ─── 4. peek_room — 들어가기 전에 먼저 보여주는 것 ──────────────
-- 아직 멤버가 아니라 RLS로는 이 방이 안 보이므로 security definer로 한 겹 연다.
-- 이름·색·사람만 돌려주고 방 안의 할 일·메모 같은 내용은 주지 않는다.
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


-- ─── 5. join_room — 코드를 다듬어 찾는다 ────────────────────────
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


-- ─── 6. 코드 새로 만들기 (주인만) ───────────────────────────────
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


-- ─── 7. 카테고리 나누기 ─────────────────────────────────────────
-- 카테고리만 옮기면 상대에게는 이름만 보이고 할 일은 안 보인다.
-- 할 일만 옮기면 category_id가 상대가 못 읽는 줄을 가리켜 색도 이름도 안 뜬다.
-- 그래서 화면에서 여러 번 고치지 말고 한 번에 옮긴다.

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
  -- 방을 여는 일은 연 사람만 한다. 손님은 자기 카테고리를 남의 방에 얹지 못한다.
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
 * 도로 개인 것으로 거둔다.
 * 안에 든 것은 누가 적었든 다 따라온다 — 방은 내가 연 창문이고,
 * 들어온 사람이 거기에 만들고 고친 것도 내 카테고리에 한 일이기 때문이다.
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
