-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-10 · 지운 것
--
-- 이미 돌아가고 있는 DB에 **얹는 부분만** 모았다.
-- Supabase → SQL Editor 에 통째로 붙여넣고 한 번 돌린다. 두 번 돌려도 된다.
--
-- 아직 아무것도 안 올린 DB라면 이게 아니라 ../supabase/schema.sql을 통째로 돌린다.
--
-- 담긴 것
--   1. deleted_by — 누가 지웠는가
--
-- 지우기는 예전부터 deleted_at을 다는 일이었다. 여기서 더하는 건 **누가**뿐이다.
-- 표를 새로 만들지 않는다 — `지운 것` 화면은 deleted_at이 달린 줄을 모아 보여주고,
-- 되돌리기는 그걸 지운다.
--
-- deleted_by가 두 가지 지움을 가른다.
--   있음 — 사람이 지운 것. 30일 동안 `지운 것`에 남고 누구나 되돌릴 수 있다
--   없음 — 그냥 없앤 것 (다음 회차 정리·전체 초기화·30일 지난 것).
--          앱이 받아오지도 않는다. 되돌릴 것이 아니라 치운 것이다
--
-- 이미 지워져 있던 줄은 deleted_by가 비어 있다. 그대로 두면 된다 —
-- 그전에 지운 것까지 되살려 보여줄 일은 아니다.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. 누가 지웠는가 ─────────────────────────────────────────────
-- 방 `지운 것`에서 "남편이 지움"이라고 적는 자리다.
-- 개인 것에도 달린다 (지운 사람은 늘 나라서 화면에는 안 적지만,
-- 사람이 지운 것과 뒷정리로 없앤 것을 이 칸 하나로 가른다).
alter table tasks      add column if not exists deleted_by uuid references auth.users;
alter table shop_items add column if not exists deleted_by uuid references auth.users;
alter table memos      add column if not exists deleted_by uuid references auth.users;

-- 카테고리·즐겨찾기는 `지운 것`에 오르지 않는다 (지우면 그걸로 끝이다).
-- 그래도 칸은 같이 둔다 — 앱이 다섯 표에 같은 모양으로 지우기를 걸기 때문이다.
alter table categories add column if not exists deleted_by uuid references auth.users;
alter table presets    add column if not exists deleted_by uuid references auth.users;

-- RLS는 손대지 않는다. 지우기도 되돌리기도 update 하나라
-- 이미 있는 `고치기` 정책이 그대로 덮는다 — 방 사람이면 누구나 된다.
-- 막는 대신 되돌린다. 가족끼리 권한을 나누기 시작하면 그때부터 앱이 회사가 된다.
