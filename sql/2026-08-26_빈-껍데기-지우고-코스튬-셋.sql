-- 빈 껍데기를 지우고, 코스튬 셋을 넣고, 기본 둘은 그냥 준다
--
-- 세 가지 일을 한다.
--
--   1. **그림 없는 줄을 가격표에서 지운다** — 옷 열, 방 넷, 시즌 세트 다섯(열다섯 줄). 스물아홉 줄
--   2. **코스튬 셋을 켠다** — 곰드래곤 · 공주 곰 · 마법사 곰
--   3. **`img` 칸을 걷어낸다** — 그림 자리는 적어두는 것이 아니라 짓는 것이다
--   4. **기본 곰돌이와 기본 룸은 안 사도 갖는다**
--
-- ─── 그림을 먼저 올린다 ────────────────────────────────────────
--
-- **파일을 올리고 나서 이걸 돌린다.**
--
--   $env:SUPABASE_SECRET_KEY = 'sb_secret_...'
--   npm run shop
--
-- 대시보드 Storage → `shop` 통에 손으로 올려도 같다. 자리는 아래 셋이다 —
--
--   shop/deco/costume/gomdori/rabbit.png
--   shop/deco/costume/gomdori/dragon.png
--   shop/deco/costume/gomdori/princess.png
--   shop/deco/costume/gomdori/wizard.png
--
-- 순서는 아무래도 된다. **가격표에 그림 자리를 안 적으니** 이 파일과 파일 올리기가
-- 서로 기다릴 것이 없다 — 파일이 통에 있으면 그 자리에 뜨고, 없으면 빈다.
--
-- ─── 왜 지우나 ─────────────────────────────────────────────────
--
-- 가격표에 서른네 줄이 심겨 있었는데 **그림이 있는 것은 셋뿐이었다**
-- (기본 곰돌이 · 곰토끼 · 기본 룸). 나머지 서른한 줄은 이름과 가격만 있는 줄이라
-- 상점 격자에 **회색 네모**로 떴다.
--
-- 그게 `아직 안 그렸어요`로 안 읽힌다. **파는 물건으로 읽힌다** — 눌러서 걸쳐보면
-- 곰돌이가 그대로고, 300P를 치르고 나서도 그대로다. 가격을 치를 수 있는 자리에
-- 아무것도 안 바뀌는 것을 걸어두면 안 된다.
--
-- 서른한 줄 가운데 **둘은 이번에 그림이 왔다**(공주 곰 · 마법사 곰). 그 둘은 켜고,
-- 곰드래곤 한 줄을 새로 넣고, 나머지 스물아홉을 지운다.
--
-- 숨기는 것(`active = false`)으로 안 하고 **지우는 까닭**은, 스물아홉 줄이
-- 관리자 화면의 목록에도 그대로 남아서 무엇이 진짜 파는 것인지 가릴 수가 없어서다.
-- 그림이 그려지면 그때 관리자 화면에서 새로 넣는다 — 코드는 그때 번호표로 딴다.
--
-- ─── 지워도 되는가 ─────────────────────────────────────────────
--
-- `costume_catalog`에는 **지우는 정책이 없다**(RLS). 산 사람의 `costume_owned`에
-- 열쇠가 남아서 그 사람 옷이 이름 없는 것이 되기 때문이다. 여기서는 그 짝까지
-- 같이 치우니 괜찮다 — 아래 첫 문장이 셋을 한꺼번에 한다.
--
--   입고 있던 사람을 기본으로 되돌리고 → 가진 것에서 빼고 → 가격표에서 지운다
--
-- **SQL Editor에서 돌린다.** RLS를 안 타는 자리라 정책 없이도 지워진다.
-- 앱에서는 여전히 못 지운다.
--
-- **두 번 돌려도 된다.** 문장이 서로 기대지 않아서 중간에 끊겨도
-- 처음부터 다시 돌리면 된다.

/*
 * ─── 트랜잭션으로 안 감싼다 ────────────────────────────────────
 *
 * 처음엔 `begin;`으로 묶고 임시 표(`drop_keys`)에 지울 것을 담아뒀다.
 * **SQL Editor에서 `relation "drop_keys" does not exist`로 터진다** —
 * 문장마다 따로 돌아서 임시 표가 만들어지자마자 사라진다.
 *
 * 그래서 **문장 하나하나가 혼자 서게** 고쳐 썼다. 지우는 일 넷은 한 문장으로 묶었고
 * (아래 `with`), 나머지는 서로 기대지 않는다. 두 번 돌려도 되니 중간에 끊겨도
 * 처음부터 다시 돌리면 된다.
 */

