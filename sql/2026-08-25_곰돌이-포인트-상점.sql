-- 곰돌이 · 포인트 · 상점 채우기
--
-- **한 번도 얹은 적이 없는 덩이다.** 곰돌이와 포인트는 schema.sql에만 들어갔고
-- 여기 짝을 안 뒀다(커밋 `e3fa3af` ~ `d890850`). 그래서 지금까지 도는 DB에는
-- 이 표들이 없다. 여기에 한꺼번에 얹는다.
--
-- 여기 있는 것 —
--   * `gomdori` `costume_catalog` `costume_owned` `point_log`  담아두는 넷
--   * `costume_season` `shop_admins`                            상점 채우기가 쓰는 둘
--   * `stamp_points` `my_points` `grant_poses` `buy_costume`    셈하고 사는 넷
--   * Storage `shop` 통과 정책                                   올린 그림 두는 곳
--
-- **schema.sql의 같은 자리를 그대로 떠 온 것이다.** 고칠 일이 생기면 저쪽을 고치고
-- 여기도 같이 고친다 — 두 번 돌려도 되게 써 있어서 이미 얹은 DB에 다시 돌려도 된다.
--
-- 다 돌린 뒤 **관리자를 손으로 하나 넣어야** 상점 채우기 화면이 열린다.
--
--   insert into shop_admins (user_id)
--   select id from auth.users where email = '내메일@example.com'
--   on conflict do nothing;

-- ─────────────────────── 곰돌이와 코스튬 ───────────────────────
--
-- 여기 **포인트 잔액 칸이 없다.** 일부러 없다.
-- 담아두면 체크를 풀었을 때 되돌리는 코드를 따로 짜야 하고, 그 코드는 반드시 어딘가에서 틀어진다.
-- tasks에서 파생시켜 그때그때 세면 체크를 풀면 저절로 도로 빠진다.
--
-- 담아두는 것은 둘뿐이다 — **가진 것**과 **지금 입은 것**.
-- 잔액은 `가입 100P + 번 것 − 산 값의 합`이라 이 둘만 있으면 나온다.

-- 누가 체크했나 — **계정으로**. done_by(표시 이름)는 화면에 적는 것이고 이건 세는 것이다.
-- 이름으로 세면 상대가 별명을 바꾼 순간 옛 점수가 남의 것이 된다.
alter table tasks add column if not exists done_by_id uuid references auth.users;

-- 지금 입은 옷과 깐 방. 계정 하나에 한 줄.
create table if not exists gomdori (
  user_id    uuid primary key references auth.users on delete cascade,
  worn_bear  text not null default 'base',
  worn_room  text not null default 'room-base',
  updated_at timestamptz not null default now()
);

/*
 * 파는 것 — 무엇을 얼마에.
 *
 * **앱 코드(src/lib/costumes.ts)에도 같은 목록이 있다.** 일부러 둘이다.
 *   앱   — 앱과 같이 나가는 그림. 그림이 앱 안에 있어야 **상점이 오프라인에서 뜬다**
 *   서버 — 값·이름·파는 중. 값을 앱만 알면 `이 옷 0원이요` 하고 사는 걸 막을 방법이 없다
 *
 * **이름과 파는 중이 여기로 왔다**([상점 채우기](../design/관리자.html)).
 * 옷 한 벌 늘릴 때마다 이 파일을 고쳐 돌리는 건 파는 사람이 할 일이 아니다.
 * 앱은 아직 costumes.ts를 본다 — 값표를 읽어 덮는 것은 앱 쪽 일이고 여기서는 자리만 만든다.
 */
