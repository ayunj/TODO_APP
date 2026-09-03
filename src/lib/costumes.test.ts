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
  freshOf,
  onSale,
  rankOf,
  shopPath,
  standing,
  withBundled,
} from './costumes';
import type { Shop } from './types';

/** 서버가 아무것도 안 돌려준 상점 */
const NOTHING: Shop = { groups: [], families: [], sets: [], coming: [], items: [], rank: [] };

describe('기본 곰돌이와 기본 룸', () => {
  /*
    이 셋이 이 파일의 까닭이다. 가격표를 비웠을 때 상점에서 기본 둘이 같이 사라져서
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

  it('가격표에 같은 열쇠가 와도 앱 것이 이긴다', () => {
    const shop = withBundled({
      ...NOTHING,
      // 관리자가 가격을 붙이고 이름을 바꿔 끈 것으로 흉내낸다
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
    채우는 사람에게는 숨긴 것까지 내려온다(가격표 정책이 `active or is_shop_admin()`).
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

describe('내린 것을 입고 있으면', () => {
  const bear = { key: 'b', name: 'b', price: 100, kind: 'bear' as const, active: true };
  const room = { key: 'r', name: 'r', price: 100, kind: 'room' as const, active: true };
  const pose = { key: 'p', name: 'p', price: 0, kind: 'pose' as const, active: true };
  const shop = onSale(withBundled({ ...NOTHING, items: [bear, room, pose] }));

  it('걸려 있으면 그대로 선다', () => {
    expect(standing(shop, 'b', 'bear')).toBe('b');
    expect(standing(shop, 'r', 'room')).toBe('r');
  });

  /* 포즈는 곰돌이 그림 한 장이라 곰 자리에 앉는다 */
  it('포즈는 곰 자리에 선다', () => {
    expect(standing(shop, 'p', 'bear')).toBe('p');
  });

  /*
    관리자가 내리면 상점에서는 빠지는데 입고 있던 사람의 줄에는 그 열쇠가 남는다.
    담아둔 값을 안 건드리는 까닭은 **다시 켜면 제 옷으로 돌아와야** 해서다 —
    내린 것은 잠깐 안 보이는 것이고 산 것을 빼앗는 일이 아니다.
  */
  it('내려간 것은 기본으로 갈음한다', () => {
    const hidden = onSale(withBundled({ ...NOTHING, items: [{ ...bear, active: false }] }));
    expect(standing(hidden, 'b', 'bear')).toBe(DEFAULT_BEAR);
  });

  /*
    **자리를 가려서 준다.** 종류를 안 보고 주면 방이 내려갔을 때 그 자리에 곰이 깔린다 —
    `object-cover`로 늘어난 곰돌이가 배경이 된다.
  */
  it('방 자리에 곰을 앉히지 않는다', () => {
    expect(standing(shop, 'b', 'room')).toBe(DEFAULT_ROOM);
    expect(standing(shop, '없는열쇠', 'room')).toBe(DEFAULT_ROOM);
    expect(standing(shop, 'r', 'bear')).toBe(DEFAULT_BEAR);
  });
});

describe('새로 들어왔어요', () => {
  const NOW = Date.parse('2026-08-27T09:00:00Z');
  const days = (n: number) => new Date(NOW - n * 86400_000).toISOString();
  const bear = (key: string, openedAt?: string) => ({
    key,
    name: key,
    price: 300,
    kind: 'bear' as const,
    active: true,
    openedAt,
  });

  it('켜진 날이 가까운 차례로 선다', () => {
    const shop = { ...NOTHING, items: [bear('a', days(9)), bear('b', days(1)), bear('c', days(5))] };
    expect(freshOf(shop, NOW).map((c) => c.key)).toEqual(['b', 'c', 'a']);
  });

  /* 한 달을 가면 딱지가 아니라 무늬가 된다 */
  it('열나흘이 지나면 빠진다', () => {
    const shop = { ...NOTHING, items: [bear('a', days(13)), bear('b', days(15))] };
    expect(freshOf(shop, NOW).map((c) => c.key)).toEqual(['a']);
  });

  /*
    **언제 켜졌는지 모르는 것**이지 오늘 켜진 것이 아니다.
    빈 칸을 오늘로 치면 옛 DB를 얹은 날 상점 전체가 신상이 된다.
  */
  it('켜진 때를 모르는 것은 안 센다', () => {
    const shop = { ...NOTHING, items: [bear('a'), bear('b', days(2))] };
    expect(freshOf(shop, NOW).map((c) => c.key)).toEqual(['b']);
  });

  /* 살 수 있는 것만 선다 — 공짜와 세트 보상은 파는 물건이 아니다 */
  it('공짜와 소품은 안 센다', () => {
    const shop = {
      ...NOTHING,
      items: [
        { ...bear('free', days(1)), price: 0 },
        { ...bear('pose', days(1)), kind: 'pose' as const, price: 0 },
        bear('sale', days(1)),
      ],
    };
    expect(freshOf(shop, NOW).map((c) => c.key)).toEqual(['sale']);
  });
});

describe('랭킹', () => {
  const item = (key: string, extra = {}) => ({
    key,
    name: key,
    price: 300,
    kind: 'bear' as const,
    active: true,
    ...extra,
  });

  it('서버가 매긴 차례 그대로 선다', () => {
    const shop = {
      ...NOTHING,
      items: [item('a'), item('b'), item('c')],
      rank: ['c', 'a', 'b'],
    };
    expect(rankOf(shop).map((c) => c.key)).toEqual(['c', 'a', 'b']);
  });

  /*
    내린 뒤에도 이미 산 줄은 `costume_owned`에 남아서 차례에 낀다.
    가격표에 없는 열쇠를 그대로 세우면 **이름도 그림도 없는 칸**이 1등에 선다.
  */
  it('가격표에 없는 열쇠는 건너뛴다', () => {
    const shop = { ...NOTHING, items: [item('a')], rank: ['없는것', 'a'] };
    expect(rankOf(shop).map((c) => c.key)).toEqual(['a']);
  });

  /* 서버가 가격 0인 줄을 안 세지만, 앱에서도 한 번 더 거른다 */
  it('공짜와 소품은 안 센다', () => {
    const shop = {
      ...NOTHING,
      items: [item('free', { price: 0 }), item('pose', { kind: 'pose' as const, price: 0 }), item('sale')],
      rank: ['free', 'pose', 'sale'],
    };
    expect(rankOf(shop).map((c) => c.key)).toEqual(['sale']);
  });

  /* 내린 물건이 랭킹에 남으면 **못 사는 칸**이 1등에 선다 */
  it('내린 것은 onSale이 차례에서도 뺀다', () => {
    const shop = onSale(
      withBundled({ ...NOTHING, items: [item('a', { active: false }), item('b')], rank: ['a', 'b'] }),
    );
    expect(shop.rank).toEqual(['b']);
  });
});
