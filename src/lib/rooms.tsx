'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import {
  clearNudges as clearNudgesRemote,
  closeRoom as closeRoomRemote,
  createRoom as createRoomRemote,
  handOverRoom as handOverRoomRemote,
  joinRoom as joinRoomRemote,
  leaveRoom as leaveRoomRemote,
  nudgesLeft as nudgesLeftRemote,
  peekRoom as peekRoomRemote,
  pullNudges as pullNudgesRemote,
  pullRooms,
  sendNudge as sendNudgeRemote,
  renameMe as renameMeRemote,
  resetJoinCode as resetJoinCodeRemote,
  shareCategory as shareCategoryRemote,
  unshareCategory as unshareCategoryRemote,
  updateRoom as updateRoomRemote,
} from './repo/remote';
import { hasSupabase } from './supabase';
import type { Nudge, Room, RoomMember, RoomPeek } from './types';

interface RoomsValue {
  /** 방을 쓸 수 있는 상태인지 — 로그인해야 켜진다 */
  enabled: boolean;
  loading: boolean;
  rooms: Room[];
  members: RoomMember[];
  /** 그 방 사람들 (든 순서대로) */
  membersOf: (roomId: string) => RoomMember[];
  /** 그 방에서 불리는 내 이름 */
  myNameIn: (roomId: string) => string;
  /** 그 방에서 불릴 내 이름을 고친다 — 방마다 따로 걸린다 */
  renameMe: (roomId: string, name: string) => Promise<void>;
  /** 이 방이 무엇을 나누는지 — 할 일·장보기·메모, 그리고 콕 찌르기 */
  setShares: (
    roomId: string,
    shares: { tasks: boolean; shop: boolean; memo: boolean; nudge: boolean },
  ) => Promise<void>;

  /* ── 콕 찌르기 ── */
  /**
   * 콕 한 번. 남은 횟수를 돌려준다.
   * `whom`이 없으면 방 전체에게 간다 — `안 정함`인 일을 찌르는 자리다.
   */
  sendNudge: (roomId: string, taskId: string, whom: string | null) => Promise<number>;
  /** 남은 횟수 — **누르기 전에** 보여준다 */
  nudgesLeft: (roomId: string) => Promise<number>;
  /** 나에게 온 콕. 앱을 열 때 한 번 받아온다. */
  nudges: Nudge[];
  /** 본 것은 지운다 — 기록으로 안 남긴다 */
  clearNudges: (ids: string[]) => Promise<void>;
  /** 내 카테고리를 이 방에 연다 (주인만). 그 안의 할 일·즐겨찾기가 같이 간다 */
  shareCategory: (categoryId: string, roomId: string) => Promise<void>;
  /** 도로 개인 것으로 거둔다 */
  unshareCategory: (categoryId: string) => Promise<void>;
  /** 서버에서 방과 사람 목록을 다시 받아온다 */
  refresh: () => Promise<void>;
  createRoom: (name: string, myName: string, color: string) => Promise<Room>;
  joinRoom: (code: string, myName: string) => Promise<Room>;
  peekRoom: (code: string) => Promise<RoomPeek | null>;
  /** 남이 연 방에서 내 자리만 뺀다 */
  leaveRoom: (roomId: string) => Promise<void>;
  /**
   * 그만 나누기 — 내가 연 방을 닫는다. **나가는 게 아니다.**
   * 안에 있던 것은 도로 내 것이 된다.
   */
  closeRoom: (roomId: string) => Promise<void>;
  /** 맡기고 나가기 — 주인만 바뀐다. 방은 그대로 살고 내 폰에서만 사라진다. */
  handOverRoom: (roomId: string, heir: string) => Promise<void>;
  renameRoom: (roomId: string, name: string) => Promise<void>;
  recolorRoom: (roomId: string, color: string) => Promise<void>;
  /** 코드를 새로 만들어 그전 것을 막는다 */
  resetCode: (roomId: string) => Promise<void>;
}

const RoomsContext = createContext<RoomsValue | null>(null);

