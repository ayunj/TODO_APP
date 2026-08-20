import { supabase } from '../supabase';
import type { Nudge } from '../types';

/**
 * 실시간 — **상대가 체크한 게 바로 넘어온다.**
 *
 * 그전에는 앱을 열 때 한 번만 맞췄다. 같이 쓰는 사람이 같은 순간을 보고 있는 일이
 * 드물어서 급하지 않았는데, [콕 찌르기](../../../docs/nudge/기능.md)가 붙으면서 사정이 달라졌다 —
 * 찔렀는데 상대가 앱을 다시 열어야 뜨면 그건 찌른 게 아니다.
 *
 * 표는 이미 `supabase_realtime`에 올라가 있고, **RLS가 그대로 걸린다** —
 * 내가 못 읽는 줄은 알림도 안 온다. 방 밖의 것이 새어 나올 자리가 없다.
 */

/** 화면이 보는 다섯 가지. 지우기는 `deleted_at`을 다는 일이라 UPDATE로 온다. */
const TABLES = ['tasks', 'shop_items', 'memos', 'categories', 'presets'] as const;

/**
 * 무엇이든 바뀌면 알려준다. **무엇이 바뀌었는지는 안 넘긴다.**
 *
 * 받은 줄을 하나씩 끼워 넣는 길도 있는데, 그러면 합치는 규칙이 두 벌이 된다 —
 * [`settle`](./synced.ts)이 이미 하고 있는 일을 화면 쪽에서 한 번 더 쓰는 것이다.
 * **알림은 신호로만 쓰고 맞추는 일은 하던 길로 한 번 더 돌린다.**
 * 여럿이 우르르 바뀔 때를 대비해 부르는 쪽에서 잠깐 묶는다.
 *
 * 내가 쓴 것도 나에게 돌아온다. 한 번 더 맞추고 마는 것이라 그대로 둔다 —
 * 걸러내려면 방금 내가 쓴 것을 기억해둬야 하는데, 그 값이 틀리면 남의 변경을 놓친다.
 */
export function watchData(onChange: () => void): () => void {
  return watch((client, channel) => {
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
    }
    return client;
  });
}

/** 나에게 온 콕. 앱이 열려 있으면 그 자리에서 뜬다. */
export function watchNudges(me: string, onNudge: (n: Nudge) => void): () => void {
  return watch((client, channel) => {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'nudges', filter: `to_user=eq.${me}` },
      (msg) => {
        const r = msg.new as Record<string, unknown>;
        onNudge({
          id: String(r.id),
          roomId: String(r.room_id),
          fromName: String(r.from_name ?? '누군가'),
          taskId: (r.task_id as string) ?? null,
          taskTitle: String(r.task_title ?? ''),
          categoryId: (r.category_id as string) ?? null,
          createdAt: String(r.created_at ?? ''),
        });
      },
    );
    return client;
  });
}

/* ───────── 붙였다 떼는 일 ───────── */

let seq = 0;

/**
 * 클라이언트를 받아오는 동안에도 떼는 함수는 먼저 돌려줘야 한다 —
 * 그 사이에 화면이 사라지면 붙자마자 떼야 한다.
 */
function watch(
  attach: (
    client: Awaited<ReturnType<typeof supabase>>,
    channel: ReturnType<Awaited<ReturnType<typeof supabase>>['channel']>,
  ) => unknown,
): () => void {
  let off: (() => void) | null = null;
  let dead = false;

  void supabase()
    .then((client) => {
      if (dead) return;
      // 이름이 겹치면 한쪽이 조용히 끊긴다
      const channel = client.channel(`live-${++seq}`);
      attach(client, channel);
      channel.subscribe();
      off = () => void client.removeChannel(channel);
      if (dead) off();
    })
    .catch(() => {
      /* 못 붙으면 앱 열 때 맞추는 그대로 돈다 — 실시간 하나로 화면을 막지 않는다 */
    });

  return () => {
    dead = true;
    off?.();
  };
}
