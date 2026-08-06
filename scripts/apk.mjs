/**
 * APK 굽기 — `npm run app:apk`가 `app:build` 다음에 부른다.
 *
 * npm 스크립트에 `cd android && gradlew`라고 적으면 셸을 타는데,
 * cmd·PowerShell·Git Bash가 래퍼를 찾는 방식이 저마다 달라서 한 군데서만 된다.
 * 래퍼의 전체 경로를 직접 실행해서 셸을 아예 안 거친다.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const win = process.platform === 'win32';
const android = fileURLToPath(new URL('../android/', import.meta.url));
const wrapper = android + (win ? 'gradlew.bat' : 'gradlew');

// 윈도에서는 shell 없이 .bat을 못 돌린다 (Node가 막았다). 경로에 공백이 있을 수 있어 따옴표로 싼다.
const { status, error } = spawnSync(win ? `"${wrapper}"` : wrapper, ['assembleDebug'], {
  cwd: android,
  stdio: 'inherit',
  shell: win,
});

if (error) {
  console.error(error.message); // 삼키면 아무 말 없이 실패해서 한참 헤맨다
  process.exit(1);
}
if (status === 0) {
  console.log('\nandroid/app/build/outputs/apk/debug/app-debug.apk');
}
process.exit(status ?? 1);
