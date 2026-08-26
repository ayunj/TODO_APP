'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';
import { BUILTIN, DEFAULT_BEAR, DEFAULT_ROOM, FREEBIES, itemOf, standing } from './costumes';
import {
  amShopAdmin,
  buyCostume as buyRemote,
  pullGomdori,
  pullShop,
  wearCostume as wearRemote,
} from './repo/remote';
import { hasSupabase } from './supabase';
import { toast } from './toast';
import type { Costume, Gomdori, Shop } from './types';

/**
 * 곰돌이 — 지금 입은 것, 가진 것, 모은 포인트.
 *
 * **로그인한 사람만 갖는다.** 포인트를 서버가 세기 때문이다 —
 * 폰에 담아두면 개발자 도구로 고쳐진다. 이 앱은 로그인 없이도 도는 게 원칙이라
 * 겹치지 않는 자리에 뒀다.
 *
 * **로그인 안 해도 곰돌이는 서 있다.** 옷장이 비고 상점이 안 열릴 뿐이다 —
 * 곰돌이는 그냥 있고 **옷이 로그인의 값**이다.
 *
 * 방([rooms.tsx](rooms.tsx))과 같은 얼개다. 서버에만 있는 것은
 * Repository를 안 지나고 [repo/remote.ts](repo/remote.ts)를 곧장 쓴다 —
 * 맞출 로컬 짝이 없어서 지날 층이 없다.
 */
