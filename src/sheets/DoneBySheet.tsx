'use client';

import Sheet from '@/components/Sheet';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 누가 했나 — 이름만 갈아 끼운다.
 *
 * 남편이 해놓고 안 눌러서 내가 대신 누르는 일이 실제로 잦다. 그러면 내가 한 걸로 남는다.
 * 지우고 다시 체크하게 두면 **완료한 시각이 바뀌고 반복이면 회차가 하나 더 생긴다.**
 */
export default function DoneBySheet({ id }: { id: string }) {
  const { tasks, setDoneBy } = useStore();
  const { membersOf } = useRooms();
  const { closeSheet } = useUi();

  const task = tasks.find((t) => t.id === id) ?? null;
  const people = task?.roomId ? membersOf(task.roomId) : [];

  return (
    <Sheet title="누가 했나요" onClose={closeSheet}>
      {!task || people.length === 0 ? (
        <p className="ml-1 text-[13px] text-ink3">고를 사람이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {people.map((m) => {
            const on = m.displayName === task.doneBy;
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => {
                  if (!on) setDoneBy(task.id, m.displayName);
                  closeSheet();
                }}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-[15px] py-4 text-left text-[14.5px] shadow-card active:bg-sunk ${
                  on ? 'bg-accent-tint text-accent' : 'bg-card'
                }`}
              >
                {m.displayName}
                {on && <span className="ml-auto text-[12px]">지금 이 사람</span>}
              </button>
            );
          })}
        </div>
      )}
      <p className="ml-1 mt-3 text-[11.5px] leading-[1.6] text-ink3">
        이름만 바뀌고 완료한 시각은 그대로예요.
      </p>
    </Sheet>
  );
}
