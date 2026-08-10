'use client';

import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { TrashScope } from '@/lib/types';

/**
 * 장보기·메모 화면 맨 아래에 붙는 `지운 것` 한 줄.
 *
 * 이 둘에는 카테고리가 없어서 들어갈 자리가 제 화면밖에 없다.
 * **비어 있으면 아예 안 그린다** — 평소에는 없는 줄이고, 없어진 걸 찾을 때만 생긴다.
 */
export default function TrashLine({ scope }: { scope: Extract<TrashScope, 'shop' | 'memo'> }) {
  const { trash } = useStore();
  const { pushView } = useUi();

  // 방 것은 방 설정에 모인다. 여기 오르는 것은 개인 것뿐이다.
  const count = trash.filter((t) => !t.roomId && t.kind === scope).length;
  if (count === 0) return null;

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
