import type { Costume, CostumeSet, Shop, ShopFamily, ShopGroup } from './types';

/**
 * 파는 것 — 이름과 그림과 가격.
 *
 * **주인은 서버다.** 앱이 켜지면 `costume_catalog`을 읽어 이 목록을 덮는다
 * ([gomdori.tsx](gomdori.tsx)). 여기 있는 것은 **못 읽었을 때 대신 서는 것**이다 —
 * 상점이 오프라인에서도 떠야 하고, 로그인 전에도 곰돌이는 서 있어야 한다.
 *
 * 그래서 아래 가격들은 **화면에 적는 것**이지 치르는 가격이 아니다.
 * 진짜로 얼마인지도, 무엇이 파는 중인지도 늘 서버가 정한다.
 *
 * | 어디 | 무엇을 | 왜 |
 * |---|---|---|
 * | 여기 | **그림**과 대비책 | 그림이 앱과 같이 나가니, 못 읽어도 기본 곰돌이는 서 있어야 한다 |
 * | 서버 | 이름·가격·분류·파는 중 | 가격을 앱만 알면 `이 옷 0원이요` 하고 사는 걸 막을 수가 없다 |
 *
 * **여기 있는 것은 서버에 같은 열쇠가 있으면 진다.** 그림만 빼고 —
 * 올린 그림이 없는 물건은 여기 `img`를 그대로 쓴다.
 *
 * `img`가 없는 것은 아직 안 그린 것이다. 그림이 오면 파일만 넣으면 뜬다.
 */

/**
 * 꾸미기 — **곰돌이 그대로 옷만 바뀐다.** 니트·셔츠·모자 같은 일상 옷.
 *
 * **지금은 기본 곰돌이 하나뿐이다.** 모자·리본·목도리 …는 이름과 가격만 있고 그림이 없어서
 * 상점에 회색 네모로 떠 있었다 — 파는 물건처럼 보이는데 사도 아무것도 안 바뀌는 칸이라
 * [빈 껍데기 지우기](../../sql/2026-08-26_빈-껍데기-지우고-코스튬-셋.sql)에서 가격표째 걷어냈다.
 * **그림이 그려지면 그때 한 줄씩 돌아온다.**
 */
export const DAILY: Costume[] = [
  { key: 'base', name: '기본 곰돌이', price: 0, kind: 'bear', family: 'daily', img: '/gomdori/front.png' },
];

/**
 * 코스튬 — **딴 사람이 된다.** 공주·마법사처럼 통째로 변신하는 것.
 *
 * **비어 있다. 일부러 비어 있다.**
 *
 * 한때 곰토끼·곰드래곤·공주 곰·마법사 곰 넷이 이름과 가격만 여기 있었다.
 * `서버를 못 읽었을 때 이름이라도 뜨게` 남겨둔 것이었는데, 그게 **가격표를 비운 뒤에도
 * 상점에 그대로 떴다** — 그림 없는 회색 네모 넷이, 파는 물건처럼.
 * 우리가 스물아홉 줄을 걷어낸 그 문제를 앱 쪽에서 다시 만든 것이다.
 *
 * **여기 있어야 하는 것은 `그림을 앱이 들고 있는 것`뿐이다.** 그게 이 목록의 뜻이다 —
 * 못 읽었을 때 대신 서려면 **그림이 있어야 서는데**, 이름만 있으면 설 수가 없다.
 *
 * 파는 옷은 이름도 가격도 그림도 다 서버에 있다. 서버를 못 읽으면 **안 뜨는 것이 맞다** —
 * 파는 옷은 안 뜨면 안 뜨는 대로 되지만, 곰돌이가 없으면 홈이 빈다.
 * 그래서 기본 곰돌이와 기본 룸 둘만 앱이 들고 나간다.
 */
export const COSTUMES: Costume[] = [];

/** 곰 옷 전부 — 옷장에서 한 줄로 볼 때 쓴다 */
export const BEARS: Costume[] = [...DAILY, ...COSTUMES];

/**
 * 방 테마 — 곰이 아니라 배경이라 칩을 따로 쓴다. 한 장이면 끝이라 그리는 값이 싸다.
 *
 * **기본 룸 하나뿐이다.** 피크닉·카페·식물·침실도 그림 없는 줄이라 같이 걷어냈다.
 */
