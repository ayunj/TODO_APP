'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { GoButton } from '@/components/form';
import { bandOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';

/**
 * 같이 보기 — 이 메모를 어느 방에 둘까.
 *
 * **메모만 여러 방에 동시에 걸 수 있다.** 할 일은 카테고리가 방 하나를 물고 있고
 * 장보기는 한 곳만 간다. 와이파이 비밀번호는 집에서도 회사에서도 같은 종이 한 장이라
 * 여기만 여럿이다 — 한 장을 여러 방에 둬도 **내용은 하나**다.
 */
export default function MemoRoomsSheet({ id }: { id: string }) {
  const { memos, setMemoRooms } = useStore();
  const { rooms } = useRooms();
  const { closeSheet } = useUi();

  const memo = memos.find((m) => m.id === id) ?? null;
  const [picked, setPicked] = useState<string[]>(memo?.roomIds ?? []);

  if (!memo) return null;

  // 메모를 나누는 방만 고를 수 있다. 껐으면 여기 아예 안 뜬다 — 잘못 누를 길이 없다.
  const sharing = rooms.filter((r) => r.shareMemo);
  const dropped = memo.roomIds.filter((r) => !picked.includes(r)).length;

  const toggle = (roomId: string) =>
    setPicked((prev) =>
      prev.includes(roomId) ? prev.filter((x) => x !== roomId) : [...prev, roomId],
    );

  const submit = () => {
    setMemoRooms(memo.id, picked);
    closeSheet();
    toast(picked.length ? `${picked.length}곳에서 같이 봐요` : '나만 보는 메모가 됐어요');
  };

  return (
    <Sheet title="같이 보기" onClose={closeSheet}>
      {sharing.length === 0 ? (
        <>
          <p className="mb-4 text-[13px] leading-[1.7] text-ink3">
            메모를 나누는 방이 없어요.
            <br />방 설정에서 <b className="font-medium text-ink2">메모</b>를 켜면 여기 나옵니다.
          </p>
          <GoButton onClick={closeSheet}>닫기</GoButton>
        </>
      ) : (
        <>
          <p className="mb-2 text-[12.5px] font-medium text-ink2">이 메모를 어느 방에 둘까요</p>
          <div className="mb-4 flex flex-col gap-[9px]">
            {sharing.map((r) => {
              const on = picked.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(r.id)}
                  className={`flex items-center gap-2.5 rounded-2xl px-[15px] py-[13px] text-[14px] shadow-card active:bg-sunk ${
                    on ? 'bg-accent-tint text-accent' : 'bg-card text-ink2'
                  }`}
                >
                  <span
                    className={`grid h-[19px] w-[19px] flex-none place-items-center rounded-[6px] text-[11px] font-bold ${
                      on ? 'bg-accent text-white' : 'border-[1.5px] border-edge text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  {r.name}
                  <span
                    className="ml-auto inline-flex flex-none items-center rounded-full px-[9px] py-[2.5px] text-[10.5px] font-medium text-ink"
                    style={{ background: bandOf(r.color) }}
                  >
                    {r.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 내리는 것은 지우는 것과 다르다. 다른 사람 화면에서만 사라진다는 걸 미리 말한다. */}
          {dropped > 0 && (
            <p className="mb-4 text-[11.5px] leading-[1.6] text-high">
              내리면 그 방 사람들에게서만 사라져요.
            </p>
          )}

          <GoButton onClick={submit}>저장</GoButton>
        </>
      )}
    </Sheet>
  );
}