create table if not exists costume_catalog (
  item_key   text primary key,
  -- 'bear' 곰 스타일 · 'room' 방 테마 · 'pose' 세트 완성 보상
  kind       text not null,
  price      int  not null default 0,
  -- 어느 시즌 세트에 딸린 것인가. 비어 있으면 늘 있는 것.
  season     text,
  -- 상점 카드에 그대로 뜨는 이름. 여덟 자를 넘기면 103px 칸에서 잘린다.
  name       text,
  /*
   * 올린 그림이 Storage 어디에 있나 — `<대분류>/<중분류>/<종류>/<코드>.png`.
   * 통 이름(`shop`)은 안 적는다. 통을 옮기면 스물아홉 줄을 다 고쳐야 한다.
   * **비어 있으면 앱이 가진 그림으로 선다.**
   */
  img        text,
  /*
   * **올리자마자 팔지 않는다.** 새로 넣는 것은 숨김으로 들어오고,
   * 관리자가 켜야 상점에 뜬다 — 반쯤 그린 것이 상점에 뜨는 사고를 막는다.
   */
  active     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이미 값표가 있는 DB에도 같은 칸을 단다
alter table costume_catalog add column if not exists name       text;
alter table costume_catalog add column if not exists img        text;
alter table costume_catalog add column if not exists active     boolean not null default false;
alter table costume_catalog add column if not exists created_at timestamptz not null default now();
alter table costume_catalog add column if not exists updated_at timestamptz not null default now();

-- 가진 것 — 산 것과 받은 것.
-- **산 값을 같이 박아둔다.** 값이 나중에 바뀌어도 이미 산 것은 그때 값으로 남아야
-- 잔액이 뒤늦게 흔들리지 않는다.
create table if not exists costume_owned (
  user_id  uuid not null references auth.users on delete cascade,
  item_key text not null,
  price    int  not null default 0,
  got_at   timestamptz not null default now(),
  primary key (user_id, item_key)
);

-- ─── 값표의 씨앗 ────────────────────────────────────────────────
/*
 * 앱의 costumes.ts에 있던 스물아홉 줄. **여기서 심고, 다시는 안 덮는다.**
 *
 * 전에는 두 번 돌려도 되게 `do update`로 값을 다시 밀어 넣었다. 지금은 안 된다 —
 * **값표의 주인이 이 파일에서 [상점 채우기](../design/관리자.html)로 넘어갔다.**
 * 그대로 두면 관리자가 고쳐놓은 값과 이름이 schema.sql을 한 번 돌릴 때마다 되돌아간다.
 *
 * 그래서 부딪히면 **이름 칸이 비어 있는 줄만** 채운다. 이름 칸이 생기기 전에 심긴 줄이라는
 * 뜻이고, 그런 줄은 이미 앱이 팔고 있던 것이니 파는 중으로 같이 켠다.
 */
insert into costume_catalog (item_key, kind, price, season, name, active) values
  ('base',        'bear',   0, null, '기본 곰돌이', true),
  ('hat',         'bear', 100, null, '모자 곰', true),
  ('ribbon',      'bear', 100, null, '리본 곰', true),
  ('scarf',       'bear', 100, null, '목도리 곰', true),
  ('apron',       'bear', 150, null, '앞치마 곰', true),
  ('glasses',     'bear', 200, null, '안경 곰', true),
  ('overall',     'bear', 200, null, '멜빵 곰', true),
  ('chef',        'bear', 200, null, '요리사 곰', true),
  ('rabbit',      'bear', 300, null, '곰토끼', true),

  ('room-base',   'room',   0, null, '기본 룸', true),
  ('room-picnic', 'room', 300, null, '피크닉 룸', true),
  ('room-cafe',   'room', 400, null, '카페 룸', true),
  ('room-plant',  'room', 400, null, '식물 가득 룸', true),
  ('room-bed',    'room', 500, null, '포근한 침실', true),

  ('b-swim',      'bear', 300, 's-swim', '물놀이 곰', true),
  ('r-sea',       'room', 400, 's-swim', '여름 바다', true),
  ('pose-tube',   'pose',   0, 's-swim', '튜브 포즈', true),

  ('b-hall',      'bear', 300, 's-hall', '할로윈 곰', true),
  ('r-hall',      'room', 400, 's-hall', '할로윈 룸', true),
  ('pose-pump',   'pose',   0, 's-hall', '호박 포즈', true),

  ('b-xmas',      'bear', 350, 's-xmas', '산타 곰', true),
  ('r-xmas',      'room', 450, 's-xmas', '크리스마스 룸', true),
  ('pose-tree',   'pose',   0, 's-xmas', '트리 포즈', true),

  ('b-bloom',     'bear', 300, 's-bloom', '봄꽃 곰', true),
  ('r-bloom',     'room', 400, 's-bloom', '봄꽃 룸', true),
  ('pose-petal',  'pose',   0, 's-bloom', '꽃잎 포즈', true),

  ('b-vac',       'bear', 350, 's-vac', '여름휴가 곰', true),
  ('r-beach',     'room', 450, 's-vac', '해변 룸', true),
  ('pose-parcel', 'pose',   0, 's-vac', '파라솔 포즈', true)
on conflict (item_key) do update
  -- **덮지 않는다.** 이름이 비어 있는 줄(칸이 생기기 전에 심긴 줄)만 채워 켠다.
  set name   = coalesce(costume_catalog.name, excluded.name),
      active = costume_catalog.active or costume_catalog.name is null;

/*
 * 시즌 세트 — **관리자가 짓고 이름 붙인다.**
 *
 * 시즌 밑은 층이 하나 더 있다.
 *
 *   시즌 ─ 계절 ─ 봄꽃 세트 · 물놀이 세트 · 여름휴가 세트
 *        └ 기념일 ─ 할로윈 세트 · 크리스마스 세트
 *
 * **중분류도 세트도 늘어난다.** 중분류는 [[shop_family]]에, 세트는 여기에 한 줄씩.
 * 물건은 세트를 고르고, 중분류는 그 세트를 따라간다(아래 `catalog_family` 트리거) —
 * 물건마다 중분류를 고르게 두면 할로윈 곰은 기념일인데 할로윈 방은 계절인 일이 생긴다.
 *
 * 세트가 **열리는 조건은 여기 안 적는다.** 곰 하나·방 하나·소품 하나가 값표에 다 차면
 * 열린 것이고, 그건 값표를 세면 나온다. 적어두면 값표와 어긋날 자리가 하나 더 생긴다.
 */
create table if not exists costume_season (
  season_key text primary key,
  name       text not null,
  -- 상점 칩이 서는 차례
  ord        int  not null default 0,
  note       text,
  created_at timestamptz not null default now()
);

insert into costume_season (season_key, name, ord, note) values
  ('s-swim',  '물놀이 세트',   1, '여름 바다에서 신나게!'),
  ('s-hall',  '할로윈 세트',   2, '한 밤의 사탕 사냥'),
  ('s-xmas',  '크리스마스 세트', 3, '눈 오는 밤의 곰돌이'),
  ('s-bloom', '봄꽃 세트',     4, '꽃잎이 날리는 날'),
  ('s-vac',   '여름휴가 세트',  5, '느긋한 바닷가 하루')
on conflict (season_key) do nothing;   -- 값표와 같은 까닭 — 고쳐놓은 이름을 안 덮는다

-- ─── 대분류와 중분류 ────────────────────────────────────────────
/*
 * 파는 것이 어느 칩 아래 서는가. **두 층이다.**
 *
 *   대분류 ─ 꾸미기 · 시즌          상점 위 칩
 *     중분류 ─ 일상 · 코스튬 …      그 아래 칩
 *
 * 전에는 `family text` 칸 하나에 `daily`/`costume`을 적어뒀다. 그걸 걷어낸다 —
 * **중분류는 관리자가 늘리는 것**이라 칸에 적어두면 늘릴 때마다 이 파일을 고쳐야 한다.
 *
 * `방`과 `내 옷장`은 여기 안 든다. **가로지르는 버튼**이라서다 —
 * 방은 `kind = 'room'`이고 내 옷장은 `costume_owned`다. 둘 다 대분류를 가로질러 고른다.
 */
create table if not exists shop_group (
  -- **열쇠가 곧 폴더 이름이다.** 그림이 `shop/<이 값>/…` 밑에 쌓인다.
  group_key text primary key check (group_key ~ '^[a-z][a-z0-9-]{1,23}$'),
  name      text not null,
  ord       int  not null default 0
);

/*
 * 중분류 — **관리자가 늘린다.**
 *
 * 이름과 **폴더를 같이 받는다.** 폴더를 따로 안 받으면 `기념일`을 무엇으로 적어
 * 폴더를 만들지 정할 길이 없다. 그렇다고 이름과 폴더를 두 칸에 나눠 담으면
 * 이름을 고칠 때 폴더가 따라 움직여야 하나 말아야 하나가 매번 물음이 된다.
 *
 * 그래서 **열쇠가 곧 폴더다.** 관리자는 `기념일`과 `holiday` 둘을 적고,
 * 뒤엣것은 한 번 정하면 안 바뀐다 — 이미 쌓인 그림이 그 이름 밑에 있다.
 */
create table if not exists shop_family (
  family_key text primary key check (family_key ~ '^[a-z][a-z0-9-]{1,23}$'),
  group_key  text not null references shop_group on delete restrict,
  name       text not null,
  ord        int  not null default 0,
  -- 끈 중분류는 상점 칩에서 빠진다. 그 안의 물건은 각자 `active`를 따른다.
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists shop_family_group on shop_family (group_key, ord);

insert into shop_group (group_key, name, ord) values
  ('deco',   '꾸미기', 1),
  ('season', '시즌',   2)
on conflict (group_key) do nothing;

insert into shop_family (family_key, group_key, name, ord, active) values
  ('daily',    'deco',   '일상',   1, true),
  ('costume',  'deco',   '코스튬', 2, true),
  /*
   * 룸은 **꺼진 채로 심는다.** 그림이 쌓일 폴더는 있어야 하는데
   * 상점에서는 `방` 버튼으로 따로 가니 중분류 칩으로 또 세우면 같은 것이 두 번 뜬다.
   * 켜고 싶으면 관리자가 켠다.
   */
  ('room',     'deco',   '룸',     3, false),
  ('seasonal', 'season', '계절',   1, true),
  ('holiday',  'season', '기념일', 2, true)
on conflict (family_key) do nothing;

-- ─── 새로 파는 것 ──────────────────────────────────────────────
-- 코스튬 칩이 요리사·곰토끼 둘뿐이면 눌렀을 때 허전하다. 다섯을 더 심는다.
-- 위 씨앗과 같은 규칙이다 — **심고, 다시는 안 덮는다.**
insert into costume_catalog (item_key, kind, price, season, name, active) values
  ('knit',       'bear', 150, null, '니트 곰', false),
  ('shirt',      'bear', 150, null, '셔츠 곰', false),
  ('detective',  'bear', 350, null, '탐정 곰', false),
  ('princess',   'bear', 400, null, '공주 곰', false),
  ('wizard',     'bear', 400, null, '마법사 곰', false)
on conflict (item_key) do nothing;

-- ─── 물건이 어느 중분류인가 ─────────────────────────────────────
alter table costume_catalog add column if not exists family_key text references shop_family;

-- 옛 `family` 칸에 있던 것을 옮긴다. 값이 같아서 그대로 들어간다.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_name = 'costume_catalog' and column_name = 'family') then
    execute 'update costume_catalog set family_key = family where family_key is null and family is not null';
    execute 'alter table costume_catalog drop column family';
  end if;
end $$;

/*
 * 시즌 물건의 중분류는 **세트가 정한다.** 물건마다 따로 적게 두면
 * 할로윈 곰은 기념일인데 할로윈 방은 계절인 일이 생긴다.
 */
alter table costume_season add column if not exists family_key text references shop_family;

update costume_season set family_key = v.f
  from (values ('s-swim','seasonal'), ('s-bloom','seasonal'), ('s-vac','seasonal'),
               ('s-hall','holiday'),  ('s-xmas','holiday')) as v(k, f)
 where costume_season.season_key = v.k and costume_season.family_key is null;

/*
 * 중분류는 **한 번만** 정해준다. 이미 값이 든 줄은 안 건드린다 —
 * 관리자가 옮겨둔 것을 schema.sql이 되돌리면 안 된다.
 */
update costume_catalog set family_key = 'daily'
 where kind = 'bear' and season is null and family_key is null
   and item_key in ('base', 'hat', 'ribbon', 'scarf', 'knit', 'shirt', 'apron', 'glasses', 'overall');

update costume_catalog set family_key = 'costume'
 where kind = 'bear' and season is null and family_key is null
   and item_key in ('chef', 'rabbit', 'detective', 'princess', 'wizard');

update costume_catalog set family_key = 'room'
 where kind = 'room' and season is null and family_key is null;

/*
 * 시즌 물건은 제 세트를 따라간다. 넣을 때도 고칠 때도 여기서 맞춰주니
 * **관리자가 세트만 고르면 중분류는 안 물어봐도 된다.**
 */
create or replace function sync_catalog_family()
returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.season is not null then
    select family_key into new.family_key from costume_season where season_key = new.season;
  end if;
  new.updated_at = now();
  return new;
end $fn$;

drop trigger if exists catalog_family on costume_catalog;
create trigger catalog_family before insert or update on costume_catalog
  for each row execute function sync_catalog_family();

-- 이미 들어 있던 시즌 물건들도 한 번 맞춰준다
update costume_catalog c set family_key = s.family_key
  from costume_season s
 where c.season = s.season_key and c.family_key is distinct from s.family_key;

-- ─── 코드는 숫자로 딴다 ─────────────────────────────────────────
/*
 * 새로 올리는 것의 코드는 `0000001`부터 하나씩 올라간다.
 *
 * 전에는 이름에서 지었다(`모자 곰` → `b-hat`). 그러면 **이름을 고칠 때마다
 * 코드를 고쳐야 하나**가 따라오고, 고치면 이미 산 사람의 줄이 가리킬 데를 잃는다.
 * 숫자는 이름과 아무 상관이 없어서 그 물음이 아예 없다.
 *
 * **이미 있는 `hat` · `room-cafe`는 안 바꾼다.** 바꾸는 순간
 * `costume_owned`와 `gomdori.worn_bear`가 없는 것을 가리킨다.
 * 옛 이름과 새 숫자가 섞여 있는 건 보기 싫지만, 섞인 채로 도는 게 맞다.
 */
create sequence if not exists costume_code_seq start 1;

create or replace function next_item_code()
returns text language sql set search_path = public as $fn$
  select lpad(nextval('costume_code_seq')::text, 7, '0');
$fn$;

alter table costume_catalog alter column item_key set default next_item_code();

/*
 * **번호표를 뽑을 수 있게 열어준다.** 이걸 빼먹으면 관리자가 코드를 손으로 적지 않는 한
 * `permission denied for sequence`로 막힌다 — RLS가 아니라 권한에서 막히는 거라
 * 화면에는 `왜 안 되는지 알 수 없는 오류`로 뜬다.
 *
 * Supabase 밖(내려받은 postgres 같은 데)에는 이 역할이 없어서 넘어가게 뒀다.
 */
do $$
begin
  grant usage, select on sequence costume_code_seq to authenticated;
exception when undefined_object or insufficient_privilege then
  raise notice 'authenticated 역할이 없어 번호표 권한은 건너뛴다';
end $$;

/*
 * 세트 열쇠도 손으로 안 적는다. `s000001`부터 하나씩 올라간다.
 *
 * 물건 코드와 **번호표를 따로 쓴다.** 한 통에서 뽑으면 물건 스물아홉 개를 넣은 뒤
 * 만든 세트가 `0000030`이 되어 물건 코드처럼 읽힌다. 앞에 `s`를 붙이는 것도 같은 까닭이다.
 *
 * **이미 있는 `s-swim`·`s-hall`은 안 바꾼다** — 값표의 `season`이 그걸 가리키고 있다.
 */
create sequence if not exists costume_season_seq start 1;

create or replace function next_season_code()
returns text language sql set search_path = public as $fn$
  select 's' || lpad(nextval('costume_season_seq')::text, 6, '0');
$fn$;

alter table costume_season alter column season_key set default next_season_code();

do $$
begin
  grant usage, select on sequence costume_season_seq to authenticated;
exception when undefined_object or insufficient_privilege then
  raise notice 'authenticated 역할이 없어 세트 번호표 권한은 건너뛴다';
end $$;

/*
 * 세트의 중분류는 **시즌 밑에 있는 것이어야 한다.**
 *
 * 꾸미기 밑의 중분류를 세트에 달면 그 세트의 물건들이 트리거를 타고
 * `꾸미기 > 일상`으로 끌려간다 — 시즌 물건인데 시즌 칩에서 사라진다.
 * 상점에서 물건이 통째로 없어지는 꼴이라 여기서 막는다.
 */
create or replace function season_family_guard()
returns trigger language plpgsql set search_path = public as $fn$
declare g text;
begin
  if new.family_key is null then return new; end if;
  select group_key into g from shop_family where family_key = new.family_key;
  if g is distinct from 'season' then
    raise exception '세트의 중분류는 시즌 밑에 있어야 합니다 (%)', new.family_key;
  end if;
  return new;
end $fn$;

drop trigger if exists season_family on costume_season;
create trigger season_family before insert or update on costume_season
  for each row execute function season_family_guard();

/*
 * 값표의 `season`은 **있는 세트를 가리켜야 한다.** 없는 세트를 가리키면
 * 트리거가 중분류를 못 찾아 비워버리고, 그 물건은 어느 칩에도 안 선다.
 *
 * 이미 어긋난 줄이 있는 DB에서는 걸지 않고 넘어간다 — 여기서 멈추면
 * 나머지가 다 안 들어간다. 그때는 `notice`가 무엇을 봐야 하는지 알려준다.
 */
do $$
begin
  if exists (
    select 1 from costume_catalog c
     where c.season is not null
       and not exists (select 1 from costume_season s where s.season_key = c.season)
  ) then
    raise notice '없는 세트를 가리키는 물건이 있어 이음줄을 안 걸었다';
  else
    alter table costume_catalog
      add constraint costume_catalog_season_fk
      foreign key (season) references costume_season (season_key) on update cascade;
  end if;
exception when duplicate_object or duplicate_table then null;
end $$;

-- ─── 그림이 쌓이는 자리 ─────────────────────────────────────────
/*
 * `shop/<대분류>/<중분류>/<종류>/<코드>.png`
 *
 *   shop/deco/daily/gomdori/0000001.png
 *   shop/deco/room/background/0000020.png
 *   shop/season/holiday/prop/0000016.png
 *
 * **폴더가 셋인 까닭**은 그림이 오는 길이 셋이라서다 — 대분류로 시즌을 통째로 열고 닫고,
 * 중분류로 한 칩을 채우고, 종류로 그리는 사람이 다르다(곰은 캐릭터, 방은 배경).
 * 한 통에 다 부으면 스물아홉 장이 넘어가는 순간 무엇이 무엇인지 이름으로만 가려야 한다.
 *
 * 앱은 `img`에 적힌 것을 그대로 쓴다. 이 함수는 **관리자가 올릴 자리를 고를 때** 쓴다.
 */
create or replace function shop_folder(item text)
returns text language sql stable set search_path = public as $fn$
  select g.group_key || '/' || f.family_key || '/' ||
         case c.kind when 'bear' then 'gomdori'
                     when 'room' then 'background'
                     else 'prop' end
    from costume_catalog c
    join shop_family f on f.family_key = c.family_key
    join shop_group  g on g.group_key  = f.group_key
   where c.item_key = item;
$fn$;

-- ─── 얼마나 벌었나 ──────────────────────────────────────────────
/*
 * | 조건 | 보상 |
 * |---|---|
 * | 할 일 하나 **최초** 완료 | +5P |
 * | 하루에 받는 끝 | **30P** (여섯 개) |
 * | 그 주에 10개 | +20P |
 * | 그 주에 20개 | 추가 +30P |
 * | 그 주에 30개 | 추가 +50P |
 * | 첫 완료 같은 업적 | 한 번뿐인 별도 보상 |
 *
 * **한 줄이 한 번이다.** 준 것을 여기 적어두고 **다시는 안 준다** —
 * 그래서 체크를 풀었다 다시 눌러도 두 번 안 들어오고, 잘못 누른 것을 풀면
 * 값은 남지만 **더 얻을 것도 없다.** 되돌리는 코드가 없어서 틀어질 데가 없다.
 *
 * 볼 때마다 다시 세는 방식은 접었다. 그러면 오후에 할 일 하나를 적었다고
 * 아침에 본 포인트가 깎인다 — 이미 옷을 샀으면 잔액이 음수까지 간다.
 */
create table if not exists point_log (
  user_id uuid not null references auth.users on delete cascade,
  -- 'task' 할 일 하나 · 'week10' 'week20' 'week30' 주간 · 'first' 업적
  kind    text not null,
  -- 무엇 때문인지. 할 일 id · 그 주 월요일 · 업적 열쇠. **같은 것으로 두 번 안 준다.**
  ref     text not null,
  amount  int  not null,
  -- 어느 날 몫인가. 하루 상한을 이걸로 센다.
  on_date date not null,
  got_at  timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

/*
 * 아직 안 준 것을 채워 넣는다. 이미 준 줄은 안 건드린다.
 * 며칠 만에 앱을 켜도 그 사이 것이 이때 한꺼번에 들어온다.
 *
 * security definer라 RLS를 안 타니 **볼 수 있는 할 일인지 여기서 직접 가린다.**
 */
create or replace function stamp_points()
returns void language plpgsql security definer set search_path = public as $fn$
declare me uuid := auth.uid();
begin
  if me is null then return; end if;

  /*
   * 1) 할 일 하나에 5P — **하루 30P까지.**
   * 그 날 이미 준 것에 이번 순번을 더해 30을 넘지 않는 데까지만 넣는다.
   * 순번은 고친 때 순이라 먼저 끝낸 것이 먼저 값을 받는다.
   */
  insert into point_log (user_id, kind, ref, amount, on_date)
  select me, 'task', f.id::text, 5, f.done_on
    from (
      select t.id, t.done_on,
             row_number() over (partition by t.done_on order by t.updated_at, t.id) as seq
        from tasks t
       where t.done
         and t.deleted_at is null
         and t.done_on is not null
         and t.done_by_id = me
         and (t.owner_id = me or is_member(t.room_id))
         and not exists (
           select 1 from point_log p
            where p.user_id = me and p.kind = 'task' and p.ref = t.id::text
         )
    ) f
    left join (
      select on_date, sum(amount) as given
        from point_log where user_id = me and kind = 'task' group by on_date
    ) g on g.on_date = f.done_on
   where coalesce(g.given, 0) + f.seq * 5 <= 30
  on conflict do nothing;

  /*
   * 2) 주간 — 그 주에 값을 받은 할 일이 10·20·30개를 넘을 때마다 한 번씩.
   * 주는 **월요일에 시작한다**(`date_trunc('week')`). 앱 설정의 주 시작과 따로다 —
   * 화면을 어떻게 보든 한 주의 길이는 같아야 값이 흔들리지 않는다.
   */
  insert into point_log (user_id, kind, ref, amount, on_date)
  select me, s.kind, w.wk::text, s.amount, w.wk
    from (
      select date_trunc('week', on_date)::date as wk, count(*) as n
        from point_log where user_id = me and kind = 'task'
       group by 1
    ) w
    cross join (values ('week10', 10, 20), ('week20', 20, 30), ('week30', 30, 50))
              as s(kind, need, amount)
   where w.n >= s.need
  on conflict do nothing;

  -- 3) 업적 — 첫 완료. 한 번뿐이라 ref가 열쇠 그 자체다.
  insert into point_log (user_id, kind, ref, amount, on_date)
  select me, 'first', 'first-task', 50, min(on_date)
    from point_log where user_id = me and kind = 'task'
   having count(*) > 0
  on conflict do nothing;
end $fn$;

/*
 * 지금 얼마 있나 — **가입 100P + 받은 것 − 산 값의 합.**
 *
 * 셈하기 전에 안 준 것부터 채운다. 앱이 따로 부를 자리를 안 만들어도
 * 잔액을 볼 때마다 그 사이 것이 들어온다.
 *
 * 가입 100P를 어디에도 안 적어둔다. 계정이 있으면 받은 것이니 늘 더하면 된다.
 */
create or replace function my_points()
returns int language plpgsql security definer set search_path = public as $fn$
begin
  perform stamp_points();
  /*
   * 세트도 여기서 본다. 전에는 **살 때만** 봤는데, 그러면 소품이 숨김인 채로 세트를
   * 다 모은 사람은 관리자가 켜준 뒤에도 **뭔가 하나 더 사기 전까지** 못 받는다.
   */
  perform grant_poses();
  return 100
    + coalesce((select sum(amount)::int from point_log     where user_id = auth.uid()), 0)
    - coalesce((select sum(price)::int  from costume_owned where user_id = auth.uid()), 0);
end $fn$;

-- ─── 사기 ───────────────────────────────────────────────────────
/*
 * 세트를 다 모으면 포즈가 들어온다.
 * **살 때마다 확인한다** — 곰을 먼저 샀든 방을 먼저 샀든 그 순간 채워져야 한다.
 */
create or replace function grant_poses()
returns void language sql security definer set search_path = public as $fn$
  insert into costume_owned (user_id, item_key, price)
  select auth.uid(), p.item_key, 0
    from costume_catalog p
   where p.kind = 'pose'
     and p.season is not null
     -- 숨김인 소품은 아직 안 준다. 켜지면 다음에 잔액을 볼 때 들어온다.
     and p.active
     /*
      * **살 것이 하나라도 있는 세트여야 한다.** 이 줄이 없으면 소품만 덜렁 올려둔
      * 새 세트가 `다 모았다`로 읽혀서 모두에게 그냥 들어간다 —
      * 관리자가 곰을 올리기 전에 소품부터 올리면 바로 그 꼴이 된다.
      */
     and exists (
       select 1 from costume_catalog n2
        where n2.season = p.season and n2.kind <> 'pose'
     )
     -- 숨김이 된 곰·방도 그대로 센다. 빼면 하나 숨기는 순간 세트가 거저 열린다.
     and not exists (
       select 1 from costume_catalog n
        where n.season = p.season
          and n.kind <> 'pose'
          and n.item_key not in (
            select item_key from costume_owned where user_id = auth.uid()
          )
     )
  on conflict (user_id, item_key) do nothing;
$fn$;

/*
 * **값은 서버가 정한다.** 앱이 값을 같이 보내면 `이 옷 0원이요`를 막을 수가 없다.
 * 포즈는 파는 물건이 아니라 여기서 못 산다 — 세트를 다 모으면 위에서 저절로 들어온다.
 */
create or replace function buy_costume(item text)
returns int language plpgsql security definer set search_path = public as $fn$
declare
  cost  int;
  sort  text;
  live  boolean;
  purse int;
begin
  select price, kind, active into cost, sort, live
    from costume_catalog where item_key = item;
  if cost is null then
    raise exception '없는 코스튬입니다';
  end if;
  if sort = 'pose' then
    raise exception '포즈는 세트를 다 모으면 드립니다';
  end if;
  -- 숨김으로 둔 것은 상점에 안 뜨지만, **열쇠만 알면 부를 수 있는 자리**라 여기서도 막는다
  if not live then
    raise exception '아직 파는 물건이 아닙니다';
  end if;

  select my_points() into purse;
  if purse < cost then
    raise exception '포인트가 모자랍니다';
  end if;

  insert into costume_owned (user_id, item_key, price)
       values (auth.uid(), item, cost)
  on conflict (user_id, item_key) do nothing;

  perform grant_poses();
  return my_points();
end $fn$;

-- ─── 누가 채우나 ────────────────────────────────────────────────
/*
 * **상점을 채우는 사람.** 시안의 `아직 안 정한 것` 첫 줄에 있던 물음의 답이다.
 *
 * 역할 칸을 어딘가에 하나 더 다는 대신 표를 따로 뒀다. `auth.users`에 칸을 붙이면
 * Supabase가 관리하는 표를 우리가 건드리는 것이 되고, `room_members.role`에 얹으면
 * **방 안의 역할과 상점의 역할이 한 칸에 섞인다** — 방 주인은 상점과 아무 상관이 없다.
 *
 * **이 표에 넣는 길은 앱에 없다.** 여기 SQL Editor에서 손으로 넣는다 —
 * 관리자를 앱에서 늘릴 수 있게 하면 관리자 하나가 새면 상점 전체가 샌다.
 *
 *   insert into shop_admins (user_id)
 *   select id from auth.users where email = '내메일@example.com'
 *   on conflict do nothing;
 */
create table if not exists shop_admins (
  user_id  uuid primary key references auth.users on delete cascade,
  added_at timestamptz not null default now()
);

/*
 * 정책 안에서 `shop_admins`를 그냥 조회하면 그 표의 정책이 다시 불린다.
 * `is_member`와 같은 까닭으로 `security definer`로 감싼다.
 */
create or replace function is_shop_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from shop_admins where user_id = auth.uid());
$fn$;