export const ROOMS: Costume[] = [
  { key: 'room-base', name: '기본 룸', price: 0, kind: 'room', family: 'room', img: '/gomdori/room.png' },
];

/**
 * 시즌 세트 — **묶어 팔지 않는다.**
 * 곰과 방을 따로 사고, 둘을 다 모으면 포즈가 딸려온다.
 *
 * 묶어 팔면 낱개 가격과 묶음 가격 둘을 관리해야 하고,
 * 크리스마스 방만 갖고 싶은 사람이 곰까지 사게 된다.
 * **깎아주는 대신 하나 더 준다** — 깎아주기는 산 다음에 남는 것이 없고 포즈는 남는다.
 *
 * 포즈에 가격이 없는 까닭도 같다. 가격이 붙는 순간 **못 산 것**이 되고,
 * 그러면 받는 것이 아니라 안 사면 못 갖는 것으로 읽힌다.
 *
 * **지금은 비어 있다.** 물놀이·할로윈·크리스마스·봄꽃·여름휴가 다섯이 있었는데
 * 열다섯 줄이 다 이름뿐인 것이라 세트째 걷어냈다. 세트는 이제
 * [상점 채우기](../../design/관리자.html)에서 관리자가 짓는다 — **여기 다시 적을 일은 없다.**
 * 서버에서 내려온 것이 그대로 선다.
 */
export const SETS: CostumeSet[] = [];

/** 열쇠 하나로 찾는다 — 가진 것 목록에는 열쇠만 들어 있다 */
export const CATALOG: Costume[] = [
  ...BEARS,
  ...ROOMS,
  ...SETS.flatMap((s) => [s.bear, s.room, s.pose]),
];

/** 대분류 — 서버의 `shop_group`과 같다. 둘뿐이라 늘릴 자리를 안 뒀다. */
export const GROUPS: ShopGroup[] = [
  { key: 'deco', name: '꾸미기' },
  { key: 'season', name: '시즌' },
];

/**
 * 중분류 — 서버의 `shop_family`와 같다.
 * **`room`은 꺼진 채로 둔다** — 상점에서는 `방` 버튼으로 따로 가니
 * 중분류 칩으로 또 세우면 같은 것이 두 번 뜬다.
 */
export const FAMILIES: ShopFamily[] = [
  { key: 'daily', group: 'deco', name: '일상', active: true },
  { key: 'costume', group: 'deco', name: '코스튬', active: true },
  { key: 'room', group: 'deco', name: '룸', active: false },
  { key: 'seasonal', group: 'season', name: '계절', active: true },
  { key: 'holiday', group: 'season', name: '기념일', active: true },
];

/** 서버를 못 읽었을 때 대신 서는 상점 */
export const BUILTIN: Shop = {
  groups: GROUPS,
  families: FAMILIES,
  sets: SETS,
  items: CATALOG,
  /* 못 읽었을 때는 짓다 만 것도 차례도 알 길이 없다 — 그 줄들이 통째로 안 선다 */
  coming: [],
  rank: [],
};

/**
 * **앱이 들고 나가는 둘** — 기본 곰돌이와 기본 룸.
 *
 * 이 둘은 `costume_catalog`에 줄이 있든 없든, 켜져 있든 꺼져 있든
 * **늘 상점에 서고 늘 가진 것이다.** 가격표에서 떼어냈다.
 *
 * 왜 떼어냈나 —
 *
 *   * 그림이 `public/gomdori/`에 있어서 **서버와 아무 상관이 없다**
 *   * 열쇠를 못 바꾼다. `DEFAULT_BEAR`·`DEFAULT_ROOM`과 `gomdori.worn_bear`의
 *     기본값이 이 글자를 가리킨다 — 번호표로 다시 딸 수 있는 것이 아니다
 *   * 가격이 0이라 **팔 것이 아니다.** 파는 것들 사이에 끼워두면 관리자 목록에서
 *     지우거나 끌 수 있는 것처럼 보이는데, 지우면 홈이 빈다
 *
 * 실제로 가격표를 비웠을 때 이 둘이 상점에서 같이 사라졌다. 곰돌이는 서 있었지만
 * (앱이 그림을 들고 있으니) **옷장이 비고 방을 고를 수가 없었다.**
 */
export const BUNDLED: Costume[] = [...DAILY, ...ROOMS];