-- ─── 빈 껍데기를 걷어낸다 ──────────────────────────────────────
/*
 * **한 문장이다.** 벗기고 · 가진 것에서 빼고 · 가격표에서 지우는 셋을
 * `with`로 묶었다 — 지울 것을 **한 번만 적고 셋이 같은 것을 본다.**
 * 세 번 적으면 언젠가 하나만 고치는 날이 온다.
 *
 * `with` 안의 고치는 문장은 **본 문장이 읽든 안 읽든 반드시 다 돈다**(Postgres 규칙).
 * 그리고 셋이 **같은 스냅숏**을 보니 `doomed`가 중간에 흔들리지 않는다.
 *
 * ── 왜 열쇠를 적어 두나
 *
 * `그림 없는 것`으로 고르고 싶었다. 그런데 **그림이 있나 없나를 가격표가 모른다** —
 * 그림 자리는 적어두는 것이 아니라 분류와 열쇠로 짓는 것이라(아래에서 `img`를 걷어낸다),
 * 통을 열어보기 전에는 알 길이 없다.
 *
 * 그래서 **옛 씨앗에 있던 스물아홉을 그대로 적는다.** 목록이 길지만 이게 맞다 —
 * `여섯 말고 다`로 적으면 **관리자가 그 뒤에 넣은 것까지 같이 날아간다.**
 * 여기 적힌 것은 2026-08-25 씨앗에서 온 줄뿐이고, 그 뒤에 들어온 것은 안 건드린다.
 *
 * ── 벗기는 것이 왜 먼저인가
 *
 * 가격표에서 먼저 지우면 `worn_bear`가 없는 것을 가리킨다. 그 사이에 앱을 켠 사람은
 * `itemOf()`가 못 찾아 기본 곰돌이로 서지만, 다음에 갈아입을 때 **없는 열쇠가
 * 저장으로 되돌아온다.** 한 문장이라 사이가 없지만 순서는 그대로 뒀다.
 *
 * **곰과 방을 한 번에 고친다.** 두 문장으로 나누면 곰도 방도 지울 것을 입고 있는
 * 사람의 줄을 한 문장 안에서 두 번 고치는 꼴이 되고, 그때는 **한쪽만 먹는다.**
 *
 * ── 치른 값은
 *
 * **안 돌려준다.** `costume_owned.price`가 빠지면서 `my_points()`의 뺄셈에서도
 * 같이 빠지니 **잔액이 저절로 그만큼 돌아온다** — 따로 넣어줄 것이 없다.
 * (`my_points()` = 100 + point_log 합 − costume_owned.price 합)
 */
with doomed (item_key) as (values
  -- 옷 열
  ('hat'), ('ribbon'), ('scarf'), ('apron'), ('glasses'), ('overall'),
  ('chef'), ('knit'), ('shirt'), ('detective'),
  -- 방 넷
  ('room-picnic'), ('room-cafe'), ('room-plant'), ('room-bed'),
  -- 시즌 세트 다섯 × 셋
  ('b-swim'), ('r-sea'), ('pose-tube'),
  ('b-hall'), ('r-hall'), ('pose-pump'),
  ('b-xmas'), ('r-xmas'), ('pose-tree'),
  ('b-bloom'), ('r-bloom'), ('pose-petal'),
  ('b-vac'), ('r-beach'), ('pose-parcel')
),
undress as (
  update gomdori
     set worn_bear  = case when worn_bear in (select item_key from doomed)
                           then 'base' else worn_bear end,
         worn_room  = case when worn_room in (select item_key from doomed)
                           then 'room-base' else worn_room end,
         updated_at = now()
   where worn_bear in (select item_key from doomed)
      or worn_room in (select item_key from doomed)
  returning user_id
),
unown as (
  delete from costume_owned
   where item_key in (select item_key from doomed)
  returning user_id
)
delete from costume_catalog
 where item_key in (select item_key from doomed);

