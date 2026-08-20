'use client';

import { tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 받은 콕 — 오늘 화면 맨 위 한 줄.
 *
 * **여기선 이름을 쓴다.** [배정 띠](./AssignedBanner.tsx)와 반대다 —
 * 배정은 누가 시켰는지가 부담이 되지만, 찌르기는 **사람이 보낸 것**이라
 * 누가 보냈는지가 곧 내용이다. 이름이 없으면 `누가 찔렀지`부터 묻게 된다.
 *
 * **한 번 뜨고 끝이다.** 닫으면 서버에서도 지운다 — 쌓아두면 증거가 되고,
 * 증거가 되면 싸움이 된다. 줄어드는 건 보낸 사람의 남은 횟수뿐이다.
 *
 * 푸시(FCM)가 붙기 전까지는 이 띠가 알림 자리를 맡는다.
 * 그때가 되면 이 띠는 **앱이 열려 있는 동안 받은 것**만 그리게 된다.
 */
export default function NudgeBanner() {
  const { nudges, clearNudges } = useRooms();
  const { categoryOf, tasks } = useStore();
  const { setCursor, openSheet } = useUi();

  if (nudges.length === 0) return null;

  const [first, ...rest] = nudges;
  // 카테고리가 지워졌으면 칩을 안 그린다 — 없는 이름을 지어내지 않는다
  const category = first.categoryId ? categoryOf(first.categoryId) : null;
  const task = first.taskId ? (tasks.find((t) => t.id === first.taskId) ?? null) : null;

  const done = () => void clearNudges(nudges.map((n) => n.id));

  return (
    <div className="mb-[11px] flex items-start gap-[9px] rounded-card bg-card px-[14px] py-3 text-[12.5px] shadow-card">
      <span className="mt-px flex-none text-[15px]">👋</span>

      <button
        type="button"
        onClick={() => {
          // 그 할 일로 데려다준다. 이미 지워졌거나 못 받아온 것이면 자리만 닫는다.
          if (task) {
            setCursor(task.date);
            openSheet({ kind: 'task', id: task.id });
          }
          done();
        }}
        className="min-w-0 flex-1 bg-transparent text-left"
      >
        <b className="font-semibold text-ink">{first.fromName} — 콕 찔렀어요</b>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-ink2">
          {category && (
            <span
              className="rounded-full px-[9px] py-px text-[10.5px] font-medium"
              style={{ background: tintOf(category.color), color: category.color }}
            >
              {category.name}
            </span>
          )}
          <span className="break-words">{first.taskTitle}</span>
          {rest.length > 0 && <span className="text-ink3">· 그 밖에 {rest.length}개</span>}
        </span>
      </button>

      <button
        type="button"
        aria-label="닫기"
        onClick={done}
        className="-mr-1 grid h-7 w-7 flex-none place-items-center rounded-[10px] text-[14px] text-ink3 active:bg-sunk"
      >
        ×
      </button>
    </div>
  );
}