const BUNDLED_KEYS = new Set(BUNDLED.map((c) => c.key));

/**
 * 서버에서 받아온 상점 위에 **앱이 들고 나가는 둘을 얹는다.**
 *
 * **앱 것이 이긴다.** 가격표에 같은 열쇠가 있어도 앱 것으로 덮는다 —
 * 그래야 관리자가 실수로 끄거나 가격을 붙여도 기본 곰돌이가 그대로 선다.
 * 맨 앞에 세운다. `일상` 무더기에서 기본 곰돌이가 첫 칸이어야 한다.
 *
 * **칩도 같이 챙긴다.** 물건만 얹고 중분류를 안 챙기면 `일상` 무더기가 아예
 * 안 서서(`familiesOf`가 못 찾는다) 기본 곰돌이가 어디에도 안 뜬다.
 */
export function withBundled(shop: Shop): Shop {
  const groups = shop.groups.some((g) => g.key === 'deco')
    ? shop.groups
    : [...GROUPS.filter((g) => g.key === 'deco'), ...shop.groups];

  const need = FAMILIES.filter(
    (f) => BUNDLED.some((c) => c.family === f.key) && !shop.families.some((x) => x.key === f.key),
  );

  return {
    ...shop,
    groups,
    families: [...shop.families, ...need],
    sets: shop.sets,
    items: [...BUNDLED, ...shop.items.filter((c) => !BUNDLED_KEYS.has(c.key))],
  };
}

/**
 * 파는 것만 남긴 상점 — **숨긴 것을 걷어낸다.**
 *
 * 가격표 정책이 `active or is_shop_admin()`이라 **채우는 사람에게는 숨긴 것까지 내려온다.**
 * 안 거르면 그 사람 눈에만 반쯤 그린 물건이 상점에 서고, 그건
 * `아직 안 걸었어요`가 아니라 파는 물건으로 읽힌다 — 켜기 전에 눈으로 확인할 자리가 없어진다.
 *
 * 세트는 **셋이 다 걸려 있어야** 선다. 하나가 숨어 있으면 열어봐야 못 채우는 세트다.
 */
export function onSale(shop: Shop): Shop {
  const items = shop.items.filter((c) => c.active !== false);
  const live = new Set(items.map((c) => c.key));
  return {
    ...shop,
    items,
    sets: shop.sets.filter((s) => [s.bear, s.room, s.pose].every((i) => live.has(i.key))),
    /* 내린 물건이 랭킹에 남으면 **못 사는 칸**이 1등에 선다 */
    rank: shop.rank.filter((k) => live.has(k)),
  };
}

/**
 * 상점 메인의 두 줄 — **새로 들어온 것**과 **많이 산 것.**
 *
 * 둘 다 `상점 메인`에서만 쓴다. 화면에서 세지 않고 여기 모아둔 까닭은
 * **거르는 규칙이 같아서**다 — 파는 것만, 가격이 붙은 것만, 소품은 빼고.
 * 화면 두 곳에 나눠 적었다가 한쪽만 고치면 랭킹에는 뜨는데 신상에는
 * 안 뜨는 물건이 생긴다.
 */

/** 켜지고 며칠까지 `새로 들어왔어요`인가. 한 달을 가면 딱지가 아니라 무늬가 된다. */
export const FRESH_DAYS = 14;

/** 상점 줄에 설 수 있는 것 — **살 수 있는 것만.** */
const sellable = (c: Costume): boolean => c.kind !== 'pose' && c.price > 0;

/**
 * 새로 들어온 것 — **켜진 날이 가까운 차례.**
 *
 * `openedAt`이 없는 줄은 안 센다. 서버가 옛 DB에서 채워 넣긴 하지만
 * (`update … where active`), 그래도 비어 오는 줄이 있으면 **언제 켜졌는지
 * 모르는 것**이지 오늘 켜진 것이 아니다.
 */
export function freshOf(shop: Shop, now: number = Date.now()): Costume[] {
  const edge = now - FRESH_DAYS * 24 * 60 * 60 * 1000;
  return shop.items
    .filter((c) => sellable(c) && c.openedAt !== undefined)
    .map((c) => ({ c, at: Date.parse(c.openedAt as string) }))
    .filter((x) => !Number.isNaN(x.at) && x.at >= edge)
    .sort((a, b) => b.at - a.at)
    .map((x) => x.c);
}