/*
 * 그림 두는 곳 — 통 하나, 파일 이름은 코드 그대로 `shop/<코드>.png`.
 * **표의 열쇠와 파일 이름이 같아야** 어느 그림이 어느 물건인지 대조할 일이 없다.
 *
 * 통은 열어둔다(public). 상점 그림은 숨길 것이 아니고, 닫아두면 앱이 볼 때마다
 * 서명한 주소를 받아와야 해서 상점 격자 스물아홉 칸에 요청이 스물아홉 번 붙는다.
 *
 * Storage는 우리 표가 아니라 **Supabase 것**이라 권한이 모자랄 수 있다.
 * 막히면 멈추지 않고 넘어간다 — 대시보드에서 손으로 만들면 되는 일이다.
 */
do $$
begin
  insert into storage.buckets (id, name, public) values ('shop', 'shop', true)
  on conflict (id) do nothing;

  drop policy if exists "상점 그림은 누구나 본다"   on storage.objects;
  drop policy if exists "상점 그림은 관리자가 올린다" on storage.objects;
  drop policy if exists "상점 그림은 관리자가 바꾼다" on storage.objects;

  create policy "상점 그림은 누구나 본다" on storage.objects
    for select using (bucket_id = 'shop');
  create policy "상점 그림은 관리자가 올린다" on storage.objects
    for insert with check (bucket_id = 'shop' and is_shop_admin());
  create policy "상점 그림은 관리자가 바꾼다" on storage.objects
    for update using (bucket_id = 'shop' and is_shop_admin());
