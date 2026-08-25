import type { Costume, CostumeSet, Shop, ShopFamily, ShopGroup } from './types';

/**
 * 파는 것 — 이름과 그림과 값.
 *
 * **주인은 서버다.** 앱이 켜지면 `costume_catalog`을 읽어 이 목록을 덮는다
 * ([gomdori.tsx](gomdori.tsx)). 여기 있는 것은 **못 읽었을 때 대신 서는 것**이다 —
 * 상점이 오프라인에서도 떠야 하고, 로그인 전에도 곰돌이는 서 있어야 한다.
 *
 * 그래서 아래 값들은 **화면에 적는 값**이지 치르는 값이 아니다.
 * 진짜로 얼마인지도, 무엇이 파는 중인지도 늘 서버가 정한다.
 *
 * | 어디 | 무엇을 | 왜 |
 * |---|---|---|
 * | 여기 | **그림**과 대비책 | 그림이 앱과 같이 나가니, 못 읽어도 기본 곰돌이는 서 있어야 한다 |
 * | 서버 | 이름·값·분류·파는 중 | 값을 앱만 알면 `이 옷 0원이요` 하고 사는 걸 막을 수가 없다 |
 *
 * **여기 있는 것은 서버에 같은 열쇠가 있으면 진다.** 그림만 빼고 —
 * 올린 그림이 없는 물건은 여기 `img`를 그대로 쓴다.
 *
 * `img`가 없는 것은 아직 안 그린 것이다. 그림이 오면 파일만 넣으면 뜬다.
 */

/**
 * 꾸미기 — **곰돌이 그대로 옷만 바뀐다.** 니트·셔츠·모자 같은 일상 옷.
 * 값이 싼 쪽이라 들어오자마자 하나는 살 수 있다.
 */
export const DAILY: Costume[] = [
  { key: 'base', name: '기본 곰돌이', price: 0, kind: 'bear', family: 'daily', img: '/gomdori/front.png' },
  { key: 'hat', name: '모자 곰', price: 100, kind: 'bear', family: 'daily' },
  { key: 'ribbon', name: '리본 곰', price: 100, kind: 'bear', family: 'daily' },
  { key: 'scarf', name: '목도리 곰', price: 100, kind: 'bear', family: 'daily' },
  { key: 'knit', name: '니트 곰', price: 150, kind: 'bear', family: 'daily' },
  { key: 'shirt', name: '셔츠 곰', price: 150, kind: 'bear', family: 'daily' },
  { key: 'apron', name: '앞치마 곰', price: 150, kind: 'bear', family: 'daily' },
  { key: 'glasses', name: '안경 곰', price: 200, kind: 'bear', family: 'daily' },
  { key: 'overall', name: '멜빵 곰', price: 200, kind: 'bear', family: 'daily' },
];

/**
 * 코스튬 — **딴 사람이 된다.** 공주·탐정·마법사처럼 통째로 변신하는 것.
 *
 * 요리사 곰과 곰토끼는 원래 꾸미기에 섞여 있던 것을 옮겨온 것이다 —
 * **값은 안 건드렸다.** 값표의 주인은 [상점 채우기](../../design/관리자.html)다.
 */
export const COSTUMES: Costume[] = [
  { key: 'chef', name: '요리사 곰', price: 200, kind: 'bear', family: 'costume' },
  { key: 'rabbit', name: '곰토끼', price: 300, kind: 'bear', family: 'costume', img: '/gomdori/rabbit.png' },
  { key: 'detective', name: '탐정 곰', price: 350, kind: 'bear', family: 'costume' },
  { key: 'princess', name: '공주 곰', price: 400, kind: 'bear', family: 'costume' },
  { key: 'wizard', name: '마법사 곰', price: 400, kind: 'bear', family: 'costume' },
];

/** 곰 옷 전부 — 옷장에서 한 줄로 볼 때 쓴다 */
export const BEARS: Costume[] = [...DAILY, ...COSTUMES];

/** 방 테마 — 곰이 아니라 배경이라 칩을 따로 쓴다. 한 장이면 끝이라 그리는 값이 싸다. */
export const ROOMS: Costume[] = [
  { key: 'room-base', name: '기본 룸', price: 0, kind: 'room', family: 'room', img: '/gomdori/room.png' },
  { key: 'room-picnic', name: '피크닉 룸', price: 300, kind: 'room', family: 'room' },
  { key: 'room-cafe', name: '카페 룸', price: 400, kind: 'room', family: 'room' },
  { key: 'room-plant', name: '식물 가득 룸', price: 400, kind: 'room', family: 'room' },
  { key: 'room-bed', name: '포근한 침실', price: 500, kind: 'room', family: 'room' },
];

