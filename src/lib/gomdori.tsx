'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { BUILTIN, DEFAULT_BEAR, DEFAULT_ROOM, FREEBIES, itemOf } from './costumes';
import {
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
   * 상점에 걸린 것 전부 — **서버가 주인이다.**
   * 못 받아왔으면 앱에 박혀 나온 것(`BUILTIN`)이 대신 서 있다.
   */
  shop: Shop;
  /** 열쇠 하나를 물건으로. **어느 자리에 앉힐지를 이걸로 정한다.** */
  item: (key: string) => Costume;
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
  /** 지금 입은 곰(포즈도 여기 앉는다)과 깐 방 */
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

  /*
    상점 목록은 **로그인과 상관없이** 받아온다. 값표는 누구나 읽는 것이고
    (파는 중인 것만), 로그인 뒤로 미루면 로그인 전 홈에 선 곰돌이가
    이미 산 옷을 못 찾아 기본 모습으로 바뀐다.

    한 번만 받아온다. 값표는 관리자가 가끔 고치는 것이라
    화면을 열 때마다 다시 물을 까닭이 없다 — 앱을 다시 켜면 새로 받는다.
  */
  useEffect(() => {
    if (!hasSupabase) return;
    let alive = true;
    pullShop()
      .then((next) => {
        // 빈 상점이 내려오면 안 받은 것으로 친다 — 박아둔 목록이 낫다
        if (alive && next.items.length) setShop(next);
      })
      .catch(() => {
        /* 못 받아오면 박혀 나온 것으로 선다. 상점은 오프라인에서도 떠야 한다. */
      });
    return () => {
      alive = false;
    };
  }, []);

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
      const left = await buyRemote(key);
      const bought = item(key);
      const roomly = bought.kind === 'room';
      setState((s) => ({
        points: left,
        owned: s.owned.includes(key) ? s.owned : [...s.owned, key],
        wornBear: roomly ? s.wornBear : key,
        wornRoom: roomly ? key : s.wornRoom,
      }));
      // 세트를 채웠으면 포즈가 딸려 들어온다 — 그건 서버가 아니까 다시 받아온다
      await refresh().catch(() => {});
      await wearRemote(myId, {
        bear: roomly ? state.wornBear : key,
        room: roomly ? key : state.wornRoom,
      }).catch(() => {});
    },
    [myId, refresh, state.wornBear, state.wornRoom, item],
  );

  const value = useMemo<GomdoriValue>(
    () => ({
      enabled: Boolean(myId),
      shop,
      item,
      loading,
      points: state.points,
      owned: state.owned,
      has: (key: string) => state.owned.includes(key) || FREEBIES.includes(key),
      wornBear: state.wornBear,
      wornRoom: state.wornRoom,
      buy,
      wear,
      refresh,
    }),
    [myId, shop, item, loading, state, buy, wear, refresh],
  );

  return <GomdoriContext.Provider value={value}>{children}</GomdoriContext.Provider>;
}

export function useGomdori(): GomdoriValue {
  const ctx = useContext(GomdoriContext);
  if (!ctx) throw new Error('GomdoriProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