exception when insufficient_privilege then
  raise notice 'shop 통은 대시보드 Storage에서 만들어 주세요 — public, 관리자만 쓰기';
end $$;

-- ─── RLS ────────────────────────────────────────────────────────
alter table point_log       enable row level security;
alter table gomdori         enable row level security;
alter table costume_owned   enable row level security;
alter table costume_catalog enable row level security;
alter table costume_season  enable row level security;
alter table shop_admins     enable row level security;
alter table shop_group      enable row level security;
alter table shop_family     enable row level security;

drop policy if exists "내 것만"     on gomdori;
drop policy if exists "내가 넣는다" on gomdori;
drop policy if exists "내가 고친다" on gomdori;
create policy "내 것만"     on gomdori for select using (user_id = auth.uid());
create policy "내가 넣는다" on gomdori for insert with check (user_id = auth.uid());
create policy "내가 고친다" on gomdori for update using (user_id = auth.uid());

/*
 * 가진 것은 **읽기만** 열어둔다. 넣는 길은 위 buy_costume 하나뿐이다 —
 * insert를 열면 잔액을 안 보고 그냥 넣을 수 있다.
 */
drop policy if exists "내 것만" on costume_owned;
create policy "내 것만" on costume_owned for select using (user_id = auth.uid());

/*
 * 받은 것도 **읽기만** 열어둔다. 넣는 길은 stamp_points 하나뿐이다 —
 * insert를 열면 아무 값이나 적어 넣을 수 있다.
 */
