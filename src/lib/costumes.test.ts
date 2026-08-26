import { describe, expect, it } from 'vitest';
import {
  BUNDLED,
  BUILTIN,
  DEFAULT_BEAR,
  DEFAULT_ROOM,
  FREEBIES,
  builtinImg,
  familiesOf,
  itemOf,
  onSale,
  shopPath,
  withBundled,
} from './costumes';
import type { Shop } from './types';

/** 서버가 아무것도 안 돌려준 상점 */
const NOTHING: Shop = { groups: [], families: [], sets: [], items: [] };

describe('기본 곰돌이와 기본 룸', () => {
  /*
    이 셋이 이 파일의 까닭이다. 값표를 비웠을 때 상점에서 기본 둘이 같이 사라져서
    옷장이 비고 방을 고를 수가 없었다 — 그 뒤로 앱이 들고 나가게 바꿨고,
    다시 그러지 않게 여기 못을 박는다.
  */
  it('서버가 빈손으로 와도 상점에 선다', () => {
    const shop = withBundled(NOTHING);
    expect(shop.items.map((c) => c.key)).toEqual([DEFAULT_BEAR, DEFAULT_ROOM]);
  });

  it('둘 다 앱 안의 그림을 가리킨다', () => {
    for (const key of [DEFAULT_BEAR, DEFAULT_ROOM]) {
      expect(builtinImg(key)).toMatch(/^\/gomdori\/.+\.png$/);
    }
  });

  it('안 사도 가진 것이다', () => {
    expect(FREEBIES).toContain(DEFAULT_BEAR);
    expect(FREEBIES).toContain(DEFAULT_ROOM);
  });

  it('값표에 같은 열쇠가 와도 앱 것이 이긴다', () => {
    const shop = withBundled({
      ...NOTHING,
      // 관리자가 값을 붙이고 이름을 바꿔 끈 것으로 흉내낸다
      items: [
        { key: DEFAULT_BEAR, name: '딴 이름', price: 9999, kind: 'bear', active: false },
      ],
    });
    const base = shop.items.filter((c) => c.key === DEFAULT_BEAR);
    expect(base).toHaveLength(1);
    expect(base[0].price).toBe(0);
    expect(base[0].img).toBeDefined();
  });

  it('칩도 같이 챙긴다 — 안 챙기면 어디에도 안 뜬다', () => {
    const shop = withBundled(NOTHING);
    const daily = familiesOf(shop, 'deco').map((f) => f.key);
    expect(daily).toContain('daily');
    // 룸 칩은 꺼진 채로 심겨 있다 — 상점에서 `방` 버튼으로 따로 간다
    expect(shop.families.some((f) => f.key === 'room')).toBe(true);
  });

  it('파는 것은 앞을 안 막는다', () => {
    const shop = withBundled({
      ...NOTHING,
      items: [{ key: '0000001', name: '곰토끼', price: 300, kind: 'bear', family: 'costume' }],
    });
    expect(shop.items.map((c) => c.key)).toEqual([DEFAULT_BEAR, DEFAULT_ROOM, '0000001']);
  });
});

describe('itemOf', () => {
  it('없는 열쇠면 기본 곰돌이를 준다 — 비어 돌려주면 방을 곰 자리에 앉힌다', () => {
    expect(itemOf(NOTHING, '없는열쇠').kind).toBe('bear');
  });

  it('앱에만 있는 열쇠도 찾아준다', () => {
    expect(itemOf(NOTHING, DEFAULT_ROOM).kind).toBe('room');
  });
});

describe('shopPath', () => {
  const families = BUILTIN.families;

  it('분류와 열쇠로 자리를 짓는다 — 적어둔 것을 쓰지 않는다', () => {
    expect(
      shopPath({ key: '0000001', name: '', price: 0, kind: 'bear', family: 'costume' }, families),
    ).toBe('deco/costume/gomdori/0000001.png');
  });

  it('종류마다 폴더가 다르다 — 서버의 shop_folder()와 같아야 한다', () => {
    const at = (kind: 'bear' | 'room' | 'pose') =>
      shopPath({ key: 'k', name: '', price: 0, kind, family: 'seasonal' }, families);
    expect(at('bear')).toBe('season/seasonal/gomdori/k.png');
    expect(at('room')).toBe('season/seasonal/background/k.png');
    expect(at('pose')).toBe('season/seasonal/prop/k.png');
  });

  it('중분류가 없으면 자리를 못 정한다', () => {
    expect(shopPath({ key: 'k', name: '', price: 0, kind: 'bear' }, families)).toBeUndefined();
  });

  /* 앱이 들고 나가는 둘은 자리를 안 짓는다 — 통에 올릴 일이 없다 */
  it('앱이 들고 나가는 둘은 통을 안 부른다', () => {
    for (const c of BUNDLED) expect(builtinImg(c.key)).toBeDefined();
  });
});

describe('숨긴 것 걷어내기', () => {
  const one = (key: string, active: boolean, kind: 'bear' | 'room' | 'pose' = 'bear') => ({
    key,
    name: key,
    price: 100,
    kind,
    active,
  });

  /*
    채우는 사람에게는 숨긴 것까지 내려온다(값표 정책이 `active or is_shop_admin()`).
    안 거르면 **그 사람 눈에만** 반쯤 그린 물건이 상점에 서서, 켜기 전에
    눈으로 확인할 자리가 없어진다.
  */
  it('숨긴 물건은 상점에 안 선다', () => {
    const shop = onSale({ ...NOTHING, items: [one('a', true), one('b', false)] });
    expect(shop.items.map((c) => c.key)).toEqual(['a']);
  });

  /* 앱이 들고 나가는 둘은 `active`가 안 적혀 있다 — 안 적힌 것은 파는 중이다 */
  it('안 적힌 것은 남는다', () => {
    expect(onSale(withBundled(NOTHING)).items.map((c) => c.key)).toEqual([
      DEFAULT_BEAR,
      DEFAULT_ROOM,
    ]);
  });

  it('한 조각이라도 숨어 있으면 세트째 안 선다', () => {
    const set = (n: string, roomLive: boolean) => ({
      key: n,
      name: n,
      note: '',
      bear: one(`${n}-bear`, true),
      room: one(`${n}-room`, roomLive, 'room'),
      pose: one(`${n}-pose`, true, 'pose'),
    });
    const full = set('full', true);
    const half = set('half', false);
    const items = [full, half].flatMap((x) => [x.bear, x.room, x.pose]);

    const shop = onSale({ ...NOTHING, items, sets: [full, half] });
    expect(shop.sets.map((x) => x.key)).toEqual(['full']);
  });
});
