'use client';

import { useState } from 'react';
import PageBar from '@/components/PageBar';
import ShareBox, { type Shares } from '@/components/ShareBox';
import { Note } from '@/components/rows';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';

/**
 * 나누는 것 — 할 일 · 장보기 · 메모. 할 일을 켜면 그 밑에 카테고리가 펼쳐진다.
 *
 * 여기 든 것은 **연 사람만 고친다.** 손님 화면에는 이 자리로 들어가는 화살표가 없다 —
 * 나눌 것을 고르는 건 방 안에서 하는 일이 아니라 방을 여는 일이라서 그렇다.
 */
export default function RoomSharesScreen({ id }: { id: string }) {
  const { categories, tasks, categoryOf, resync } = useStore();
  const { rooms, setShares, shareCategory, unshareCategory } = useRooms();
  const [busy, setBusy] = useState(false);

  const room = rooms.find((r) => r.id === id) ?? null;
  if (!room) {
    return (
      <>
        <PageBar title="나누는 것" />
        <p className="ml-1 text-[13px] text-ink3">방을 찾을 수 없어요.</p>
      </>
    );
  }

  // 내 개인 것과 이 방 것만 고를 수 있다. 남의 방에 걸린 카테고리는 여기서 다룰 게 아니다.
  const pickable = categories.filter((c) => c.roomId === null || c.roomId === room.id);
  const value: Shares = {
    tasks: room.shareTasks,
    shop: room.shareShop,
    memo: room.shareMemo,
    categoryIds: categories.filter((c) => c.roomId === room.id).map((c) => c.id),
  };

  const apply = async (next: Shares) => {
    const before = new Set(value.categoryIds);
    const after = new Set(next.categoryIds);
    const added = next.categoryIds.filter((cid) => !before.has(cid));
    const removed = value.categoryIds.filter((cid) => !after.has(cid));

    // 끄는 건 공유를 푸는 것과 같은 일이라 몇 개가 사라지는지 먼저 알려준다
    if (removed.length) {
      const names = removed.map((cid) => categoryOf(cid).name).join(' · ');
      const n = tasks.filter((t) => removed.includes(t.categoryId)).length;
      const ask = n
        ? `${names} 나누기를 그만둡니다. ${n}개가 상대 화면에서 사라지고 도로 내 것이 돼요.`
        : `${names} 나누기를 그만둡니다.`;
      if (!confirm(ask)) return;
    }

    setBusy(true);
    try {
      if (next.tasks !== value.tasks || next.shop !== value.shop || next.memo !== value.memo) {
        await setShares(room.id, { tasks: next.tasks, shop: next.shop, memo: next.memo });
      }
      for (const cid of added) await shareCategory(cid, room.id);
      for (const cid of removed) await unshareCategory(cid);
      // 서버에서 여러 줄이 한꺼번에 바뀌었다 — 화면은 받아와서 맞춘다
      if (added.length || removed.length) await resync();
    } catch {
      toast('바꾸지 못했습니다. 잠시 뒤에 다시 해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageBar title="나누는 것" />

      <ShareBox value={value} onChange={apply} categories={pickable} busy={busy} />

      <Note>
        끈 것은 담을 때 뜨는 목록에 아예 안 나와요. 고를 수 없으니 잘못 누를 일도 없습니다.
      </Note>
    </>
  );
}