drop policy if exists "내 것만" on point_log;
create policy "내 것만" on point_log for select using (user_id = auth.uid());

/*
 * 값표 — **파는 것만 보인다.** 숨김으로 둔 것은 관리자에게만 보인다.
 * 전에는 누구나 다 봤다. 그때는 값표가 앱과 같은 목록이라 새로 들어올 것이 없었고,
 * 지금은 **아직 안 그린 것이 여기 쌓인다** — 크리스마스 옷이 시월에 목록으로 새면
 * 시즌을 여는 재미가 그날로 없어진다.
 */
drop policy if exists "누구나 본다"     on costume_catalog;
drop policy if exists "파는 것만 보인다" on costume_catalog;
drop policy if exists "관리자가 올린다"  on costume_catalog;
drop policy if exists "관리자가 고친다"  on costume_catalog;
create policy "파는 것만 보인다" on costume_catalog
  for select using (active or is_shop_admin());
create policy "관리자가 올린다" on costume_catalog
  for insert with check (is_shop_admin());
create policy "관리자가 고친다" on costume_catalog
  for update using (is_shop_admin());
/*
 * **지우는 정책은 일부러 없다.** 산 사람의 `costume_owned`에 열쇠가 남아 있어서,
 * 값표에서 줄을 빼면 그 사람의 옷이 이름 없는 것이 된다.
 * 그만 파는 길은 `active`를 끄는 것 하나다.
 */

