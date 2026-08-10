'use client';

import PageBar from '@/components/PageBar';
import { ActionRow, Group, Note } from '@/components/rows';
import { tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { useUi } from '@/lib/ui';

/**
 * 같이 쓰기 — 쓰는 방이 먼저, 밑에 방 만들기·초대 코드 넣기.
 * 누가 연 방인지가 줄마다 보인다. 방이 하나도 없으면 아래 두 줄만 남는다.
 */
export default function ShareScreen() {
  const { rooms, membersOf } = useRooms();
  const { pushView } = useUi();

  return (
    <>
      <PageBar title="같이 쓰기" />

      {rooms.length > 0 && (
        <Group label="쓰는 방">
          {rooms.map((room) => {
            const people = membersOf(room.id);
            const owner = people.find((m) => m.role === 'owner');
            const who = room.mine ? '내가 연 방' : `${owner?.displayName ?? '누군가'}가 연 방`;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => pushView({ kind: 'room', id: room.id })}
                className="flex w-full items-center gap-2.5 rounded-2xl bg-card px-[15px] py-4 text-left text-[14.5px] shadow-card active:bg-sunk"
              >
                <span
                  className="inline-flex flex-none items-center rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                  style={{ background: tintOf(room.color), color: room.color }}
                >
                  {room.name}
                </span>
                <span className="ml-auto min-w-0 truncate text-[12px] text-ink3">
                  {who} · {people.length}명
                </span>
                <span className="text-[15px] text-ink3">›</span>
              </button>
            );
          })}
        </Group>
      )}

      <div className={rooms.length > 0 ? 'mt-4' : ''}>
        <Group>
          <ActionRow onClick={() => pushView({ kind: 'room', id: null })}>방 만들기</ActionRow>
          <ActionRow onClick={() => pushView({ kind: 'join' })}>초대 코드 넣기</ActionRow>
        </Group>
      </div>

      {rooms.length === 0 && (
        <Note>방을 만들어 같이 쓰거나, 받은 코드로 남의 방에 들어갈 수 있어요.</Note>
      )}
    </>
  );
}
