-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-14 · 콕 찌르기 (1단계 — 앱 안에서 받는다)
--
-- 방 SQL을 먼저 돌린 DB에 얹는다. 두 번 돌려도 된다.
--
-- 담긴 것
--   1. rooms.share_nudge — 방마다 켜고 끈다
--   2. room_members.nudge_left · nudge_since — 하루 세 번, 아침 6시에 다시 채운다
--   3. nudges — 받는 사람이 읽으면 지우는 **전달함**. 기록이 아니다
--   4. send_nudge() · nudges_left()
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. 방마다 켜고 끈다 ─────────────────────────────────────────
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