/*
 * 대분류와 중분류 — 누구나 읽는다. 상점 칩이 이걸로 서니 안 보이면 화면이 빈다.
 * **끈 중분류(`active = false`)까지 보인다** — 칩에서 뺄지는 앱이 정할 일이고,
 * 여기서 감추면 이미 그 중분류에 든 물건이 어디 것인지 앱이 모르게 된다.
 */
drop policy if exists "누구나 본다"   on shop_group;
drop policy if exists "관리자가 고친다" on shop_group;
create policy "누구나 본다"   on shop_group for select using (true);
create policy "관리자가 고친다" on shop_group for update using (is_shop_admin());

drop policy if exists "누구나 본다"   on shop_family;
drop policy if exists "관리자가 짓는다" on shop_family;
drop policy if exists "관리자가 고친다" on shop_family;
create policy "누구나 본다"   on shop_family for select using (true);
create policy "관리자가 짓는다" on shop_family for insert with check (is_shop_admin());
create policy "관리자가 고친다" on shop_family for update using (is_shop_admin());
/*
 * **대분류는 못 늘린다.** insert 정책이 없다 — 꾸미기와 시즌 둘이 상점 칩의 뼈대이고,
 * 셋째가 생기면 화면부터 다시 그려야 한다. 늘릴 일이 생기면 그때 SQL로 넣는다.
 *
 * 중분류도 **지우는 정책은 없다.** 든 물건이 가리킬 데를 잃는다 — `active`를 끈다.
 */

/*
 * 세트 — 누구나 읽고 **관리자가 짓는다.** 이름도 차례도 여기서 바꾼다.
 * 지우는 정책은 없다. 값표의 `season`이 가리키고 있어서,
 * 빼면 그 물건들이 어느 칩에도 안 선다.
 */
drop policy if exists "누구나 본다"   on costume_season;
drop policy if exists "관리자가 짓는다" on costume_season;
drop policy if exists "관리자가 고친다" on costume_season;
create policy "누구나 본다"   on costume_season for select using (true);
create policy "관리자가 짓는다" on costume_season for insert with check (is_shop_admin());
create policy "관리자가 고친다" on costume_season for update using (is_shop_admin());

/*
 * 관리자 명단은 **자기 줄만** 보인다 — 앱이 `나는 관리자인가`를 물어볼 자리다.
 * 넣고 빼는 정책은 없다. 그건 SQL Editor에서 손으로 하는 일이다.
 */
drop policy if exists "나인지만 본다" on shop_admins;
create policy "나인지만 본다" on shop_admins for select using (user_id = auth.uid());