/**
 * 많이 산 것 — **서버가 매긴 차례 그대로.**
 * 가격표에 없는 열쇠가 차례에 끼어 있을 수 있다(내린 뒤에도 산 줄은 남는다).
 */
export function rankOf(shop: Shop): Costume[] {
  const by = new Map(shop.items.map((c) => [c.key, c]));
  return shop.rank
    .map((k) => by.get(k))
    .filter((c): c is Costume => c !== undefined && sellable(c));
}

/**
 * 맨 위에 걸 세트 — **하나만 세운다.** 둘이 뜨면 무엇이 이달의 것인지가 흐려진다.
 *
 * **올린 배너가 있는 세트가 먼저다.** 하나도 없으면 첫 세트를 세운다 —
 * 그 자리에는 [세워둔 한 장](../screens/store/Banner.tsx)이 대신 선다.
 * 세트가 아예 없으면 배너도 없다.
 */
export function bannerSet(shop: Shop): CostumeSet | null {
  return shop.sets.find((s) => Boolean(s.banner)) ?? shop.sets[0] ?? null;
}

const BUILTIN_BY_KEY = new Map(CATALOG.map((c) => [c.key, c]));

/** 앱에 박혀 나온 그림. 서버가 그림을 안 갖고 있을 때 이걸로 선다. */
export const builtinImg = (key: string): string | undefined => BUILTIN_BY_KEY.get(key)?.img;

/**
 * 종류가 어느 폴더에 쌓이나 — **서버의 `shop_folder()`와 같아야 한다.**
 * 곰은 캐릭터를 그리는 사람이, 방은 배경을 그리는 사람이 따로 그린다.
 */
const KIND_DIR: Record<string, string> = { bear: 'gomdori', room: 'background' };

/**
 * 그림이 통 어디 있나 — **적어두지 않고 짓는다.**
 *
 * `<대분류>/<중분류>/<종류>/<열쇠>.png`
 *
 * 한때 이걸 `costume_catalog.img`에 적어뒀다. 걷어냈다 —
 * **적어둘 것이 하나도 없는 값이다.** 관리자가 상점을 채울 때 고르는 것은
 * 분류와 파일 둘뿐이고, 열쇠는 번호표로 저절로 딴다(`0000001`). 파일 이름은
 * 그 열쇠 그대로고 폴더는 분류 그대로다 — **네 토막이 다 이미 가격표에 있다.**
 *
 * 적어두면 관리자 화면이 경로를 물어야 하거나(물을 것이 아니다), 아니면 넣는 자리마다
 * 같은 문자열을 다시 지어 넣어야 한다. 실제로 그래서 한 번 어긋났다 —
 * 곰토끼를 통으로 옮겼는데 `img`가 비어서 그림이 안 떴다.
 *
 * **`shop_folder()`와 이 함수 둘이 같은 규칙을 안다.** 저쪽은 관리자가 올릴 자리를
 * 고를 때, 이쪽은 앱이 볼 자리를 지을 때. 규칙을 고치면 둘을 같이 고친다.
 */
export function shopPath(item: Costume, families: ShopFamily[]): string | undefined {
  if (!item.family) return undefined;
  const fam = families.find((f) => f.key === item.family);
  if (!fam) return undefined;
  return `${fam.group}/${fam.key}/${KIND_DIR[item.kind] ?? 'prop'}/${item.key}.png`;
}

/**
 * 없는 열쇠면 기본 곰돌이를 준다.
 * **어느 자리에 앉힐지(`kind`)를 여기서 정하기 때문에** 비어 돌려주면 안 된다 —
 * 방인 줄 모르고 곰 자리에 앉히면 홈 화면에 방이 사람처럼 선다.
 */
export function itemOf(shop: Shop, key: string): Costume {
  for (let i = 0; i < shop.items.length; i += 1) if (shop.items[i].key === key) return shop.items[i];
  return BUILTIN_BY_KEY.get(key) ?? BEARS[0];
}

