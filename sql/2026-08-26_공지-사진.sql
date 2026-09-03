-- 공지에 사진
--
-- ─── 자리는 안 적는다. `id`에서 짓는다 ─────────────────────────
--
-- `notice/<id>.png`. **`id`가 이미 표에 있으니** 자리를 적어둘 칸이 없다 —
-- 상점 그림에서 배운 것과 같다([2026-08-26](2026-08-26_빈-껍데기-지우고-코스튬-셋.sql)).
-- 적어두면 쓰는 화면이 경로를 물어야 하거나, 넣는 자리마다 같은 문자열을 다시
-- 지어 넣게 되고, 그러다 빠뜨린다.
--
-- **다만 `있나 없나`는 적어야 한다.** 상점 물건은 그림이 늘 있는데
-- (그림 없이 팔 것이 없다) **공지는 글만 있는 것이 많다.** 없는 것을 부르러 가면
-- 열 때마다 404를 한 번 먹는다. 그래서 칸 하나가 늘었다 — 주소가 아니라 **참·거짓**이다.

alter table notice add column if not exists image boolean not null default false;

-- ─── 그림 두는 곳 ───────────────────────────────────────────────
/*
 * 통을 따로 둔다. `shop` 통에 `notice/` 앞머리를 붙여 넣을 수도 있었는데,
 * 그 통은 **`<대분류>/<중분류>/<종류>/<코드>.png` 한 가지 생김새**로 쌓기로 해뒀다
 * ([assets/shop/README.md](../assets/shop/README.md)). 거기 다른 것을 섞으면
 * 그 규칙이 `대체로 그렇다`가 된다.
 *
 * 통은 열어둔다(public). 공지 그림은 숨길 것이 아니고, 닫아두면 앱이 볼 때마다
 * 서명한 주소를 받아와야 한다.
 *
 * 쓰는 것은 **상점 채우는 사람**이다 — 공지 표와 같은 명단(`is_shop_admin()`).
 *
 * Storage는 우리 표가 아니라 **Supabase 것**이라 권한이 모자랄 수 있다.
 * 막히면 멈추지 않고 넘어간다 — 대시보드에서 손으로 만들면 되는 일이다.
 */
do $$
begin
  insert into storage.buckets (id, name, public) values ('notice', 'notice', true)
  on conflict (id) do nothing;

  drop policy if exists "공지 그림은 누구나 본다"   on storage.objects;
  drop policy if exists "공지 그림은 관리자가 올린다" on storage.objects;
  drop policy if exists "공지 그림은 관리자가 바꾼다" on storage.objects;
  drop policy if exists "공지 그림은 관리자가 지운다" on storage.objects;

  create policy "공지 그림은 누구나 본다" on storage.objects
    for select using (bucket_id = 'notice');
  create policy "공지 그림은 관리자가 올린다" on storage.objects
    for insert with check (bucket_id = 'notice' and is_shop_admin());
  create policy "공지 그림은 관리자가 바꾼다" on storage.objects
    for update using (bucket_id = 'notice' and is_shop_admin());
  /*
   * 지우는 것도 열어둔다. 공지는 아무도 `가진` 것이 아니라, 지운 공지의 그림이
   * 통에 남아 있을 까닭이 없다.
   */
  create policy "공지 그림은 관리자가 지운다" on storage.objects
    for delete using (bucket_id = 'notice' and is_shop_admin());
exception when insufficient_privilege then
  raise notice 'notice 통은 대시보드 Storage에서 만들어 주세요 — public, 관리자만 쓰기';
end $$;

-- ─── 돌린 뒤 ────────────────────────────────────────────────────
--
--   select id, title, image, active from notice order by created_at desc;
--   select id, public from storage.buckets where id = 'notice';
--
-- 그림 자리는 `notice/<id>.png`다. 다시 올려도 주소가 같아서
-- 앱이 주소 끝에 `?v=<고친 때>`를 붙인다 — 가격표의 `updated_at`이 그 판이다.
