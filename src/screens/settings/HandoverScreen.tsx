'use client';

import { useState } from 'react';
import PageBar from '@/components/PageBar';
import { GoButton } from '@/components/form';
import { ask } from '@/lib/ask';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';

/**
 * 누구에게 맡길까요 — **주인만 바뀐다.** 내 폰에서만 사라진다.
 *
 * `그만 나누기`만 있으면 회사방에서 사고가 난다. 내가 방을 열어 팀이 반년을
 * 같이 썼는데 내가 나간다고 그 기록이 통째로 사라지면 안 된다.
 * 그건 내 집안일과 달리 **내 것이 아니라 팀 것**이다.
 */
export default function HandoverScreen({ id }: { id: string }) {
  const { account } = useAuth();
  const { rooms, membersOf, handOverRoom } = useRooms();
  const { tasks, resync } = useStore();
  const { popView } = useUi();

  const [heir, setHeir] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const room = rooms.find((r) => r.id === id) ?? null;
  if (!room) {
    return (
      <>
        <PageBar title="맡기고 나가기" />
        <p className="ml-1 text-[13px] text-ink3">방을 찾을 수 없어요.</p>
      </>
    );
  }

  const others = membersOf(room.id).filter((m) => m.userId !== account?.id);
  const picked = others.find((m) => m.userId === heir) ?? null;
  const countHere = tasks.filter((t) => t.roomId === room.id).length;

  const go = async () => {
    if (!picked) return;
    const yes = await ask({
      title: `${picked.displayName}에게 맡길까요?`,
      loses: countHere
        ? `${room.name} 것 ${countHere}개가 내 폰에서 없어져요.`
        : `${room.name}이 내 폰에서 없어져요.`,
      keeps: '남은 사람들은 쓰던 대로 씁니다. 방 이름도 초대 코드도 그대로예요.',
      go: '맡기고 나가기',
      danger: true,
    });
    if (!yes) return;

    setBusy(true);
    try {
      await handOverRoom(room.id, picked.userId);
      await resync();
      toast(`${picked.displayName}가 이어서 맡아요`);
      // 방 설정도 같이 벗는다 — 이제 내 방이 아니다
      popView();
      popView();
    } catch {
      toast('맡기지 못했습니다.');
      setBusy(false);
    }
  };

  return (
    <>
      <PageBar title="맡기고 나가기" />

      <p className="mb-2 ml-1 text-[12px] text-ink2">누구에게 맡길까요?</p>
      <div className="flex flex-wrap gap-2">
        {others.map((m) => {
          const on = m.userId === heir;
          return (
            <button
              key={m.userId}
              type="button"
              onClick={() => setHeir(m.userId)}
              className={`rounded-2xl px-4 py-[11px] text-[13.5px] font-medium transition-colors ${
                on ? 'bg-accent text-white shadow-fab' : 'bg-card text-ink2 shadow-card active:bg-sunk'
              }`}
            >
              {m.displayName}
            </button>
          );
        })}
      </div>

      {picked && (
        <p className="ml-1 mt-4 text-[12.5px] leading-[1.7] text-ink2">
          {picked.displayName}가 이어서 이 방을 맡아요.
          <br />
          <span className="text-ink3">
            {countHere ? `${room.name} 것 ${countHere}개가 ` : `${room.name}이 `}내 폰에서
            없어지고, 남은 사람들은 쓰던 대로 씁니다.
          </span>
        </p>
      )}

      <div className="mt-5">
        <GoButton onClick={go} disabled={!picked || busy}>
          {busy ? '맡기는 중…' : '맡기고 나가기'}
        </GoButton>
      </div>
    </>
  );
}
