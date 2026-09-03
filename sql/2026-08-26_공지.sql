-- 공지 — 앱을 열면 한 번 뜨는 팝업
--
-- ─── 왜 표를 따로 두나 ─────────────────────────────────────────
--
-- 상점 가격표에 얹을 수도 있었다. 안 얹었다 — **파는 것이 아니다.**
-- 값도 없고 분류도 없고 그림도 없다. 가격표에 얹으면 `kind`가 하나 더 늘고
-- 그 종류만 가격·분류·그림 칸을 다 비워 두게 된다.
--
-- ─── 언제까지 안 뜨나는 여기 안 담는다 ─────────────────────────
--
-- `오늘 다시 열지 않기`를 누른 것은 **폰에 담는다**(`localStorage`).
-- 여기 담으면 사람 × 공지마다 한 줄이 쌓이고, RLS 정책이 하나 더 붙고,
-- 로그인 안 한 사람은 담을 데가 없다. **공지는 로그인 전에도 떠야 한다.**
--
-- 폰에 담는 값이라 기기를 바꾸면 한 번 더 뜬다. 공지가 한 번 더 뜨는 것은
-- 잘못이 아니다 — 안 뜨는 것이 잘못이다.

create table if not exists notice (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null default '',
  /*
   * **올리자마자 안 띄운다.** 가격표와 같은 규칙이다 — 쓰다 만 것이 뜨는 사고를 막는다.
   * 관리자가 켜야 뜬다.
   */
  active     boolean not null default false,
  created_at timestamptz not null default now(),
  /*
   * **고친 때가 판이다.** 이 값이 바뀌면 `오늘 다시 열지 않기`를 눌러둔 사람에게도
   * 다시 뜬다 — 고쳐 올린 공지는 새 공지다.
   */
  updated_at timestamptz not null default now()
);

create or replace function touch_notice()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.updated_at = now();
  return new;
end $fn$;

drop trigger if exists notice_touch on notice;
create trigger notice_touch before update on notice
  for each row execute function touch_notice();

-- 새것이 먼저 — 띄우는 것은 **켜져 있는 것 중 제일 새것 하나**다
create index if not exists notice_live on notice (active, created_at desc);

-- ─── 누가 보고 누가 쓰나 ────────────────────────────────────────
/*
 * 보는 것은 **누구나.** 로그인 안 해도 뜬다 — 공지는 로그인해야 볼 것이 아니다.
 * 켜진 것만 보인다. 쓰다 만 것은 관리자에게만 보인다(가격표와 같은 규칙).
 *
 * 쓰는 것은 **상점 채우는 사람**이다(`is_shop_admin()`). 명단을 따로 두지 않았다 —
 * 표를 하나 더 만들면 관리자를 두 군데에 넣어야 하고, 한 군데를 잊는 날이 온다.
 * 이 앱의 관리자는 한 사람이다.
 */
alter table notice enable row level security;

drop policy if exists "켜진 것은 누구나"   on notice;
drop policy if exists "관리자가 쓴다"     on notice;
drop policy if exists "관리자가 고친다"   on notice;
drop policy if exists "관리자가 지운다"   on notice;

create policy "켜진 것은 누구나" on notice
  for select using (active or is_shop_admin());
create policy "관리자가 쓴다"   on notice for insert with check (is_shop_admin());
create policy "관리자가 고친다" on notice for update using (is_shop_admin());
/*
 * **지우는 것도 열어둔다.** 가격표와 다른 자리다 — 공지는 아무도 `가진` 것이 아니라
 * 지워도 남의 줄이 가리킬 데를 잃지 않는다. 쓰다 만 것을 치울 길이 있어야 한다.
 */
create policy "관리자가 지운다" on notice for delete using (is_shop_admin());

-- ─── 돌린 뒤 ────────────────────────────────────────────────────
--
--   select id, title, active, created_at from notice order by created_at desc;
--
-- 비어 있는 것이 맞다. 첫 공지는 앱에서 쓴다 — 설정 → 공지.
