/**
 * 곰돌이 그림 넣기 — `npm run gomdori`
 *
 * 원본은 시안 폴더(`design/g/`)에 있는 큰 그림이다. 그대로 `public/`에 넣으면
 * **홈 화면이 뜰 때마다 1.4MB를 받는다.** 앱에서 실제로 뜨는 크기에 맞춰 줄이고 눌러 담는다.
 *
 * 방은 카드 폭을 통째로 쓰는 정사각이라 폰에서 328~488px이고,
 * 곰돌이는 그 안에서 방 폭의 62%까지다. @2x면 넉넉하다 —
 * @3x까지 담으면 파일이 배로 느는데 손그림이라 그만큼 또렷해지지도 않는다.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../design/g/', import.meta.url);
const OUT = new URL('../public/gomdori/', import.meta.url);

/**
 * 둘 다 팔레트로 눌러 담는다. 손그림이라 쓰는 색이 많지 않아 티가 안 나고,
 * **PNG8도 투명을 그대로 지킨다** — 곰돌이 둘레가 네모로 잘리지 않는다.
 */
const CUTS = [
  { from: 'main_room.png', to: 'room.png', size: 1000 },
  { from: 'main.png', to: 'front.png', size: 760 },
];

await mkdir(OUT, { recursive: true });

for (const cut of CUTS) {
  const from = fileURLToPath(new URL(cut.from, SRC));
  const to = fileURLToPath(new URL(cut.to, OUT));
  const info = await sharp(from)
    .resize({ width: cut.size, height: cut.size, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 82 })
    .toFile(to);
  console.log(`${cut.to.padEnd(12)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}

console.log('\npublic/gomdori/ 에 넣었습니다.\n');
