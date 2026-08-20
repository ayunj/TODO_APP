'use client';

import { Capacitor } from '@capacitor/core';
import { addDays, atTime, todayStr } from './date';
import { myTasksOn } from './selectors';
import type { DateStr, Task } from './types';

/**
 * 아침·저녁 알림 — **기기가 스스로 띄운다.**
 *
 * 서버도 FCM도 열쇠 관리도 없다. 오늘 할 일은 이미 폰 안에 다 있어서
 * ([sync](../../docs/account/sync/기능.md)) 서버가 시각을 세어 밀어줄 이유가 없다.
 * 비행기 모드에서도 뜨고, 넷 중 유일하게 아무것도 안 기다리는 기능이 된다.
 *
 * **대신 안드로이드 앱에서만 된다.** 브라우저로 쓰는 사람에게는 안 뜬다 —
 * 그건 서버로 갈 이유가 아니라 앱을 깔 이유가 하나 는 것이다.
 *
 * **문구가 예약할 때 고정된다.** 로컬 알림은 예약하는 순간의 글씨를 들고 잔다.
 * 그래서 앱이 열릴 때마다, 할 일이 바뀔 때마다 **이틀치를 통째로 다시 건다.**
 */

/** 아침·저녁을 안드로이드 설정에서 따로 끌 수 있게 채널을 둘 둔다 */
const CHANNELS = [
  { id: 'todo', name: '오늘 할 일', description: '그 날 할 일을 미리 알려줍니다' },
  { id: 'left', name: '오늘 남은 일', description: '하루를 닫기 전에 남은 것을 알려줍니다' },
] as const;

export type NotifyKind = (typeof CHANNELS)[number]['id'];

/**
 * 이틀치만 건다.
 *
 * 하루만 걸면 오늘 안 열고 자는 날 내일 아침이 조용하다.
 * 이레치를 걸면 그만큼 옛 글씨가 오래 남는다 — 하루에 한 번만 열어도 이틀이면 대체로 맞는다.
 */
const DAYS = 2;

/** 저녁 알림에 붙는 단추. `내일로 미루기`를 누르면 앱이 열리면서 이 값이 온다. */
export const POSTPONE = 'postpone';
const ACTION_TYPE = 'left-actions';

/** 우리가 건 것만 지운다. 남이 건 알림까지 쓸어버리지 않게 번호를 갈라 쓴다. */
const idOf = (kind: NotifyKind, day: number) => (kind === 'todo' ? 1000 : 2000) + day;
const OURS = CHANNELS.flatMap((c) =>
  Array.from({ length: DAYS }, (_, d) => ({ id: idOf(c.id, d) })),
);

/**
 * 알림 한 장의 글씨. 셀 것이 없으면 `null`이고, 그러면 **안 건다.**
 *
 * 할 일 없는 날 아침에 `오늘 0개`가 오면 사흘 뒤에 알림을 끈다.
 * 저녁도 마찬가지 — 다 했으면 안 띄운다.
 *
 * **개수 대신 첫 줄을 앞세운다.** 열게 만들고, 그 사이 하나쯤 어긋나도 덜 어색하다.
 */
export function notifyText(
  list: Task[],
  kind: NotifyKind,
  me: string | null,
): { title: string; body: string } | null {
  const n = list.length;
  if (n === 0) return null;

  const mine = me ? list.filter((t) => t.assigneeId === me).length : 0;
  const rest = n - mine;
  /*
    내 차례가 있으면 그게 먼저 읽혀야 하는 숫자다.
    `안 정함`이 섞여 있으면 둘 다 적는다 — 제목의 수와 본문의 줄 수가 어긋나면
    "그래서 몇 개라는 거지"가 된다.
  */
  const count =
    mine === 0 ? `${n}개` : rest === 0 ? `내 차례 ${n}개` : `${n}개 — 내 차례 ${mine}개`;

  return {
    title: kind === 'todo' ? `오늘 ${count}` : `${count} 남았어요`,
    body: n === 1 ? list[0].title : `${list[0].title}, 그 밖에 ${n - 1}개`,
  };
}

const native = () => Capacitor.isNativePlatform();

