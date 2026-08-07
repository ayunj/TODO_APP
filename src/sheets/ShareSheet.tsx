'use client';

import Sheet from '@/components/Sheet';
import { tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { useUi } from '@/lib/ui';

/**
 * 같이 쓰기 — 쓰는 방이 먼저, 밑에 방 만들기·초대 코드 넣기.
 * 누가 연 방인지가 줄마다 보인다.
 */
export default function ShareSheet() {
  const { rooms, membersOf } = useRooms();
  const { openSheet, closeSheet } = useUi();

  const back = () => openSheet({ kind: 'settings' });

  const line =
    'flex items-center gap-2.5 rounded-2xl bg-card px-[15px] py-4 text-[14.5px] shadow-card active:bg-sunk';
  const action =
    'rounded-2xl border-[1.6px] border-edge px-[15px] py-4 text-[13.5px] font-medium text-ink active:bg-sunk';

  return (
    <Sheet title="같이 쓰기" onClose={closeSheet} onBack={back}>
      {rooms.length > 0 && (
        <>
          <p className="mb-2 ml-1 text-[12px] text-ink2">쓰는 방</p>
          <div className="mb-4 flex flex-col gap-[9px]">
            {rooms.map((room) => {
              const people = membersOf(room.id);
              const owner = people.find((m) => m.role === 'owner');
              const who = room.mine ? '내가 연 방' : `${owner?.displayName ?? '누군가'}가 연 방`;
              return (
                <button
                  key={room.id}
                  type="button"
                  className={line}
                  onClick={() => openSheet({ kind: 'room', id: room.id })}
                >
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                    style={{ background: tintOf(room.color), color: room.color }}
                  >
                    {room.name}
                  </span>
                  <span className="ml-auto text-[12px] text-ink3">
                    {who} · {people.length}명
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex flex-col gap-[9px]">
        <button type="button" className={action} onClick={() => openSheet({ kind: 'room', id: null })}>
          방 만들기
        </button>
        <button type="button" className={action} onClick={() => openSheet({ kind: 'join' })}>
          초대 코드 넣기
        </button>
      </div>

      {rooms.length === 0 && (
        <p className="mt-3 ml-1 text-[11.5px] leading-[1.6] text-ink3">
          방을 만들어 같이 쓰거나, 받은 코드로 남의 방에 들어갈 수 있어요.
        </p>
      )}
    </Sheet>
  );
}
