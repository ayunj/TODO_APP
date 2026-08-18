'use client';

import { useAuth } from '@/lib/auth';
import { tintOf } from '@/lib/constants';
import { iga } from '@/lib/ko';
import { handedToMe } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 배정 띠 — **앱을 열었을 때** 오늘 화면 맨 위에 한 줄.
 *
 * **누가 시켰다고 하지 않는다.** `남편이 설거지를 맡겼어요`는 시키는 말로 읽힌다.
 * 사람 이름을 빼고 카테고리 칩을 넣는다 — 누가 정했는지보다 **어느 쪽 일인지**가 중요하다.
 *
 * 닫는 길이 둘이다.
 *
 * - **`×`** — 봤다는 뜻. 이 뒤로 넘어온 것만 다시 뜬다
 * - **그 일을 하는 것** — 완료하면 셈에서 빠져 저절로 사라진다
 *
 * 눌러도 안 닫는다. 그 일로 데려다주기만 한다 —
 * 여럿일 때 하나 보러 갔다고 나머지까지 본 것으로 치면 그게 못 본 것이 된다.
 */
export default function AssignedBanner() {
  const { tasks, categoryOf, assignSeenAt, markAssignsSeen } = useStore();
  const { account } = useAuth();
  const { setCursor, openSheet } = useUi();

  const fresh = handedToMe(tasks, account?.id ?? null, assignSeenAt);
  if (fresh.length === 0) return null;

  const [first, ...rest] = fresh;
  const category = categoryOf(first.categoryId);

  return (
    <div className="mb-[11px] flex items-center gap-[9px] rounded-card bg-card px-[14px] py-3 text-[12.5px] shadow-card">
      <span
        className="flex-none rounded-full px-[9px] py-px text-[10.5px] font-medium"
        style={{ background: tintOf(category.color), color: category.color }}
      >
        {category.name}
      </span>

      {/* 다음 주 것이 넘어왔을 수도 있어서 그 날로 옮겨준 다음에 연다 */}
      <button
        type="button"
        onClick={() => {
          setCursor(first.date);
          openSheet({ kind: 'task', id: first.id });
        }}
        className="min-w-0 flex-1 break-words bg-transparent text-left text-ink2"
      >
        <b className="font-semibold text-ink">{first.title}</b>
        {rest.length > 0 ? `, 그 밖에 ${rest.length}개가` : iga(first.title)} 내 차례가 됐어요
      </button>

      <button
        type="button"
        aria-label="닫기"
        onClick={markAssignsSeen}
        className="-mr-1 grid h-7 w-7 flex-none place-items-center rounded-[10px] text-[14px] text-ink3 active:bg-sunk"
      >
        ×
      </button>
    </div>
  );
}
