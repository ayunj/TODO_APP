-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-10 · 배정
--
-- 방 공유 SQL을 먼저 돌린 DB에 얹는다. 두 번 돌려도 된다.
--
-- 담긴 것
--   1. tasks·presets에 assignee_id(누가 할까) · rotate(다음 회차는)
--   2. drop_assignments — 방에서 빠진 사람의 차례를 비운다
--   3. hand_over_room에 그 정리를 끼운다
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. 누가 할까, 다음 회차는 ──────────────────────────────────
-- 이름(text)이 아니라 사람(uuid)으로 담는다. 이름으로 담으면 상대가 별명을 바꾼 순간
-- 옛 할 일들이 옛 이름으로 남는다. done_by(누가 했나)와 다른 칸인 까닭이기도 하다.
--
-- 한 명만 고른다. 여럿을 담으면 표가 하나 더 필요하고
-- "둘 중 하나만 하면 끝인가 둘 다 해야 끝인가"라는 답 없는 물음이 따라온다.
alter table tasks add column if not exists assignee_id uuid references auth.users;

-- once(이번만) · same(같은 사람) · rotate(번갈아).
-- 한 번 정한 사람이 다음 회차까지 계속 따라붙는 건 놀라운 일이라 고를 때만 그렇게 된다.
alter table tasks   add column if not exists rotate text not null default 'once';
alter table presets add column if not exists assignee_id uuid references auth.users;
alter table presets add column if not exists rotate text not null default 'once';


-- ─── 2. 방에서 빠진 사람의 차례는 비운다 ────────────────────────
-- 없는 사람 이름이 차례 칩에 남으면 아무도 그 일을 안 하게 된다.
create or replace function drop_assignments(room uuid, who uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update tasks set assignee_id = null, updated_at = now()
   where room_id = room and assignee_id = who;
  update presets set assignee_id = null, updated_at = now()
   where room_id = room and assignee_id = who;
end $$;


-- ─── 3. 맡기고 나갈 때도 정리한다 ───────────────────────────────
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

  update categories set owner_id = heir, updated_at = now() where room_id = room;
  update tasks      set owner_id = heir, updated_at = now() where room_id = room;
  update presets    set owner_id = heir, updated_at = now() where room_id = room;
  update shop_items set owner_id = heir, updated_at = now() where room_id = room;
  update memos      set owner_id = heir, updated_at = now() where room_id = room;

  update rooms set created_by = heir where id = room;
  update room_members set role = 'owner'  where room_id = room and user_id = heir;
  -- 내가 맡고 있던 차례는 비운다
  perform drop_assignments(room, auth.uid());
  delete from room_members where room_id = room and user_id = auth.uid();
end $$;