/**
 * **지금 세울 수 있는 것인가** — 아니면 기본으로 돌려준다.
 *
 * 관리자가 파는 것을 내리면(`active = false`) 상점에서는 빠지는데
 * (`onSale`), **그걸 입고 있던 사람의 `gomdori`에는 그 열쇠가 그대로 남아 있다.**
 * 그 줄을 서버에서 되돌리지 않는 까닭은, 되돌려버리면 관리자가 다시 켰을 때
 * **입고 있던 옷이 안 돌아오기** 때문이다 — 내린 것은 잠깐 안 보이는 것이고
 * 산 것을 빼앗는 일이 아니다.
 *
 * 그래서 **세울 때만 기본으로 갈음한다.** 다시 켜지면 저절로 제 옷으로 돌아온다.
 *
 * **자리를 가려서 준다.** 곰 자리에는 곰(과 포즈), 방 자리에는 방이다 —
 * 종류를 안 보고 주면 방이 내려갔을 때 그 자리에 곰이 깔린다
 * (`object-cover`로 늘어난 곰돌이가 배경이 된다).
 */
export function standing(shop: Shop, key: string, slot: 'bear' | 'room'): string {
  const found = shop.items.find((c) => c.key === key);
  // 포즈는 곰돌이 그림 한 장이라 곰 자리에 앉는다
  const fits = slot === 'room' ? found?.kind === 'room' : found?.kind !== 'room';
  if (found && fits) return key;
  return slot === 'room' ? DEFAULT_ROOM : DEFAULT_BEAR;
}

/** 대분류 하나에 드는 중분류들 — 꺼둔 것은 뺀다 */
export function familiesOf(shop: Shop, group: string): ShopFamily[] {
  return shop.families.filter((f) => f.group === group && f.active);
}

/**
 * 대분류를 가려낸다. **`season`이 있으면 시즌, 없으면 꾸미기다.**
 * 물건에 대분류를 따로 안 적어두는 까닭이 여기 있다 — 적어두면
 * `season`이 있는데 꾸미기라고 적힌 줄이 언젠가 생긴다.
 */
export const groupOf = (c: Costume): string => (c.season ? 'season' : 'deco');

/** 기본으로 입고 있는 것. 아무것도 안 샀어도 곰돌이는 서 있다. */
export const DEFAULT_BEAR = 'base';
export const DEFAULT_ROOM = 'room-base';

/**
 * **안 사도 갖고 있는 것** — 기본 곰돌이와 기본 룸 둘(`BUNDLED`와 같은 둘).
 *
 * 가격이 0이라 사려면 살 수는 있었다. 그런데 그러면 갓 가입한 사람의 옷장이 **비어 있고**,
 * 자기가 지금 입고 있는 곰이 상점에 `구매하기`로 떠 있다 —
 * **입고 있는 것을 사라고 하는 꼴**이라 0P라도 말이 안 된다.
 *
 * **여기가 주인이다.** 서버에 물어보지 않는다 — 가격표에 줄이 없어도, 로그인을 안 해도,
 * 서버를 못 읽어도 이 둘은 가진 것이다. 그림이 앱 안에 있어서 **서버가 알 것이 없다.**
 */
export const FREEBIES: string[] = [DEFAULT_BEAR, DEFAULT_ROOM];

/**
 * 점수표 — **화면에 적는 값이다.** 진짜로 얼마가 붙을지는 늘 서버가 정한다
 * (schema.sql의 `stamp_points`).
 *
 * | 조건 | 보상 |
 * |---|---|
 * | 할 일 하나 **최초** 완료 | +5P |
 * | 하루에 받는 끝 | 30P (여섯 개) |
 * | 그 주에 10 · 20 · 30개 | +20 · +30 · +50P |
 *
 * `최초`가 중요하다 — 그 할 일 하나에 한 번이라 **잘못 눌러 풀었다 다시 해도 두 번 안 준다.**
 */
export const PER_TASK = 5;
export const DAILY_CAP = 30;
/** 그 주에 몇 개를 넘길 때마다 얼마 — 누적이라 30개면 셋을 다 받는다 */
export const WEEK_STEPS: { need: number; amount: number }[] = [
  { need: 10, amount: 20 },
  { need: 20, amount: 30 },
  { need: 30, amount: 50 },
];
/** 첫 완료 같은 한 번뿐인 것 */
export const FIRST_TASK_BONUS = 50;

/** 가입하면 그 자리에서 받는 것. 100P짜리를 하나 살 수 있게 정한 값이다. */
export const SIGNUP_BONUS = 100;