/** 플러그인은 앱에서만 불러온다 — 브라우저 뭉치에 안 섞이게 */
const plugin = async () => (await import('@capacitor/local-notifications')).LocalNotifications;

/**
 * 알림을 켤 때 권한을 묻는다. 허락받았으면 true.
 *
 * **앱을 처음 켤 때가 아니라 여기서 묻는다** — 이유를 알고 누른 사람은 허용을 누른다.
 * 안드로이드 13(티라미수)부터는 묻지 않으면 알림이 조용히 안 뜬다.
 */
export async function askNotifyPermission(): Promise<boolean> {
  if (!native()) return false;
  const n = await plugin();
  const now = await n.checkPermissions();
  if (now.display === 'granted') return true;
  if (now.display === 'denied') return false;
  return (await n.requestPermissions()).display === 'granted';
}

/**
 * 이틀치를 다시 건다. 걸기 전에 우리 것을 다 지운다 —
 * 지우고 다시 거는 게 고치는 것보다 단순하고, 개수가 여덟을 안 넘는다.
 *
 * 앱이 아니거나, 껐거나, 권한이 없으면 **지우기만 하고 끝낸다.**
 */
export async function reschedule(
  tasks: Task[],
  me: string | null,
  on: boolean,
  at: { todo: string; left: string },
): Promise<void> {
  if (!native()) return;
  const n = await plugin();

  await n.cancel({ notifications: OURS });
  if (!on) return;
  if ((await n.checkPermissions()).display !== 'granted') return;

  await Promise.all(CHANNELS.map((c) => n.createChannel({ ...c, importance: 3 })));
  await n.registerActionTypes({
    types: [{ id: ACTION_TYPE, actions: [{ id: POSTPONE, title: '내일로 미루기' }] }],
  });

  const now = new Date();
  const today = todayStr();
  const list = [];

  for (let day = 0; day < DAYS; day++) {
    const date: DateStr = addDays(today, day);
    const mine = myTasksOn(tasks, date, me);

    for (const { id: kind } of CHANNELS) {
      const when = atTime(date, kind === 'todo' ? at.todo : at.left);
      if (when <= now) continue; // 지난 시각은 안 건다 — 걸면 그 자리에서 울린다
      const text = notifyText(mine, kind, me);
      if (!text) continue;

      list.push({
        id: idOf(kind, day),
        title: text.title,
        body: text.body,
        channelId: kind,
        // 저녁 알림에서 바로 미루면 앱을 거의 안 열고도 하루가 닫힌다
        actionTypeId: kind === 'left' ? ACTION_TYPE : undefined,
        extra: { kind, date },
        /*
          Doze에서 몇 분 밀려도 아무 문제가 없다. 정확 알람 권한은 안 묻는다 —
          아침 알림이 8시 3분에 뜨는 것과 권한을 하나 더 묻는 것 중에는 앞이 낫다.
        */
        schedule: { at: when, allowWhileIdle: false, exact: false },
      });
    }
  }

  if (list.length) await n.schedule({ notifications: list });
}

/** 앱(Capacitor) 안인지. 브라우저에서는 알림이 아예 안 울린다. */
export const isApp = (): boolean => native();

/**
 * 저녁 알림의 `내일로 미루기`를 받는다. 떼는 함수를 돌려준다.
 *
 * **스토어를 직접 안 부른다.** 스토어가 이 파일을 부르고 있어서 서로 부르면 고리가 된다 —
 * 무엇을 할지는 [AppShell](../components/AppShell.tsx)이 정한다.
 *
 * 누르면 앱이 열린다. `앱을 안 열고`까지는 안 되지만 **한 번 눌러 하루가 닫힌다.**
 */
export function onNotifyAction(run: (actionId: string, date: DateStr) => void): () => void {
  if (!native()) return () => {};
  let off: (() => void) | null = null;
  let dead = false;

  void plugin().then(async (n) => {
    const handle = await n.addListener('localNotificationActionPerformed', (e) => {
      const date = (e.notification.extra as { date?: DateStr } | undefined)?.date;
      if (date) run(e.actionId, date);
    });
    if (dead) void handle.remove();
    else off = () => void handle.remove();
  });

  return () => {
    dead = true;
    off?.();
  };
}
