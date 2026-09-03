/**
 * 앱과 같이 나가는 그림 — `npm run gomdori`
 *
 * 원본은 `assets/gomdori/`에 있다. 로고·아이콘과 같은 자리다 —
 * **원본은 assets, 앱이 받는 것은 public.**
 *
 * 원본을 그대로 `public/`에 넣으면 **홈이 뜰 때마다 1.4MB를 받는다.**
 * 앱에서 실제로 뜨는 크기에 맞춰 줄이고 눌러 담는다.
 *
 * 방은 카드 폭을 통째로 쓰는 정사각이라 폰에서 328~488px이고,
 * 곰돌이는 그 안에서 방 폭의 46%까지다. @2x면 넉넉하다 —
 * @3x까지 담으면 파일이 배로 느는데 손그림이라 그만큼 또렷해지지도 않는다.
 *
 * **여기 있는 것은 셋뿐이다** — 기본 곰돌이·기본 룸·상점 띠.
 * 파는 옷은 `assets/shop/`에 두고 `npm run shop`이 통에 올린다. 가르는 것은
 * **오프라인에서도 서야 하느냐**다 ([assets/shop/README.md](../assets/shop/README.md)).
 *
 * **파일 이름이 곧 코스튬 열쇠다.** `src/lib/costumes.ts`의 `img`가 이 이름을 가리킨다.
 */
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BODY, NOT_A_BEAR, stand } from './bears.mjs';

const SRC = new URL('../assets/gomdori/', import.meta.url);
const OUT = new URL('../public/gomdori/', import.meta.url);

/** 곰이 아닌 것은 몇 픽셀로. 곰은 `BODY` 정사각이다. */
const SIZES = {
  room: 1000,
  'store-banner': 1000,
  /*
    상점 배너 — **눈으로 보려고 잠깐 세워둔 한 장**이라 관리자가 하나라도 올리면
    안 쓴다([Banner.tsx](../src/screens/store/Banner.tsx)의 `SAMPLE_BANNER`).

    **올리는 배너는 1774로 담는데**(`fit.ts`의 `BANNER_W`) 이건 1080이다.
    화면에서 328dp로 서니 3배 화면에서도 984px이면 되고, 1774로 담으면
    **앱이 691KB를 더 지고 다닌다** — 잠깐 세워둘 것이 그만큼 무거울 까닭이 없다.
    눈으로는 다르지 않다.
  */
  'banner-sample': 1080,
  /*
    포인트 동전 — **화면에서 제일 큰 자리가 19dp**(제목 줄 지갑)다.
    3배 화면까지 또렷하면 되니 96이면 넉넉하다. 더 담아봐야 안 보이는 데에
    잉크를 쓰는 셈인데, 이건 **거의 모든 화면에 붙는 그림**이라 더 아깝다.
  */
  coin: 96,
};

await mkdir(fileURLToPath(OUT), { recursive: true });

const files = (await readdir(fileURLToPath(SRC))).filter((f) => f.endsWith('.png'));
if (files.length === 0) {
  console.log('\nassets/gomdori/ 가 비어 있습니다.\n');
  process.exit(0);
}

for (const file of files) {
  const key = file.replace(/\.png$/, '');
  const from = fileURLToPath(new URL(file, SRC));

  /*
   * 곰돌이는 잘라내고 다시 앉힌다([bears.mjs](bears.mjs)). 방과 띠는 손대지 않는다 —
   * 방은 정사각 한 장을 통째로 쓰고, 띠는 3:1이라 정사각 칸이 아예 없다.
   */
  const body = NOT_A_BEAR.has(key)
    ? sharp(from).resize({
        width: SIZES[key],
        height: SIZES[key],
        fit: 'inside',
        withoutEnlargement: true,
      })
    : await stand(from, key, BODY);

  /*
   * 팔레트로 눌러 담는다. 손그림이라 쓰는 색이 많지 않아 티가 안 나고,
   * **PNG8도 투명을 그대로 지킨다** — 곰돌이 둘레가 네모로 잘리지 않는다.
   */
  const info = await body
    .png({ compressionLevel: 9, palette: true, quality: 82 })
    .toFile(fileURLToPath(new URL(file, OUT)));
  console.log(`${file.padEnd(18)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}

console.log(`\npublic/gomdori/ 에 ${files.length}개 넣었습니다.\n`);