/*
 * **텅 빈 세트를 지운다.** 물놀이·할로윈·크리스마스·봄꽃·여름휴가 다섯은
 * 셋씩 열다섯 줄이 다 이름뿐이라 위에서 통째로 빠졌다.
 *
 * **물건보다 나중이어야 한다** — `costume_catalog.season`이 세트를 가리키고 있어서
 * 세트를 먼저 지우면 이음줄(`costume_catalog_season_fk`)에 걸린다.
 *
 * **하나라도 남은 세트는 안 건드린다.** 관리자가 그림까지 올려 짓던 세트라면
 * 물건이 남아 있을 것이고, 그건 짓다 만 것이지 빈 껍데기가 아니다.
 *
 * 세트는 이제 [상점 채우기](../design/관리자.html)에서 관리자가 짓는다.
 * 새로 짓는 것은 `s000001`부터 번호표로 딴다 — 옛 `s-swim` 같은 손으로 적은 열쇠는
 * 이걸로 마지막이다.
 */
delete from costume_season s
 where not exists (select 1 from costume_catalog c where c.season = s.season_key);

-- ─── 코스튬 셋 ──────────────────────────────────────────────────
/*
 * **공주와 마법사는 이미 가격표에 있다.** 지난번에 이름과 가격만 심어두고
 * 숨김(`active = false`)으로 뒀던 줄이라 **켜기만 한다.**
 *
 * 곰드래곤은 새로 넣는다. 열쇠를 `dragon`으로 손수 적는 까닭은
 * **앱이 그림을 갖고 있어서**다 — `builtinImg('dragon')`이 `/gomdori/dragon.png`를
 * 찾는다. 번호표(`0000030`)를 뽑으면 앱의 그림과 이름이 안 맞는다.
 * 앞으로 관리자 화면에서 넣는 것은 그림을 Storage에 올리니 번호표를 그대로 쓴다.
 *
 * `img`는 **비워둔다.** 비어 있으면 앱이 제 안의 그림으로 선다 —
 * 곰토끼·기본 곰돌이와 같은 길이라 오프라인에서도 뜬다.
 */
insert into costume_catalog (item_key, kind, price, season, name, family_key, active) values
  ('dragon', 'bear', 350, null, '곰드래곤', 'costume', true)
on conflict (item_key) do update
  set price      = excluded.price,
      name       = excluded.name,
      family_key = excluded.family_key,
      active     = true;

-- 이미 있던 둘은 켜기만. **값과 이름은 안 건드린다** — 그 주인은 관리자다.
update costume_catalog
   set active = true, family_key = 'costume'
 where item_key in ('princess', 'wizard');

-- 남은 셋도 제 자리에 있는지 한 번 맞춘다(두 번 돌려도 되게)
update costume_catalog set active = true, family_key = 'daily'   where item_key = 'base';
update costume_catalog set active = true, family_key = 'costume' where item_key = 'rabbit';
update costume_catalog set active = true, family_key = 'room'    where item_key = 'room-base';

-- ─── 그림 자리는 적어두지 않는다 ────────────────────────────────
/*
 * **`img` 칸을 걷어낸다.**
 *
 * 여기 `<대분류>/<중분류>/<종류>/<열쇠>.png`를 적어뒀었다. 적어둘 것이 아니다 —
 * **네 토막이 다 이미 가격표에 있다.** 관리자가 상점을 채울 때 고르는 것은
 * 분류와 파일 둘뿐이고, 열쇠는 번호표로 저절로 딴다(`0000001`).
 * 파일 이름은 그 열쇠 그대로, 폴더는 그 분류 그대로다.
 *
 * 그래도 적어두면 둘 중 하나가 된다 —
 *
 *   * 관리자 화면이 **경로를 물어본다.** 물을 것이 아니다
 *   * 아니면 넣는 자리마다 **같은 문자열을 다시 지어 넣는다.** 그러다 빠뜨린다
 *
 * 실제로 빠뜨렸다. 곰토끼를 통으로 옮겼는데 `img`가 비어서 상점에 그림이 안 떴다.
 * 가격표가 옳고 파일도 옳은데 **둘을 잇는 칸 하나가 안 맞아서** 안 뜬 것이다.
 * 그 칸이 없으면 안 맞을 일도 없다.
 *
 * 이제 **앱이 짓는다**(`src/lib/costumes.ts`의 `shopPath`). 관리자가 올릴 자리를
 * 고를 때 쓰는 `shop_folder()`와 같은 규칙이고, 규칙을 고치면 둘을 같이 고친다.
 *
 * **앱이 들고 나가는 둘**(기본 곰돌이·기본 룸)은 앱이 제 그림을 먼저 본다 —
 * 통에 올릴 일이 없어서 자리를 지어 봐야 없는 것을 부르러 간다.
 */
