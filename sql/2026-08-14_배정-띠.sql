-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-14 · 배정 띠
--
-- 배정 SQL을 먼저 돌린 DB에 얹는다. 두 번 돌려도 된다.
--
-- 담긴 것
--   1. tasks에 assigned_at(언제 넘어왔나) · assigned_by(누가 넘겼나)
--   2. drop_assignments가 그 두 칸도 같이 비운다
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. 차례가 언제, 누구 손에서 넘어왔나 ───────────────────────
-- 앱을 열었을 때 `설거지가 내 차례가 됐어요` 띠를 세우는 두 칸이다.
--
-- **updated_at으로는 못 센다.** 제목만 고쳐도 밀리는 칸이라
-- 이미 내 차례인 일을 내가 한 번 고치면 띠가 다시 뜬다.
-- 차례가 바뀔 때만 미는 칸이 따로 있어야 한다.
--
-- **assigned_by가 있어야 내가 나에게 준 것을 거른다.**
-- 방금 내가 적어 넣은 일로 띠가 뜨면 앱이 헛말을 하는 것이다.
-- 교대로 넘어온 것은 체크한 사람이 넘긴 것으로 적는다 —
-- 남편이 오늘 것을 끝내서 내일이 내 차례가 됐으면 그건 남편 손에서 온 것이 맞다.
alter table tasks add column if not exists assigned_at timestamptz;
alter table tasks add column if not exists assigned_by uuid references auth.users;

-- 옛 줄에는 아무것도 채우지 않는다. 지금 있는 차례는 **이미 알고 있는 것**이라
-- 채워 넣으면 앱을 열자마자 예전 것들로 띠가 선다. 비어 있으면 안 뜬다.


-- ─── 2. 방에서 빠진 사람의 자취도 지운다 ────────────────────────
-- 차례가 비었는데 `누가 언제 넘겼다`만 남아 있을 이유가 없다.
create or replace function drop_assignments(room uuid, who uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update tasks set assignee_id = null, assigned_at = null, assigned_by = null, updated_at = now()
   where room_id = room and assignee_id = who;
  update presets set assignee_id = null, updated_at = now()
   where room_id = room and assignee_id = who;
end $$;
