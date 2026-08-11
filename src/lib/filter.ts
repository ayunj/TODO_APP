'use client';

import { useMemo } from 'react';
import { useRooms } from './rooms';
import { useStore } from './store';
import { useUi } from './ui';

/**
 * 헤더 줄에서 고른 것 → **어느 카테고리들을 볼 것인가**. `null`이면 안 가린다.
 *
 * 카테고리를 고르면 그것만 걸린다. 방을 고르면 그 방 카테고리가 걸리는데,
 * **방 하나에 카테고리 하나**라 지금 만드는 것은 늘 한 칸이다 —
 * 여럿이 나오는 건 여러 개를 올릴 수 있던 때 만든 방뿐이다.
 *
 * 화면 다섯 곳(일·월·기록·지난 미완료·즐겨찾기 칩)이 같은 답을 봐야 해서 여기 한 벌만 둔다.
 * 방으로 거르는 것을 `task.roomId`가 아니라 **카테고리로** 푸는 이유가 있다 —
 * 아직 못 받아온 방에 걸린 카테고리도 같은 방식으로 한 묶음이 되고,
 * 걸러내는 규칙이 한 가지로 남는다.
 */
export function useTaskFilter(): { cats: string[] | null; name: string | null } {
  const { categories } = useStore();
  const { rooms } = useRooms();
  const { scope, filter } = useUi();

  return useMemo(() => {
    // 지워진 카테고리를 가리키고 있으면 못 본 척하고 묶음으로 내려간다
    const picked = filter ? categories.find((c) => c.id === filter) : null;
    if (picked) return { cats: [picked.id], name: picked.name };
    if (scope === 'all') return { cats: null, name: null };

    const known = new Set(rooms.map((r) => r.id));
    const list = categories.filter((c) =>
      scope === 'stray'
        ? Boolean(c.roomId) && !known.has(c.roomId ?? '')
        : c.roomId === scope,
    );
    /*
      묶음이 비었으면 안 가린 것으로 돌린다.
      방에서 나왔거나 그 방 카테고리를 다 거둔 참인데, 이걸 그대로 두면
      아무것도 안 뜨는 화면 앞에서 왜 비었는지를 알 길이 없다.
    */
    if (!list.length) return { cats: null, name: null };

    const name =
      scope === 'stray' ? '공유' : (rooms.find((r) => r.id === scope)?.name ?? null);

    return { cats: list.map((c) => c.id), name };
  }, [categories, rooms, scope, filter]);
}
