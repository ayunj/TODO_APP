'use client';

import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { TrashScope } from '@/lib/types';

/**
 * 장보기·메모 화면 맨 아래에 붙는 `지운 것` 한 줄.
 *
 * 이 둘에는 카테고리가 없어서 들어갈 자리가 제 화면밖에 없다.
 * 비어 있어도 그린다 — 없어진 걸 찾는 사람은 이미 급한 참이라
 * 그때 처음 보이는 줄로는 늦다. **평소에 한 번 봐둬야 어디 있는지 안다.**
 *
 * **여기 오르는 것은 개인 것뿐이다.** 그래서 방 칩을 눌러둔 동안에는
 * 이 줄을 아예 안 그린다(부르는 쪽이 정한다) — 방 것은 방 설정 한자리에 모이는데,
 * 그 앞에서 개인 지운 것을 세고 있으면 방 것이 여기 있는 줄 알고 찾게 된다.
 */
export default function TrashLine({ scope }: { scope: Extract<TrashScope, 'shop' | 'memo'> }) {
  const { trash } = useStore();
  const { pushView } = useUi();

  // 방 것은 방 설정에 모인다. 여기 오르는 것은 개인 것뿐이다.
  const count = trash.filter((t) => t.rooms.length === 0 && t.kind === scope).length;

  return (
    <button
      type="button"
      onClick={() => pushView({ kind: 'trash', scope, id: '' })}
      className="mt-6 flex w-full items-center border-t border-line py-3 text-[12px] text-ink3 active:text-ink2"
    >
      지운 것 {count}개
      <span className="ml-auto text-[15px]">›</span>
    </button>
  );
}
