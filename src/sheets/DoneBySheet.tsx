'use client';

import { useState } from 'react';
import PersonChip from '@/components/PersonChip';
import Sheet from '@/components/Sheet';
import { GoButton } from '@/components/form';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 누가 했나 — **이름만 갈아 끼운다.**
 *
 * 남편이 해놓고 안 눌러서 내가 대신 누르는 일이 실제로 잦다. 그러면 내가 한 걸로 남는다.
 * 지우고 다시 체크하게 두면 **완료한 시각이 바뀌고 반복이면 회차가 하나 더 생긴다.**
 */
export default function DoneBySheet({ id }: { id: string }) {
  const { tasks, setDoneBy } = useStore();
  const { account } = useAuth();
  const { membersOf } = useRooms();
  const { closeSheet } = useUi();

  const task = tasks.find((t) => t.id === id) ?? null;
  const people = task?.roomId ? membersOf(task.roomId) : [];

  // 체크한 사람이 먼저 찍혀 있다. 다르면 눌러서 바꾼다.
  const [picked, setPicked] = useState(task?.doneBy ?? '');

  const save = () => {
    if (task && picked && picked !== task.doneBy) setDoneBy(task.id, picked);
    closeSheet();
  };

  return (
    <Sheet title="누가 했나요" onClose={closeSheet}>
      {!task || people.length === 0 ? (
        <p className="ml-1 text-[13px] text-ink3">고를 사람이 없어요.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-[7px]">
            {people.map((m) => (
              <PersonChip
                key={m.userId}
                name={m.displayName}
                me={m.userId === account?.id}
                on={picked === m.displayName}
                onClick={() => setPicked(m.displayName)}
              />
            ))}
          </div>

          <div className="mt-5">
            <GoButton onClick={save}>저장</GoButton>
          </div>
        </>
      )}
    </Sheet>
  );
}