interface GomdoriValue {
  /** 상점을 열 수 있는 상태인지 — 로그인해야 켜진다 */
  enabled: boolean;
  /**
   * **상점을 채울 수 있는 사람인가.** 설정에 `상점 채우기` 줄을 세울지 정한다.
   *
   * 이걸로 지키는 것이 아니다 — 통과 값표를 막는 것은 RLS(`is_shop_admin()`)다.
   * 여기 참이 와도 서버가 아니라고 하면 아무것도 안 된다.
   */
  admin: boolean;
  /**
   * 상점에 걸린 것 전부 — **서버가 주인이다.**
   * 못 받아왔으면 앱에 박혀 나온 것(`BUILTIN`)이 대신 서 있다.
   */
  shop: Shop;
  /** 열쇠 하나를 물건으로. **어느 자리에 앉힐지를 이걸로 정한다.** */
  item: (key: string) => Costume;
  /**
   * 상점 목록을 다시 받아온다. 채운 것이 바로 보여야 하는 자리에서 부른다
   * (상점을 열 때, 상점 채우기에서 고친 뒤).
   */
  refreshShop: () => Promise<Shop>;
  loading: boolean;
  /** 지금 얼마 있나. 로그인 안 했으면 0이다. */
  points: number;
  /** 가진 것들의 열쇠 */
  owned: string[];
  /**
   * 갖고 있나. **기본 곰돌이와 기본 룸은 늘 참이다**(`FREEBIES`) —
   * 서버도 그 둘을 그냥 넣어주지만(`grant_free()`), 로그인 전과 못 받아왔을 때는
   * 여기밖에 없다. 그 두 자리에서 옷장이 통째로 비면 고장으로 읽힌다.
   */
  has: (key: string) => boolean;
  /**
   * 지금 입은 곰(포즈도 여기 앉는다)과 깐 방.
   *
   * **내려간 것을 입고 있으면 기본으로 선다**(`standing`). 담아둔 값은 안 건드린다 —
   * 관리자가 다시 켜면 제 옷으로 돌아온다.
   */
  wornBear: string;
  wornRoom: string;
  /**
   * 산다. **값은 서버가 정한다** — 모자라면 던진다.
   * 사고 나면 바로 입는다. 걸쳐보고 산 것이라 한 번 더 물을 것이 없다.
   */
  buy: (key: string) => Promise<void>;
  /** 입거나 깐다 */
  wear: (key: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY: Gomdori = {
  points: 0,
  owned: [],
  wornBear: DEFAULT_BEAR,
  wornRoom: DEFAULT_ROOM,
};

const GomdoriContext = createContext<GomdoriValue | null>(null);

export function GomdoriProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const myId = account?.id ?? null;
  const [state, setState] = useState<Gomdori>(EMPTY);
  const [shop, setShop] = useState<Shop>(BUILTIN);
  const [loading, setLoading] = useState(false);
  const [admin, setAdmin] = useState(false);

  /*
    상점 목록은 **로그인과 상관없이** 받아온다. 값표는 누구나 읽는 것이고
    (파는 중인 것만), 로그인 뒤로 미루면 로그인 전 홈에 선 곰돌이가
    이미 산 옷을 못 찾아 기본 모습으로 바뀐다.

    **로그인이 바뀌면 다시 받아온다.** 채우는 사람에게는 숨긴 것까지 내려오는데
    (값표 정책이 `active or is_shop_admin()`), 앱을 켤 때 한 번만 받으면
    그 한 번이 로그인 붙기 전이라 늘 남의 눈으로 본 상점이 남는다.

    **상점을 열 때도 다시 받는다**(`refreshShop`). 한 번만 받아두면
    방금 채운 것이 앱을 다시 켤 때까지 안 보인다 — 채우자마자 보러 가는 자리다.
  */
  const shopSeq = useRef(0);
  const refreshShop = useCallback(async (): Promise<Shop> => {
    if (!hasSupabase) return BUILTIN;
    const mine = (shopSeq.current += 1);
    const next = await pullShop();
    /*
      **빈 상점도 그대로 받는다.** 전에는 `안 받은 것으로 치고` 박아둔 목록을
      세웠는데, 그러면 **값표를 비운 뒤에도 옛 목록이 상점에 뜬다** —
      서버에 없는 옷이 이름과 값을 달고 회색 네모로 선다.
      그걸 누르면 `없는 코스튬입니다`가 뜨는데, 그건 파는 물건이 아니라 고장이다.

      받아온 것이 비었다는 것은 **`모르겠다`가 아니라 `없다`는 답이다.**
      못 받아온 것은 부르는 쪽이 받는다 — 박혀 나온 것으로 그대로 선다.

      늦게 온 옛 답이 새 답을 덮지 않게 번호를 하나 들려 보낸다.
      로그인하는 순간 로그인 전 것과 뒤 것 둘이 겹쳐 난다.
    */
    if (mine === shopSeq.current) setShop(next);
    return next;
  }, []);

  useEffect(() => {
    void refreshShop().catch(() => {
      /* 못 받아오면 박혀 나온 것으로 선다. 곰돌이는 오프라인에서도 서야 한다. */
    });
  }, [myId, refreshShop]);

  /*
    관리자인지는 **로그인한 뒤에** 묻는다. `shop_admins`는 자기 줄만 보이게
    열어둔 표라 로그인 전에는 물어봐도 늘 빈손이다.
  */
  useEffect(() => {
    if (!myId) {
      setAdmin(false);
      return;
    }
    let alive = true;
    amShopAdmin()
      .then((yes) => {
        if (alive) setAdmin(yes);
      })
      .catch(() => {
        /* 못 물어봤으면 아닌 것으로 둔다 — 채우는 화면은 없어도 앱이 돈다 */
      });
    return () => {
      alive = false;
    };
  }, [myId]);

  const item = useCallback((key: string) => itemOf(shop, key), [shop]);

  const refresh = useCallback(async () => {
    if (!myId) {
      setState(EMPTY);
      return;
    }
    setState(await pullGomdori());
  }, [myId]);

  // 로그인하면 받아오고, 로그아웃하면 비운다
  useEffect(() => {
    if (!myId) {
      setState(EMPTY);
      return;
    }
    let alive = true;
    setLoading(true);
    refresh()
      .catch(() => {
        /* 못 받아오면 없는 것처럼 둔다 — 화면은 안 막는다 */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [myId, refresh]);

  /*
    입는 것은 **화면을 먼저 바꾸고 저장은 뒤에서 간다**(낙관적 쓰기).
    돈이 안 드는 일이라 실패해도 잃을 것이 없고, 갈아입는 데 기다림이 끼면
    걸쳐보는 맛이 죽는다.
  */
  const wear = useCallback(
    async (key: string) => {
      if (!myId) return;
      const worn = item(key);
      const next =
        worn.kind === 'room'
          ? { ...state, wornRoom: key }
          : { ...state, wornBear: key };
      setState(next);
      try {
        await wearRemote(myId, { bear: next.wornBear, room: next.wornRoom });
      } catch {
        toast('저장하지 못했어요');
      }
    },
    [myId, state, item],
  );

  /*
    사는 것은 **기다린다.** 낙관적으로 그렸다가 실패하면
    안 산 옷을 입은 채로 서 있게 되고, 포인트도 틀린 값이 남는다.
    되돌릴 수 없는 일 하나만 기다리게 한다.
  */
  const buy = useCallback(
    async (key: string) => {
      if (!myId) return;
      const had = new Set(state.owned);
      const left = await buyRemote(key);
      const roomly = item(key).kind === 'room';

      /*
        **세트를 채웠으면 포즈가 딸려 들어온다**(서버의 `grant_poses`).
        그건 서버가 아니까 가진 것을 다시 받아와서, 방금 산 것 말고 하나가 더
        들어와 있으면 그것이 보상이다.

        **딸려온 것이 있으면 그것을 입힌다.** 마지막 한 조각을 산 사람에게
        방금 산 방만 깔아주면 다 모았다는 것이 어디에도 안 보인다 —
        받은 자세로 서 있는 것이 그 자체로 알림이다.
      */
      let owned = [...had, key];
      let gift: string | undefined;
      try {
        const next = await pullGomdori();
        owned = next.owned;
        gift = next.owned.find((k) => !had.has(k) && k !== key && item(k).kind === 'pose');
      } catch {
        /* 못 받아왔으면 방금 산 것만 갖고 간다 — 포즈는 다음에 켤 때 따라온다 */
      }

      const bear = gift ?? (roomly ? state.wornBear : key);
      const room = roomly ? key : state.wornRoom;
      setState({
        points: left,
        owned: owned.includes(key) ? owned : [...owned, key],
        wornBear: bear,
        wornRoom: room,
      });
      // 조사를 안 붙인다 — 이름 끝 받침에 따라 `를`이 `을`이 된다([ko.ts](ko.ts))
      if (gift) toast(`세트를 다 모았어요 — ${item(gift).name}`);
      await wearRemote(myId, { bear, room }).catch(() => {});
    },
    [myId, state, item],
  );

  const value = useMemo<GomdoriValue>(
    () => ({
      enabled: Boolean(myId),
      admin,
      shop,
      item,
      refreshShop,
      loading,
      points: state.points,
      owned: state.owned,
      has: (key: string) => state.owned.includes(key) || FREEBIES.includes(key),
      wornBear: standing(shop, state.wornBear, 'bear'),
      wornRoom: standing(shop, state.wornRoom, 'room'),
      buy,
      wear,
      refresh,
    }),
    [myId, admin, shop, item, refreshShop, loading, state, buy, wear, refresh],
  );

  return <GomdoriContext.Provider value={value}>{children}</GomdoriContext.Provider>;
}

export function useGomdori(): GomdoriValue {
  const ctx = useContext(GomdoriContext);
  if (!ctx) throw new Error('GomdoriProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
