/**
 * 곰돌이 그림 넣기 — `npm run gomdori`
 *
 * 원본은 `assets/gomdori/`에 있다. 로고·아이콘과 같은 자리다 —
 * **원본은 assets, 앱이 받는 것은 public.**
 *
 * 원본을 그대로 `public/`에 넣으면 **홈이 뜰 때마다 1.4MB를 받는다.**
 * 앱에서 실제로 뜨는 크기에 맞춰 줄이고 눌러 담는다.
 *
 * 방은 카드 폭을 통째로 쓰는 정사각이라 폰에서 328~488px이고,
 * 곰돌이는 그 안에서 방 폭의 62%까지다. @2x면 넉넉하다 —
 * @3x까지 담으면 파일이 배로 느는데 손그림이라 그만큼 또렷해지지도 않는다.
 *
 * **파일 이름이 곧 코스튬 열쇠다.** `src/lib/costumes.ts`의 `img`가 이 이름을 가리킨다.
 * 새 옷 그림이 오면 `assets/gomdori/`에 열쇠 이름으로 넣고 이 목록에 한 줄 더하면 된다.
 */
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../assets/gomdori/', import.meta.url);
const OUT = new URL('../public/gomdori/', import.meta.url);

/**
 * 무엇을 몇 픽셀로. 안 적힌 파일은 **곰돌이 몸**으로 친다 —
 * 옷이 늘 때마다 이 표를 고치게 하지 않으려고 그렇게 뒀다.
 */
const SIZES = {
  room: 1000,
  'store-banner': 1000,
};
const BODY = 760;

await mkdir(OUT, { recursive: true });

const files = (await readdir(fileURLToPath(SRC))).filter((f) => f.endsWith('.png'));
if (files.length === 0) {
  console.log('\nassets/gomdori/ 가 비어 있습니다.\n');
  process.exit(0);
}

for (const file of files) {
  const key = file.replace(/\.png$/, '');
  const size = SIZES[key] ?? BODY;
  /*
   * 팔레트로 눌러 담는다. 손그림이라 쓰는 색이 많지 않아 티가 안 나고,
   * **PNG8도 투명을 그대로 지킨다** — 곰돌이 둘레가 네모로 잘리지 않는다.
   */
  const info = await sharp(fileURLToPath(new URL(file, SRC)))
    .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 82 })
    .toFile(fileURLToPath(new URL(file, OUT)));
  console.log(`${file.padEnd(18)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}

console.log(`\npublic/gomdori/ 에 ${files.length}개 넣었습니다.\n`);
