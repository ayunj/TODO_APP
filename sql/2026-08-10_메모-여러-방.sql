-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-10 · 메모를 여러 방에
--
-- 이미 돌아가고 있는 DB에 **얹는 부분만** 모았다.
-- Supabase → SQL Editor 에 통째로 붙여넣고 한 번 돌린다. 두 번 돌려도 된다.
--
-- 아직 아무것도 안 올린 DB라면 이게 아니라 ../supabase/schema.sql을 통째로 돌린다.
--
-- 담긴 것
--   1. memos.room_ids — 한 장을 여러 방에
--   2. memos.updated_by — 남이 고쳤을 때 점과 이름
--   3. 메모만 따로 쓰는 RLS (방 하나가 아니라 방 목록으로 따진다)
--   4. 방을 닫을 때·맡길 때 메모에서 그 방만 떼어낸다
--
-- **메모만 여러 방에 걸린다.** 할 일은 카테고리가 방 하나를 물고 있고,
-- 장보기는 한 곳만 간다 — 어차피 따로 사야 하니까.
-- 와이파이 비밀번호는 집에서도 회사에서도 같은 종이 한 장이라 여기만 여럿이다.
-- 한 장을 여러 방에 둬도 **내용은 하나**다. 어디서 고쳐도 같이 바뀐다.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. 어느 방들에 걸렸나 ────────────────────────────────────────
-- 이음표를 따로 만들지 않는다. 한 메모가 걸리는 방은 많아야 몇 개고,
-- 표를 하나 더 만들면 맞추기(sync)에서 줄이 아니라 관계를 견줘야 한다.
alter table memos add column if not exists room_ids uuid[] not null default '{}';

-- 방 하나만 걸리던 시절 메모를 옮겨 담는다 (두 번 돌려도 되게)
update memos
   set room_ids = array[room_id]
 where room_id is not null and room_ids = '{}';

-- 여러 방을 걸러 찾는 자리라 GIN이 맞다
create index if not exists memos_room_ids on memos using gin (room_ids);

-- ─── 2. 누가 고쳤나 ──────────────────────────────────────────────
-- 내가 본 뒤에 **남이** 고친 것에만 점이 뜬다. 열면 사라진다.
alter table memos add column if not exists updated_by uuid references auth.users;

-- ─── 3. 메모만 쓰는 RLS ──────────────────────────────────────────
-- 다른 표는 room_id 하나로 따지지만 메모는 목록으로 따져야 한다.
-- 방 목록 중 **하나라도 내가 든 방이면** 보이고 고칠 수 있다.
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

-- 지우기 정책은 여전히 없다. 지우기는 deleted_at을 다는 update로만 한다.

-- ─── 4. 방이 끝날 때 — 그 방만 떼어낸다 ──────────────────────────
-- 메모는 여러 방에 걸려 있어서 통째로 거두면 안 된다.
-- 회사방을 닫는다고 집에도 걸린 메모가 집에서 사라지면 안 되는 것이다.
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

  -- 메모는 그 방만 목록에서 뺀다. 갈 곳이 없어진 것(다른 방에도 안 걸린 것)만
  -- 임자를 연 사람에게 돌려놓는다 — 다른 방에 아직 걸려 있으면 거기 임자가 그대로 맞다.
  update memos
     set room_ids = array_remove(room_ids, room),
         owner_id = case
                      when array_length(array_remove(room_ids, room), 1) is null then keeper
                      else owner_id
                    end,
         updated_at = now()
   where room = any(room_ids);
  -- 옛 칸으로만 걸려 있던 메모도 같이 거둔다
  update memos set room_id = null, owner_id = keeper, updated_at = now() where room_id = room;
end $$;

-- `맡기고 나가기`(hand_over_room)는 손대지 않는다.
-- 다른 표는 임자를 새 주인에게 넘기지만, 메모는 **여러 방에 걸려 있어서**
-- 임자를 옮기면 다른 방에 걸린 남의 종이까지 딸려간다.
-- 안 옮겨도 되는 까닭은 위 RLS에 있다 — 메모는 임자가 아니라
-- **걸린 방에 내가 들었는지**로 보이고 고쳐진다. 주인이 바뀌어도 방 사람은 그대로 본다.
