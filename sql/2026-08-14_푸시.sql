-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-14 · 푸시 (콕 찌르기의 남은 반쪽)
--
-- 콕 찌르기 SQL을 먼저 돌린 DB에 얹는다. 두 번 돌려도 된다.
--
-- 담긴 것
--   1. device_tokens — 어느 기기로 보낼까
--   2. nudge_targets — 보낼 기기 목록. Edge Function이 이것만 읽는다
--
-- **이것만으로는 안 울린다.** FCM 프로젝트와 Edge Function이 있어야 한다 —
-- docs/nudge/기능.md의 `푸시를 붙이려면`을 보라.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. 어느 기기로 보낼까 ───────────────────────────────────────
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
