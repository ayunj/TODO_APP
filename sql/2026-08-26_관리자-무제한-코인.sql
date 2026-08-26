-- 관리자는 값을 안 치른다 · 기본 둘을 다시 심는다
--
-- 두 가지 일을 한다.
--
--   1. **관리자에게는 잔액이 늘 넉넉하다** — 사고 입어보는 것을 끝까지 해보려고
--   2. **기본 곰돌이와 기본 룸을 다시 심는다** — 값표를 비울 때 같이 지워졌다
--
-- ─── 왜 잔액을 안 세나 ─────────────────────────────────────────
--
-- 채우는 사람은 **올린 것을 사서 입어봐야** 안다. 격자에서 어떻게 보이나,
-- 걸쳐보면 어떠나, 세트를 다 모으면 포즈가 오나 — 그걸 보려면 값을 치러야 하고,
-- 그러려면 할 일을 백 개쯤 체크해야 한다.
--
-- **잔액 칸을 만들어 넣어주는 길은 안 골랐다.** 그러면 관리자가 아닌 사람에게도
-- 넣어줄 수 있는 자리가 생기고, 그 자리는 반드시 언젠가 쓰인다.
-- `my_points()`가 셈을 마치고 **관리자에게만 큰 수를 돌려준다** —
-- 담아두는 것이 없으니 명단에서 빠지는 순간 원래 잔액으로 돌아온다.
--
-- 무한이 아니라 **큰 수 하나**다. `int`에 무한이 없고, 화면의 동전 칸이
-- 여섯 자리까지 들어간다.

/*
 * **셈은 그대로 다 한다.** `stamp_points()`도 `grant_free()`도 `grant_poses()`도
 * 관리자에게 그대로 돌아야 한다 — 안 돌리면 관리자만 세트 보상을 못 받아서
 * 그 길이 되는지 확인할 수가 없다.
 *
 * 돌려주는 값만 갈라진다. **산 값을 빼지 않으니** 관리자는 아무리 사도 줄지 않는다.
 */
create or replace function my_points()
returns int language plpgsql security definer set search_path = public as $fn$
begin
  perform stamp_points();
  -- 안 사도 갖는 것부터. 세트를 세기 전에 넣어야 값이 0인 시즌 물건도 제대로 센다.
  perform grant_free();
  /*
   * 세트도 여기서 본다. 전에는 **살 때만** 봤는데, 그러면 소품이 숨김인 채로 세트를
   * 다 모은 사람은 관리자가 켜준 뒤에도 **뭔가 하나 더 사기 전까지** 못 받는다.
   */
  perform grant_poses();

  /*
   * **상점을 채우는 사람은 값을 안 치른다.** 사서 입어보는 것까지 해봐야
   * 올린 것이 제대로 섰는지 안다.
   *
   * `buy_costume`이 이 함수로 잔액을 보니 여기 한 줄이면 사는 것도 같이 열린다 —
   * 사는 쪽에 따로 예외를 두지 않는다. 예외가 두 군데 있으면 한쪽만 고치는 날이 온다.
   */
  if is_shop_admin() then
    return 999999;
  end if;

  return 100
    + coalesce((select sum(amount)::int from point_log     where user_id = auth.uid()), 0)
    - coalesce((select sum(price)::int  from costume_owned where user_id = auth.uid()), 0);
end $fn$;

-- ─── 기본 둘을 다시 심는다 ──────────────────────────────────────
/*
 * **이 둘은 열쇠를 안 바꾼다.** 나머지는 번호표로 다시 따도 되는데
 * (`0000001`…), 이 둘은 **앱이 그림과 열쇠를 같이 들고 나간다** —
 * `costumes.ts`의 `DEFAULT_BEAR`·`DEFAULT_ROOM`이 이 글자를 가리키고,
 * `gomdori.worn_bear`의 기본값도 `'base'`다.
 *
 * 그래서 값표를 비울 때도 이 둘은 남아 있어야 한다. 없으면 —
 *
 *   * `grant_free()`가 줄 것을 못 찾아 옷장이 빈다
 *   * `buy_costume('base')`가 `없는 코스튬입니다`로 막힌다
 *   * 상점 목록이 통째로 비어 앱이 박아둔 것으로 물러선다
 *
 * 곰돌이가 서 있는 것은 앱이 그림을 들고 있어서지 값표가 옳아서가 아니다.
 */
insert into costume_catalog (item_key, kind, price, season, name, family_key, active) values
  ('base',      'bear', 0, null, '기본 곰돌이', 'daily', true),
  ('room-base', 'room', 0, null, '기본 룸',     'room',  true)
on conflict (item_key) do update
  set kind       = excluded.kind,
      price      = excluded.price,
      family_key = excluded.family_key,
      active     = true;

-- ─── 돌린 뒤 ────────────────────────────────────────────────────
--
--   select item_key, name, price, family_key, active from costume_catalog order by item_key;
--   select my_points();
--
-- 관리자로 로그인해 있으면 `999999`가 나온다. 명단에 없으면 원래 잔액이 나온다 —
-- 담아두는 것이 없어서 명단에서 빠지면 그 자리에서 돌아온다.
--
-- ─── 통에 남은 것 ───────────────────────────────────────────────
--
-- 값표를 비웠으면 통의 그림은 **가리키는 데가 없는 채로 남는다.**
-- 이름이 열쇠와 안 맞는 것(`dragon.png` 같은 것)은 다시 올릴 때 겹치지 않지만,
-- 통에 그대로 쌓여 있으면 무엇이 쓰이는 것인지 가릴 수가 없다.
--
-- 지우는 것은 **대시보드 Storage에서** 한다. 여기서 `storage.objects`를 직접
-- 지우면 줄만 사라지고 파일은 남는다 — Supabase가 관리하는 표라서 그렇다.