export function RoomsProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const myId = account?.id ?? null;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(false);

  const enabled = hasSupabase && Boolean(myId);

  const refresh = useCallback(async () => {
    if (!myId) {
      setRooms([]);
      setMembers([]);
      return;
    }
    const { rooms: rs, members: ms } = await pullRooms(myId);
    setRooms(rs.sort((a, b) => a.name.localeCompare(b.name)));
    setMembers(ms);
  }, [myId]);

  // 로그인하면 받아오고, 로그아웃하면 비운다
  useEffect(() => {
    if (!enabled) {
      setRooms([]);
      setMembers([]);
      return;
    }
    let alive = true;
    setLoading(true);
    refresh()
      .catch(() => {
        /* 못 받아오면 방이 없는 것처럼 둔다 — 화면은 안 막는다 */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [enabled, refresh]);

  const membersOf = useCallback(
    (roomId: string) =>
      members
        .filter((m) => m.roomId === roomId)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
    [members],
  );

  const myNameIn = useCallback(
    (roomId: string) =>
      members.find((m) => m.roomId === roomId && m.userId === myId)?.displayName ?? '',
    [members, myId],
  );

  const createRoom = useCallback(
    async (name: string, myName: string, color: string) => {
      if (!myId) throw new Error('로그인이 필요합니다');
      const room = await createRoomRemote(name.trim(), myName.trim(), color, myId);
      await refresh();
      return room;
    },
    [myId, refresh],
  );

  const joinRoom = useCallback(
    async (code: string, myName: string) => {
      if (!myId) throw new Error('로그인이 필요합니다');
      const room = await joinRoomRemote(normalizeCode(code), myName.trim(), myId);
      await refresh();
      return room;
    },
    [myId, refresh],
  );

  const peekRoom = useCallback((code: string) => peekRoomRemote(normalizeCode(code)), []);

  const leaveRoom = useCallback(
    async (roomId: string) => {
      if (!myId) return;
      await leaveRoomRemote(roomId, myId);
      await refresh();
    },
    [myId, refresh],
  );

  const closeRoom = useCallback(
    async (roomId: string) => {
      await closeRoomRemote(roomId);
      await refresh();
    },
    [refresh],
  );

  const handOverRoom = useCallback(
    async (roomId: string, heir: string) => {
      await handOverRoomRemote(roomId, heir);
      await refresh();
    },
    [refresh],
  );

  const renameRoom = useCallback(
    async (roomId: string, name: string) => {
      await updateRoomRemote(roomId, { name: name.trim() });
      await refresh();
    },
    [refresh],
  );

  const recolorRoom = useCallback(
    async (roomId: string, color: string) => {
      await updateRoomRemote(roomId, { color });
      await refresh();
    },
    [refresh],
  );

  const resetCode = useCallback(
    async (roomId: string) => {
      await resetJoinCodeRemote(roomId);
      await refresh();
    },
    [refresh],
  );

  const renameMe = useCallback(
    async (roomId: string, name: string) => {
      if (!myId) return;
      await renameMeRemote(roomId, name.trim(), myId);
      await refresh();
    },
    [myId, refresh],
  );

  const setShares = useCallback(
    async (
      roomId: string,
      shares: { tasks: boolean; shop: boolean; memo: boolean; nudge: boolean },
    ) => {
      await updateRoomRemote(roomId, {
        share_tasks: shares.tasks,
        share_shop: shares.shop,
        share_memo: shares.memo,
        share_nudge: shares.nudge,
      });
      await refresh();
    },
    [refresh],
  );

  /*
    받은 콕 — **앱을 열 때 한 번 받아온다.** 실시간이 아직이라 그 자리가 여기다.
    푸시가 붙으면 이 함은 그때 비워도 된다.
  */
  const [nudges, setNudges] = useState<Nudge[]>([]);
  useEffect(() => {
    if (!enabled) {
      setNudges([]);
      return;
    }
    let alive = true;
    pullNudgesRemote()
      .then((rows) => {
        if (alive) setNudges(rows);
      })
      .catch(() => {
        /* 못 받아오면 없는 것처럼 둔다 — 찌르기 하나로 화면을 막지 않는다 */
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  const sendNudge = useCallback(
    (roomId: string, taskId: string, whom: string | null) =>
      sendNudgeRemote(roomId, taskId, whom),
    [],
  );

  const nudgesLeft = useCallback((roomId: string) => nudgesLeftRemote(roomId), []);

  const clearNudges = useCallback(async (ids: string[]) => {
    // 화면에서 먼저 지운다. 서버가 늦어도 본 것이 다시 뜨지 않게.
    setNudges((prev) => prev.filter((n) => !ids.includes(n.id)));
    await clearNudgesRemote(ids).catch(() => {
      /* 못 지웠으면 다음에 열 때 한 번 더 뜬다 — 잃는 것보다 낫다 */
    });
  }, []);

  const shareCategory = useCallback(
    async (categoryId: string, roomId: string) => {
      await shareCategoryRemote(categoryId, roomId);
    },
    [],
  );

  const unshareCategory = useCallback(async (categoryId: string) => {
    await unshareCategoryRemote(categoryId);
  }, []);

  const value = useMemo<RoomsValue>(
    () => ({
      enabled,
      loading,
      rooms,
      members,
      membersOf,
      myNameIn,
      renameMe,
      sendNudge,
      nudgesLeft,
      nudges,
      clearNudges,
      setShares,
      shareCategory,
      unshareCategory,
      refresh,
      createRoom,
      joinRoom,
      peekRoom,
      leaveRoom,
      closeRoom,
      handOverRoom,
      renameRoom,
      recolorRoom,
      resetCode,
    }),
    [
      enabled,
      loading,
      rooms,
      members,
      membersOf,
      myNameIn,
      renameMe,
      setShares,
      shareCategory,
      unshareCategory,
      refresh,
      createRoom,
      joinRoom,
      peekRoom,
      leaveRoom,
      closeRoom,
      handOverRoom,
      renameRoom,
      recolorRoom,
      resetCode,
    ],
  );

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
}

export function useRooms(): RoomsValue {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('RoomsProvider 안에서만 쓸 수 있습니다');
  return ctx;
}

/** 대소문자·하이픈·공백은 안 따진다 — 손으로 옮겨 적어도 들어가지게 */
function normalizeCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/** 보여줄 때만 넷씩 끊는다 — `8F3K2QMD` → `8F3K-2QMD` */
export function formatCode(code: string): string {
  const tidy = normalizeCode(code);
  return tidy.length === 8 ? `${tidy.slice(0, 4)}-${tidy.slice(4)}` : tidy;
}
