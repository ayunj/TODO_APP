'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { DEFAULT_BEAR, DEFAULT_ROOM, costumeOf } from './costumes';
import {
  buyCostume as buyRemote,
  pullGomdori,
  wearCostume as wearRemote,
} from './repo/remote';
import { toast } from './toast';
import type { Gomdori } from './types';

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
  loading: boolean;
  /** 지금 얼마 있나. 로그인 안 했으면 0이다. */
  points: number;
  /** 가진 것들의 열쇠 */
  owned: string[];
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
  const [loading, setLoading] = useState(false);

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
      const item = costumeOf(key);
      const next =
        item.kind === 'room'
          ? { ...state, wornRoom: key }
          : { ...state, wornBear: key };
      setState(next);
      try {
        await wearRemote(myId, { bear: next.wornBear, room: next.wornRoom });
      } catch {
        toast('저장하지 못했어요');
      }
    },
    [myId, state],
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
      const item = costumeOf(key);
      setState((s) => ({
        points: left,
        owned: s.owned.includes(key) ? s.owned : [...s.owned, key],
        wornBear: item.kind === 'room' ? s.wornBear : key,
        wornRoom: item.kind === 'room' ? key : s.wornRoom,
      }));
      // 세트를 채웠으면 포즈가 딸려 들어온다 — 그건 서버가 아니까 다시 받아온다
      await refresh().catch(() => {});
      await wearRemote(myId, {
        bear: item.kind === 'room' ? state.wornBear : key,
        room: item.kind === 'room' ? key : state.wornRoom,
      }).catch(() => {});
    },
    [myId, refresh, state.wornBear, state.wornRoom],
  );

  const value = useMemo<GomdoriValue>(
    () => ({
      enabled: Boolean(myId),
      loading,
      points: state.points,
      owned: state.owned,
      has: (key: string) => state.owned.includes(key),
      wornBear: state.wornBear,
      wornRoom: state.wornRoom,
      buy,
      wear,
      refresh,
    }),
    [myId, loading, state, buy, wear, refresh],
  );

  return <GomdoriContext.Provider value={value}>{children}</GomdoriContext.Provider>;
}

export function useGomdori(): GomdoriValue {
  const ctx = useContext(GomdoriContext);
  if (!ctx) throw new Error('GomdoriProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
