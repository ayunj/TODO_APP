'use client';

import { useEffect, useState } from 'react';
import Sheet from '@/components/Sheet';
import { GoButton } from '@/components/form';
import { tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';

/**
 * 콕 찌를까요 — **확인 한 장이다.**
 *
 * 보낼 말을 고르는 안이 있었지만 안 쓴다. **말을 보내기 시작하면 그 말을 관리해야 한다** —
 * 문구를 고치고, 늘리고, 누가 뭘 보냈는지 남길지 정해야 한다. **말은 카톡이 한다.**
 * 여기서는 "봐 달라"는 신호만 보내고, 그 신호를 **하루 세 번으로 묶어두는 것**이 전부다.
 *
 * 고를 게 없으니 남는 것은 둘뿐이다 — **누구에게 가는지**와 **남은 횟수**.
 *
 * **남은 횟수는 누르기 전에 보여준다.** 누른 뒤에 "다 썼습니다"가 뜨면 쓴 사람만 억울하다.
 *
 * 조용한 시간 규칙은 여기서 말하지 않는다. 보내는 사람이 그때 알아야 할 것은 남은 횟수뿐이다.
 */
export default function NudgeSheet({ id }: { id: string }) {
  const { tasks, categoryOf } = useStore();
  const { membersOf, sendNudge, nudgesLeft } = useRooms();
  const { closeSheet } = useUi();

  const task = tasks.find((t) => t.id === id) ?? null;
  const roomId = task?.roomId ?? null;
  const people = roomId ? membersOf(roomId) : [];
  const category = task ? categoryOf(task.categoryId) : null;

  // 담당자가 있으면 그 사람에게만, `안 정함`이면 방 전체에게.
  // 아무도 안 하는 일을 찌르는 자리가 있어야 한다.
  const whom = task?.assigneeId ?? null;
  const toName = whom
    ? (people.find((m) => m.userId === whom)?.displayName ?? '누군가')
    : '방 전체';

  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    nudgesLeft(roomId)
      .then((n) => {
        if (alive) setLeft(n);
      })
      .catch(() => {
        if (alive) setLeft(null);
      });
    return () => {
      alive = false;
    };
  }, [roomId, nudgesLeft]);

  const go = async () => {
    if (!task || !roomId) return;
    setBusy(true);
    try {
      const rest = await sendNudge(roomId, task.id, whom);
      toast(rest > 0 ? `콕! — ${rest}번 남았어요` : '콕! — 오늘은 이걸로 다 썼어요');
      closeSheet();
    } catch (e) {
      toast(e instanceof Error ? e.message : '보내지 못했습니다');
      setBusy(false);
    }
  };

  const empty = !task || !roomId || people.length <= 1;

  return (
    <Sheet title="콕 찌를까요?" onClose={closeSheet}>
      {empty ? (
        <p className="ml-1 text-[13px] text-ink3">찌를 사람이 없어요.</p>
      ) : (
        <>
          <p className="mb-4 ml-1 flex flex-wrap items-center gap-2 text-[13px] text-ink2">
            {category && (
              <span
                className="rounded-full px-[9px] py-px text-[10.5px] font-medium"
                style={{ background: tintOf(category.color), color: category.color }}
              >
                {category.name}
              </span>
            )}
            <span>{task.title}</span>
            <span className="text-faint">·</span>
            <b className="font-semibold text-ink">{toName}에게</b>
          </p>

          <p className="mb-1 ml-1 text-[12px] text-ink3">
            {left === null ? (
              '\u00A0'
            ) : left > 0 ? (
              <>
                <b className="font-semibold text-ink2">오늘 {left}번 남았어요.</b> 아침 6시에 다시
                세 번이 됩니다.
              </>
            ) : (
              <>오늘은 다 썼어요. 아침 6시에 다시 세 번이 됩니다.</>
            )}
          </p>

          <GoButton onClick={() => void go()} disabled={busy || left === 0}>
            콕
          </GoButton>
        </>
      )}
    </Sheet>
  );
}
