'use client';

import { useState } from 'react';
import PageBar from '@/components/PageBar';
import EmptyBox from '@/components/EmptyBox';
import { Note } from '@/components/rows';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';

/**
 * 이 방에서 나눌 카테고리 고르기.
 *
 * 카테고리를 켜면 **그 안의 할 일과 즐겨찾기가 같이 간다.**
 * 카테고리만 옮기면 상대에게는 이름만 보이고, 할 일만 옮기면 색도 이름도 안 뜬다.
 *
 * **끄는 건 공유를 푸는 것과 같은 일**이라 몇 개가 사라지는지 먼저 알려준다.
 */
export default function RoomCategoriesScreen({ id }: { id: string }) {
  const { categories, tasks, resync } = useStore();
  const { rooms, shareCategory, unshareCategory } = useRooms();
  const [busy, setBusy] = useState<string | null>(null);

  const room = rooms.find((r) => r.id === id) ?? null;
  if (!room) {
    return (
      <>
        <PageBar title="나누는 것" />
        <p className="ml-1 text-[13px] text-ink3">방을 찾을 수 없어요.</p>
      </>
    );
  }

  // 이 방 것과 아직 개인인 것만 보여준다. 남의 방에 걸린 카테고리는 여기서 다룰 게 아니다.
  const pickable = categories.filter((c) => c.roomId === null || c.roomId === room.id);
  const countIn = (categoryId: string) => tasks.filter((t) => t.categoryId === categoryId).length;

  const toggle = async (categoryId: string, name: string, on: boolean) => {
    if (on) {
      const n = countIn(categoryId);
      const ask = n
        ? `${name}을(를) ${room.name}에서 나눕니다. 여기 있는 ${n}개도 같이 보이게 돼요.`
        : `${name}을(를) ${room.name}에서 나눕니다.`;
      if (!confirm(ask)) return;
    } else {
      const n = countIn(categoryId);
      const ask = n
        ? `${name} 나누기를 그만둡니다. ${n}개가 상대 화면에서 사라지고 도로 내 것이 돼요.`
        : `${name} 나누기를 그만둡니다.`;
      if (!confirm(ask)) return;
    }

    setBusy(categoryId);
    try {
      if (on) await shareCategory(categoryId, room.id);
      else await unshareCategory(categoryId);
      // 서버에서 여러 줄이 한꺼번에 바뀌었다 — 화면은 받아와서 맞춘다
      await resync();
      toast(on ? `${name} — 나누기 시작했어요` : `${name} — 도로 내 것이 됐어요`);
    } catch {
      toast(on ? '나누지 못했습니다.' : '거두지 못했습니다.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageBar title="나누는 것" />

      {pickable.length === 0 ? (
        <EmptyBox title="나눌 카테고리가 없습니다">
          카테고리를 먼저 만들면 여기서 고를 수 있어요.
        </EmptyBox>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {pickable.map((c) => {
            const on = c.roomId === room.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={busy !== null}
                onClick={() => toggle(c.id, c.name, !on)}
                className="flex w-full items-center gap-[11px] rounded-2xl bg-card px-[15px] py-4 text-left shadow-card active:bg-sunk disabled:opacity-60"
              >
                <span className="h-3 w-3 flex-none rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px]">{c.name}</span>
                  <span className="text-[11.5px] text-ink3">{countIn(c.id)}개</span>
                </span>
                <span
                  className={`flex h-[26px] w-[44px] flex-none items-center rounded-full p-[3px] transition-colors ${
                    on ? 'bg-accent' : 'bg-sunk'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-card shadow-card transition-transform ${
                      on ? 'translate-x-[18px]' : ''
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Note>
        켜면 그 안의 할 일과 즐겨찾기가 같이 갑니다. 담을 때 방을 따로 묻지 않아요 — 카테고리
        하나가 방 하나에 속하니까요.
      </Note>
    </>
  );
}
