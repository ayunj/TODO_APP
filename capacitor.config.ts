import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 안드로이드 껍데기 설정.
 *
 * `out/`을 통째로 담는다 — 서버를 보지 않는다. 앱이 이미 IndexedDB로 로컬을 먼저 보기 때문에
 * 비행기 모드에서도 그대로 돌고, 로그인했을 때만 Supabase로 나간다.
 *
 * **`appId`는 한 번 스토어에 올리면 다시 못 바꾼다.** 지금 정해두고 손대지 않는다.
 */
const config: CapacitorConfig = {
  appId: 'app.everyeight.todo',
  appName: '할 일',
  webDir: 'out',
  android: {
    // 배경이 흰색으로 번쩍이지 않게 앱 바탕색과 맞춘다 (manifest의 background_color와 같은 값)
    backgroundColor: '#FAF6F0',
  },
};

export default config;
