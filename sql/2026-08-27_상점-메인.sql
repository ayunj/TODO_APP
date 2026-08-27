/*
 * 상점 메인을 **보여주는 자리**로 — 2026-08-27
 * (시안: design/상점-메인.html)
 *
 * `전체` 칩이 파는 것을 무더기째 세로로 늘어놓던 것을
 * **배너 한 장 + 가로줄 몇**으로 바꾼다. 그러려면 서버가 셋을 더 알아야 한다 —
 *
 *   1. 언제 상점에 **켜졌나**   → `costume_catalog.opened_at`   (새로 들어왔어요)
 *   2. 세트에 **배너가 있나**   → `costume_season.banner_at`    (맨 위 한 장)
 *   3. 무엇이 **많이 팔렸나**   → `shop_rank()`                 (랭킹)
 *
 * 이미 도는 DB에 그대로 얹는다. 두 번 돌려도 같다.
 */

-- ─── 1. 처음 켜진 때 ────────────────────────────────────────────
/*
 * **`created_at`으로는 신상을 못 센다.**
 *
 * 새로 넣는 것은 숨김으로 들어온다(`active = false`) — 반쯤 그린 것이 상점에
 * 뜨는 사고를 막으려고 그렇게 해뒀다. 그림을 그리는 동안 값표에만 두 주쯤
 * 앉아 있다가 켜지는데, 줄이 생긴 날로 세면 **켜자마자 신상이 아니게 된다.**
 *
 * `updated_at`도 아니다 — **값이나 이름만 고쳐도 밀린다.**
 * 300P를 250P로 내린 옷이 그날 신상이 되면 안 된다.
 *
 * 그래서 칸을 하나 단다. **`active`가 처음 참이 될 때만 찍히고, 그 뒤에는
 * 껐다 켜도 안 바뀐다** — 잠깐 내렸다 올린 것이 신상으로 돌아오면 안 된다.
 */
alter table costume_catalog add column if not exists opened_at timestamptz;

-- 이미 팔고 있던 것들은 줄이 생긴 날로 친다. 켠 날을 이제 와서 알 길이 없다.
update costume_catalog set opened_at = created_at where active and opened_at is null;

/*
 * 값표 트리거에 **한 줄을 얹는다.** 트리거를 새로 만들지 않는다 —
 * `costume_catalog`에 before 트리거가 둘이면 어느 것이 먼저 도는지가
 * 이름 차례로 정해져서, 나중에 하나를 고칠 때 그 순서를 같이 봐야 한다.
 */
create or replace function sync_catalog_family()
returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.season is not null then
    select family_key into new.family_key from costume_season where season_key = new.season;
  end if;
  -- **처음 켜질 때 한 번만.** 이미 찍혀 있으면 안 건드린다
  if new.active and new.opened_at is null then
    new.opened_at = now();
  end if;
  new.updated_at = now();
  return new;
end $fn$;

-- ─── 2. 세트 배너 ───────────────────────────────────────────────
/*
 * **자리를 적어두지 않는다.** 그림 자리를 짓는 규칙 그대로다 —
 * `shop/season/<세트 열쇠>/banner.png`. 세트 열쇠가 이미 있으니 지어 쓰면 된다.
 *
 * 여기 적는 것은 **올린 때** 하나다. 두 가지를 같이 한다 —
 *
 *   * `null`이면 **배너가 없다.** 없는 그림을 부르러 가지 않는다
 *   * 있으면 주소 끝에 `?v=<올린 때>`로 붙는다. 자리를 지어 쓰니
 *     **다시 올려도 주소가 같아서**, 판이 없으면 브라우저가 옛 그림을 그대로 쓴다
 *
 * **배너를 따로 관리하지 않는다.** 표를 하나 더 만들면 끝난 세트의 배너가
 * 남아서 두 군데를 같이 꺼야 한다. 세트를 끄면 배너도 같이 내려가야 맞다.
 */
alter table costume_season add column if not exists banner_at timestamptz;

-- ─── 3. 랭킹 ────────────────────────────────────────────────────
/*
 * **앱이 직접 못 센다.** `costume_owned`는 제 줄만 보이는 표라
 * (남이 뭘 샀는지 볼 수 있으면 안 된다) 앱에서 세면 늘 `내가 산 것`만 나온다.
 *
 * 그래서 **서버가 세어 차례만 내려준다.** 몇 명이 샀는지는 안 나간다 —
 * `3명이 샀어요`는 쓰는 사람이 몇 안 되는 동안 **안 팔린다는 말**로 읽힌다.
 * 1 · 2 · 3만 적으면 몇 명이든 말이 된다.
 *
 * **`price > 0`인 줄만 센다.** 공짜로 들어온 것(`grant_free`)과 세트 보상
 * (`grant_poses`)은 값 0으로 꽂히는데, 그걸 세면 기본 도도와 기본 룸이
 * **영원히 1·2등**이다. 산 값을 같이 박아둔 덕에 여기서 한 줄로 갈린다.
 *
 * **누적이다.** 최근 7일로 세면 산 사람이 적은 동안 차례가 매일 뒤집혀서
 * 순위가 아니라 기분이 된다. 오래된 것이 계속 위에 서는 것은
 * 바로 위 줄(`새로 들어왔어요`)이 맡는다.
 *
 * 같은 수면 열쇠 차례로 갈린다 — **안 갈라두면 볼 때마다 순위가 바뀐다.**
 */
create or replace function shop_rank()
returns table (item_key text, rank int)
language sql stable security definer set search_path = public as $fn$
  select t.item_key, (row_number() over (order by t.n desc, t.item_key))::int
    from (
      select o.item_key, count(*) as n
        from costume_owned o
       where o.price > 0
       group by o.item_key
    ) t
$fn$;

grant execute on function shop_rank() to anon, authenticated;
