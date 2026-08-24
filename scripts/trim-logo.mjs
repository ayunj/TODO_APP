/**
 * 로고 여백 깎기 — `npm run logo [원본경로]`
 *
 * 원본은 넓은 캔버스 한가운데에 그림이 떠 있다. 그대로 쓰면 빈칸까지 높이로 잡혀
 * 화면에 작게 앉는다. 둘레를 깎아 **그림 높이 = 파일 높이**로 맞춘다.
 *
 * 원본을 다시 뽑아도 여백이 그때그때 다르므로 좌표를 박아두지 않고 투명한 자리를 읽는다.
 *
 * 인자를 주면 헤더 로고만 다시 깎는다. 없으면 로그인 그림도 같이 깎는다.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const H_HEADER = 160; // 헤더에서 20px로 앉으니 레티나에서도 두 배 넘게 남는다
const H_LOGIN = 480; // 화면에서 168px로 앉으니 레티나에서도 두 배 넘게 남는다

async function trim(src, out, height) {
  const img = sharp(src);
  const before = await img.metadata();
  const info = await img
    .clone()
    .trim({ threshold: 1 })
    .resize({ height, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(out);
  const name = out.replace(/^.*[\\/]/, '');
  console.log(`원본 ${before.width}x${before.height} → ${name} ${info.width}x${info.height}`);
}

const given = process.argv[2];
const headerSrc = given ?? fileURLToPath(new URL('../assets/logo.png', import.meta.url));
const headerOut = fileURLToPath(new URL('../public/logo.png', import.meta.url));

console.log('');
await trim(headerSrc, headerOut, H_HEADER);

if (!given) {
  await trim(
    fileURLToPath(new URL('../assets/login_logo.png', import.meta.url)),
    fileURLToPath(new URL('../public/login_logo.png', import.meta.url)),
    H_LOGIN,
  );
}
console.log('');