/**
 * 시즌 세트 — **묶어 팔지 않는다.**
 * 곰과 방을 따로 사고, 둘을 다 모으면 포즈가 딸려온다.
 *
 * 묶어 팔면 낱개 값과 묶음 값 둘을 관리해야 하고,
 * 크리스마스 방만 갖고 싶은 사람이 곰까지 사게 된다.
 * **깎아주는 대신 하나 더 준다** — 깎아주기는 산 다음에 남는 것이 없고 포즈는 남는다.
 *
 * 포즈에 값이 없는 까닭도 같다. 값이 붙는 순간 **못 산 것**이 되고,
 * 그러면 받는 것이 아니라 안 사면 못 갖는 것으로 읽힌다.
 */
export const SETS: CostumeSet[] = [
  {
    key: 's-bloom',
    name: '봄꽃 세트',
    note: '꽃잎이 날리는 날',
    family: 'seasonal',
    bear: { key: 'b-bloom', name: '봄꽃 곰', price: 300, kind: 'bear', season: 's-bloom', family: 'seasonal' },
    room: { key: 'r-bloom', name: '봄꽃 룸', price: 400, kind: 'room', season: 's-bloom', family: 'seasonal' },
    pose: { key: 'pose-petal', name: '꽃잎 포즈', price: 0, kind: 'pose', season: 's-bloom', family: 'seasonal' },
  },
  {
    key: 's-swim',
    name: '물놀이 세트',
    note: '여름 바다에서 신나게!',
    family: 'seasonal',
    bear: { key: 'b-swim', name: '물놀이 곰', price: 300, kind: 'bear', season: 's-swim', family: 'seasonal' },
    room: { key: 'r-sea', name: '여름 바다', price: 400, kind: 'room', season: 's-swim', family: 'seasonal' },
    pose: { key: 'pose-tube', name: '튜브 포즈', price: 0, kind: 'pose', season: 's-swim', family: 'seasonal' },
  },
  {
    key: 's-vac',
    name: '여름휴가 세트',
    note: '느긋한 바닷가 하루',
    family: 'seasonal',
    bear: { key: 'b-vac', name: '여름휴가 곰', price: 350, kind: 'bear', season: 's-vac', family: 'seasonal' },
    room: { key: 'r-beach', name: '해변 룸', price: 450, kind: 'room', season: 's-vac', family: 'seasonal' },
    pose: { key: 'pose-parcel', name: '파라솔 포즈', price: 0, kind: 'pose', season: 's-vac', family: 'seasonal' },
  },
  {
    key: 's-hall',
    name: '할로윈 세트',
    note: '한 밤의 사탕 사냥',
    family: 'holiday',
    bear: { key: 'b-hall', name: '할로윈 곰', price: 300, kind: 'bear', season: 's-hall', family: 'holiday' },
    room: { key: 'r-hall', name: '할로윈 룸', price: 400, kind: 'room', season: 's-hall', family: 'holiday' },
    pose: { key: 'pose-pump', name: '호박 포즈', price: 0, kind: 'pose', season: 's-hall', family: 'holiday' },
  },
  {
    key: 's-xmas',
    name: '크리스마스 세트',
    note: '눈 오는 밤의 곰돌이',
    family: 'holiday',
    bear: { key: 'b-xmas', name: '산타 곰', price: 350, kind: 'bear', season: 's-xmas', family: 'holiday' },
    room: { key: 'r-xmas', name: '크리스마스 룸', price: 450, kind: 'room', season: 's-xmas', family: 'holiday' },
    pose: { key: 'pose-tree', name: '트리 포즈', price: 0, kind: 'pose', season: 's-xmas', family: 'holiday' },
  },
];

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
};

const BUILTIN_BY_KEY = new Map(CATALOG.map((c) => [c.key, c]));

/** 앱에 박혀 나온 그림. 서버가 그림을 안 갖고 있을 때 이걸로 선다. */
export const builtinImg = (key: string): string | undefined => BUILTIN_BY_KEY.get(key)?.img;

/**
 * 없는 열쇠면 기본 곰돌이를 준다.
 * **어느 자리에 앉힐지(`kind`)를 여기서 정하기 때문에** 비어 돌려주면 안 된다 —
 * 방인 줄 모르고 곰 자리에 앉히면 홈 화면에 방이 사람처럼 선다.
 */
export function itemOf(shop: Shop, key: string): Costume {
  for (let i = 0; i < shop.items.length; i += 1) if (shop.items[i].key === key) return shop.items[i];
  return BUILTIN_BY_KEY.get(key) ?? BEARS[0];
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
