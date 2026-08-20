'use client';

import { Capacitor } from '@capacitor/core';

/**
 * 콕 찌르기 푸시 — **앱이 꺼진 남의 폰을 울리는 유일한 길이다.**
 *
 * 나머지는 다 기기 안에서 끝나는데([알림](./notify.ts)) 이것만 남의 기기라
 * FCM과 서버 코드가 붙는다. 이 앱이 서버에 코드를 두는 유일한 지점이다.
 *
 * **없어도 돌아간다.** 파이어베이스 설정이 없으면 등록이 조용히 실패하고,
 * 콕은 앱을 열 때 `nudges`로 받는 그대로 뜬다 — 폰이 안 울릴 뿐이다.
 * 그래서 여기서는 어떤 실패도 화면으로 올리지 않는다.
 */

const native = () => Capacitor.isNativePlatform();
const plugin = async () => (await import('@capacitor/push-notifications')).PushNotifications;

/** 콕은 제 채널을 쓴다 — 안드로이드 설정에서 **콕만 끄기**가 된다 */
const CHANNEL = 'nudge';

/**
 * 이 기기를 콕 받을 수 있게 등록한다. 받은 토큰을 넘겨준다.
 *
 * **권한을 여기서 새로 묻지 않는다.** 아침·저녁 알림에서 이미 물어본 그 권한이고,
 * 안드로이드는 앱 하나에 하나뿐이다. 이미 허락했으면 그대로 쓰고, 아니면 조용히 물러난다 —
 * 콕 하나 때문에 앱을 열자마자 권한 창이 뜨면 그게 제일 나쁘다.
 */
export function registerPush(save: (token: string) => void): () => void {
  if (!native()) return () => {};
  let off: (() => void) | null = null;
  let dead = false;

  void (async () => {
    try {
      const push = await plugin();
      if ((await push.checkPermissions()).receive !== 'granted') return;
      if (dead) return;

      await push.createChannel({
        id: CHANNEL,
        name: '콕 찌르기',
        description: '같이 쓰는 사람이 콕 찔렀을 때',
        importance: 4,
      });

      const handle = await push.addListener('registration', (t) => save(t.value));
      // 파이어베이스 설정이 없으면 여기서 실패한다. 그대로 둔다 — 앱은 멀쩡히 돈다.
      const failed = await push.addListener('registrationError', () => {});
      await push.register();

      if (dead) {
        void handle.remove();
        void failed.remove();
      } else {
        off = () => {
          void handle.remove();
          void failed.remove();
        };
      }
    } catch {
      /* 파이어베이스가 안 붙은 앱 — 콕은 앱을 열 때 받는다 */
    }
  })();

  return () => {
    dead = true;
    off?.();
  };
}
