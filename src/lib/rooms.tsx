'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { uid } from './id';
import {
  createRoom as createRoomRemote,
  joinRoom as joinRoomRemote,
  leaveRoom as leaveRoomRemote,
  peekRoom as peekRoomRemote,
  pullRooms,
  updateRoom as updateRoomRemote,
} from './repo/remote';
import { hasSupabase } from './supabase';
import type { Room, RoomMember, RoomPeek } from './types';

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
  /** 서버에서 방과 사람 목록을 다시 받아온다 */
  refresh: () => Promise<void>;
  createRoom: (name: string, myName: string, color: string) => Promise<Room>;
  joinRoom: (code: string, myName: string) => Promise<Room>;
  peekRoom: (code: string) => Promise<RoomPeek | null>;
  leaveRoom: (roomId: string) => Promise<void>;
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
      await updateRoomRemote(roomId, { join_code: uid().replace(/-/g, '') });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<RoomsValue>(
    () => ({
      enabled,
      loading,
      rooms,
      members,
      membersOf,
      myNameIn,
      refresh,
      createRoom,
      joinRoom,
      peekRoom,
      leaveRoom,
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
      refresh,
      createRoom,
      joinRoom,
      peekRoom,
      leaveRoom,
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
  return code.trim().toLowerCase().replace(/[\s-]/g, '');
}