alter table costume_catalog drop column if exists img;

-- ─── 안 사도 갖는 것 ────────────────────────────────────────────
/*
 * **기본 곰돌이와 기본 룸은 그냥 준다.**
 *
 * 가격이 0이라 사려면 살 수는 있었다. 그런데 그러면 갓 가입한 사람의 옷장이 **비어 있고**,
 * 자기가 지금 입고 있는 곰이 상점에 `구매하기`로 떠 있다 —
 * **입고 있는 것을 사라고 하는 꼴**이라 0P라도 말이 안 된다.
 *
 * 열쇠 둘을 여기 적지 않고 **`가격이 0인 것`으로 고른다.** 적어두면 나중에
 * 기본 룸을 다른 것으로 바꿀 때 이 함수도 같이 고쳐야 하는데, 그 날 잊는다.
 * 가격이 0이라는 것이 곧 `안 받고 준다`는 뜻이라 규칙과 뜻이 같다.
 *
 * 포즈는 뺀다. 포즈도 가격이 0이지만 **세트를 다 모아야 오는 것**이라
 * 여기 들면 아무나 그냥 갖게 된다 — 그건 `grant_poses()`가 따로 본다.
 */
create or replace function grant_free()
returns void language sql security definer set search_path = public as $fn$
  insert into costume_owned (user_id, item_key, price)
  select auth.uid(), c.item_key, 0
    from costume_catalog c
   where c.price = 0
     and c.kind <> 'pose'
     and c.active
  on conflict (user_id, item_key) do nothing;
$fn$;

/*
 * 잔액을 볼 때마다 채운다. `grant_poses()` 바로 옆이다 —
 * 앱이 따로 부를 자리를 안 만들어도 화면이 뜨는 순간 들어온다.
 *
 * 가격이 0이라 `my_points()`의 뺄셈에는 아무 영향이 없다.
 */
create or replace function my_points()
returns int language plpgsql security definer set search_path = public as $fn$
begin
  perform stamp_points();
  -- 안 사도 갖는 것부터. 세트를 세기 전에 넣어야 가격이 0인 시즌 물건도 제대로 센다.
  perform grant_free();
  /*
   * 세트도 여기서 본다. 전에는 **살 때만** 봤는데, 그러면 소품이 숨김인 채로 세트를
   * 다 모은 사람은 관리자가 켜준 뒤에도 **뭔가 하나 더 사기 전까지** 못 받는다.
   */
  perform grant_poses();
  return 100
    + coalesce((select sum(amount)::int from point_log     where user_id = auth.uid()), 0)
    - coalesce((select sum(price)::int  from costume_owned where user_id = auth.uid()), 0);
end $fn$;

/*
 * 이미 가입해 있는 사람들에게 한 번에 넣어준다.
 *
 * 안 넣어도 다음에 앱을 켤 때 `my_points()`가 넣어주지만, **그 사이가 어긋난다** —
 * `pullGomdori()`는 셋을 한꺼번에 부르는데(`Promise.all`) 잔액과 가진 것이 같이 간다.
 * 그 한 번은 `my_points()`가 막 넣은 줄을 못 보고 지나간다.
 */
insert into costume_owned (user_id, item_key, price)
select u.id, c.item_key, 0
  from auth.users u
  cross join costume_catalog c
 where c.price = 0 and c.kind <> 'pose' and c.active
on conflict (user_id, item_key) do nothing;

-- ─── 돌린 뒤 눈으로 보는 것 ─────────────────────────────────────
--
--   select item_key, name, price, family_key, active
--     from costume_catalog order by family_key, price;
--
-- 여섯 줄이 나와야 한다 —
--
--   base       기본 곰돌이     0  daily     t
--   rabbit     곰토끼        300  costume   t
--   dragon     곰드래곤      350  costume   t
--   princess   공주 곰       400  costume   t
--   wizard     마법사 곰     400  costume   t
--   room-base  기본 룸         0  room      t
--
-- 그림이 어디로 갈지는 가격표가 아니라 `shop_folder()`가 안다 —
--
--   select item_key, shop_folder(item_key) || '/' || item_key || '.png' as 자리
--     from costume_catalog where item_key not in ('base', 'room-base');
--
-- 진짜로 올라갔는지는 통에서 본다. `npm run shop`이 열쇠 없이도 세어준다 —
--
--   select name, metadata->>'size' as bytes
--     from storage.objects where bucket_id = 'shop' order by name;
