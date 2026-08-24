/**
 * 로고 여백 깎기 — `npm run logo [원본경로]`
 *
 * 원본은 3:1 캔버스 한가운데에 글자가 떠 있다. 그대로 쓰면 높이의 44%가 빈칸이라
 * 헤더에서 `h-5`를 줘도 글자는 11px로 앉는다. 둘레를 깎아 **글자 높이 = 그림 높이**로 맞춘다.
 *
 * 원본을 다시 뽑아도 여백이 그때그때 다르므로 좌표를 박아두지 않고 투명한 자리를 읽는다.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2] ?? fileURLToPath(new URL('../assets/logo.png', import.meta.url));
const OUT = fileURLToPath(new URL('../public/logo.png', import.meta.url));

const H = 160; // 내보내는 높이 — 헤더에서 20px로 앉으니 레티나에서도 두 배 넘게 남는다

const src = sharp(SRC);
const before = await src.metadata();

const info = await src
  .clone()
  .trim({ threshold: 1 })
  .resize({ height: H, withoutEnlargement: true })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(OUT);

console.log(`\n원본 ${before.width}x${before.height} → public/logo.png ${info.width}x${info.height}\n`);
