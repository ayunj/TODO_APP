import type { Costume, CostumeSet } from './types';

/**
 * 파는 것 — 이름과 그림과 값.
 *
 * **같은 목록이 [schema.sql](../../supabase/schema.sql)의 `costume_catalog`에도 있다.**
 * 일부러 둘이다.
 *
 * | 어디 | 무엇을 | 왜 |
 * |---|---|---|
 * | 여기 | 이름·그림·값 | 그림이 앱과 같이 나가니 목록도 앱에 있어야 **상점이 오프라인에서 뜬다** |
 * | 서버 | 값·갈래·시즌·이름·파는 중 | 값을 앱만 알면 `이 옷 0원이요` 하고 사는 걸 막을 수가 없다 |
 *
 * **값을 고칠 때는 두 곳을 같이 고친다.** 이름과 그림은 여기만 고치면 된다.
 * 진짜로 얼마를 치를지는 늘 서버가 정한다 — 여기 값은 화면에 적는 값이다.
 *
 * **서버 쪽 값표에 `name`·`img`·`active`가 붙었다**([상점 채우기](../../design/관리자.html)).
 * 아직 앱은 그걸 안 읽는다 — 여기 목록이 먼저고, 값표를 읽어 덮는 것은 다음 일이다.
 * 그때가 오면 이 표의 `여기`가 `그림과 대비책`으로 줄어든다.
 *
 * `img`가 없는 것은 아직 안 그린 것이다. 그림이 오면 파일만 넣으면 뜬다.
 */

/**
 * 꾸미기 — **곰돌이 그대로 옷만 바뀐다.** 니트·셔츠·모자 같은 일상 옷.
 * 값이 싼 쪽이라 들어오자마자 하나는 살 수 있다.
 */
export const DAILY: Costume[] = [
  { key: 'base', name: '기본 곰돌이', price: 0, kind: 'bear', group: 'daily', img: '/gomdori/front.png' },
  { key: 'hat', name: '모자 곰', price: 100, kind: 'bear', group: 'daily' },
  { key: 'ribbon', name: '리본 곰', price: 100, kind: 'bear', group: 'daily' },
  { key: 'scarf', name: '목도리 곰', price: 100, kind: 'bear', group: 'daily' },
  { key: 'knit', name: '니트 곰', price: 150, kind: 'bear', group: 'daily' },
  { key: 'shirt', name: '셔츠 곰', price: 150, kind: 'bear', group: 'daily' },
  { key: 'apron', name: '앞치마 곰', price: 150, kind: 'bear', group: 'daily' },
  { key: 'glasses', name: '안경 곰', price: 200, kind: 'bear', group: 'daily' },
  { key: 'overall', name: '멜빵 곰', price: 200, kind: 'bear', group: 'daily' },
];

/**
 * 코스튬 — **딴 사람이 된다.** 공주·탐정·마법사처럼 통째로 변신하는 것.
 *
 * 요리사 곰과 곰토끼는 원래 꾸미기에 섞여 있던 것을 옮겨온 것이다 —
 * **값은 안 건드렸다.** 값표의 주인은 [상점 채우기](../../design/관리자.html)다.
 */
export const COSTUMES: Costume[] = [
  { key: 'chef', name: '요리사 곰', price: 200, kind: 'bear', group: 'costume' },
  { key: 'rabbit', name: '곰토끼', price: 300, kind: 'bear', group: 'costume', img: '/gomdori/rabbit.png' },
  { key: 'detective', name: '탐정 곰', price: 350, kind: 'bear', group: 'costume' },
  { key: 'princess', name: '공주 곰', price: 400, kind: 'bear', group: 'costume' },
  { key: 'wizard', name: '마법사 곰', price: 400, kind: 'bear', group: 'costume' },
];

/** 곰 옷 전부 — 옷장에서 한 줄로 볼 때 쓴다 */
export const BEARS: Costume[] = [...DAILY, ...COSTUMES];

/** 방 테마 — 곰이 아니라 배경이라 칩을 따로 쓴다. 한 장이면 끝이라 그리는 값이 싸다. */
export const ROOMS: Costume[] = [
  { key: 'room-base', name: '기본 룸', price: 0, kind: 'room', img: '/gomdori/room.png' },
  { key: 'room-picnic', name: '피크닉 룸', price: 300, kind: 'room' },
  { key: 'room-cafe', name: '카페 룸', price: 400, kind: 'room' },
  { key: 'room-plant', name: '식물 가득 룸', price: 400, kind: 'room' },
  { key: 'room-bed', name: '포근한 침실', price: 500, kind: 'room' },
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
    bear: { key: 'b-bloom', name: '봄꽃 곰', price: 300, kind: 'bear', season: 's-bloom' },
    room: { key: 'r-bloom', name: '봄꽃 룸', price: 400, kind: 'room', season: 's-bloom' },
    pose: { key: 'pose-petal', name: '꽃잎 포즈', price: 0, kind: 'pose', season: 's-bloom' },
  },
  {
    key: 's-swim',
    name: '물놀이 세트',
    note: '여름 바다에서 신나게!',
    bear: { key: 'b-swim', name: '물놀이 곰', price: 300, kind: 'bear', season: 's-swim' },
    room: { key: 'r-sea', name: '여름 바다', price: 400, kind: 'room', season: 's-swim' },
    pose: { key: 'pose-tube', name: '튜브 포즈', price: 0, kind: 'pose', season: 's-swim' },
  },
  {
    key: 's-vac',
    name: '여름휴가 세트',
    note: '느긋한 바닷가 하루',
    bear: { key: 'b-vac', name: '여름휴가 곰', price: 350, kind: 'bear', season: 's-vac' },
    room: { key: 'r-beach', name: '해변 룸', price: 450, kind: 'room', season: 's-vac' },
    pose: { key: 'pose-parcel', name: '파라솔 포즈', price: 0, kind: 'pose', season: 's-vac' },
  },
  {
    key: 's-hall',
    name: '할로윈 세트',
    note: '한 밤의 사탕 사냥',
    bear: { key: 'b-hall', name: '할로윈 곰', price: 300, kind: 'bear', season: 's-hall' },
    room: { key: 'r-hall', name: '할로윈 룸', price: 400, kind: 'room', season: 's-hall' },
    pose: { key: 'pose-pump', name: '호박 포즈', price: 0, kind: 'pose', season: 's-hall' },
  },
  {
    key: 's-xmas',
    name: '크리스마스 세트',
    note: '눈 오는 밤의 곰돌이',
    bear: { key: 'b-xmas', name: '산타 곰', price: 350, kind: 'bear', season: 's-xmas' },
    room: { key: 'r-xmas', name: '크리스마스 룸', price: 450, kind: 'room', season: 's-xmas' },
    pose: { key: 'pose-tree', name: '트리 포즈', price: 0, kind: 'pose', season: 's-xmas' },
  },
];

/** 열쇠 하나로 찾는다 — 가진 것 목록에는 열쇠만 들어 있다 */
export const CATALOG: Costume[] = [
  ...BEARS,
  ...ROOMS,
  ...SETS.flatMap((s) => [s.bear, s.room, s.pose]),
];

const BY_KEY = new Map(CATALOG.map((c) => [c.key, c]));

/**
 * 없는 열쇠면 기본 곰돌이를 준다.
 * 서버 값표에만 있고 앱에는 아직 없는 옷이 내려올 수 있다 —
 * 그때 화면이 비는 대신 기본 모습으로 서게 한다.
 */
export const costumeOf = (key: string): Costume => BY_KEY.get(key) ?? BEARS[0];

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
