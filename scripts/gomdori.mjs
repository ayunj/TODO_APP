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

/** 곰돌이가 아닌 것 — 자리를 안 맞춘다. 방은 통째로 한 장이고 띠는 정사각이 아니다. */
const NOT_A_BEAR = new Set(['room', 'store-banner']);

/**
 * 곰돌이를 **같은 크기 같은 자리에** 앉힌다.
 *
 * [그릴 것](../design/g/그릴-것.md)에서 제일 중요한 두 줄이 `캔버스 안에서 늘 같은
 * 크기, 같은 자리에`인데, 받아오는 그림은 그때그때 여백이 다르다 —
 * 재보니 몸이 canvas의 49%~94%까지 벌어져 있었다.
 *
 * 그대로 두면 상점에서 갈아입을 때마다 곰돌이가 커졌다 작아졌다 한다.
 * `Stage`가 `max-w-46%`로 폭을 잡아서, **여백이 넉넉한 그림일수록 곰이 작게 뜬다** —
 * 곰토끼(여백 51%)가 곰드래곤(여백 6%) 옆에서 어린애만 해진다.
 *
 * 그래서 여기서 한 번 맞춘다 —
 *
 *   1. 투명한 둘레를 **잘라내고**(`trim`) 그림마다 다른 여백을 없앤다
 *   2. **키를 맞춰** 줄인다 — 정사각 칸의 `TALL`만큼
 *   3. 가로 가운데, **발끝을 바닥에서 `FLOOR`**에 놓는다
 *
 * **키로 맞추고 폭으로 안 맞추는 까닭**은 공주의 베일과 마법사의 망토가 옆으로
 * 퍼져서다. 폭을 맞추면 그 둘만 몸이 쪼그라든다. 모자와 뿔이 위로 솟는 만큼
 * 몸이 조금 작아지는 건 눈에 안 거슬린다 — **발끝이 한 줄에 서는 것**이 훨씬 크다.
 */
const TALL = 0.94;
const FLOOR = 0.03;

await mkdir(OUT, { recursive: true });

const files = (await readdir(fileURLToPath(SRC))).filter((f) => f.endsWith('.png'));
if (files.length === 0) {
  console.log('\nassets/gomdori/ 가 비어 있습니다.\n');
  process.exit(0);
}

for (const file of files) {
  const key = file.replace(/\.png$/, '');
  const size = SIZES[key] ?? BODY;
  const src = sharp(fileURLToPath(new URL(file, SRC)));

  /*
   * 곰돌이는 잘라내고 다시 앉힌다. 방과 띠는 손대지 않는다 —
   * 방은 정사각 한 장을 통째로 쓰고, 띠는 3:1이라 정사각 칸이 아예 없다.
   */
  const body = NOT_A_BEAR.has(key)
    ? src.resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
    : await stand(src, size);

  /*
   * 팔레트로 눌러 담는다. 손그림이라 쓰는 색이 많지 않아 티가 안 나고,
   * **PNG8도 투명을 그대로 지킨다** — 곰돌이 둘레가 네모로 잘리지 않는다.
   */
  const info = await body
    .png({ compressionLevel: 9, palette: true, quality: 82 })
    .toFile(fileURLToPath(new URL(file, OUT)));
  console.log(`${file.padEnd(18)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}

/** 잘라내고 키를 맞춰 정사각 칸 바닥에 세운다 */
async function stand(src, size) {
  const cut = await src.trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const tall = Math.round(size * TALL);
  const art = await sharp(cut.data)
    .resize({ height: tall, fit: 'inside', withoutEnlargement: false })
    .toBuffer({ resolveWithObject: true });

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([
    {
      input: art.data,
      left: Math.round((size - art.info.width) / 2),
      top: size - Math.round(size * FLOOR) - art.info.height,
    },
  ]);
}

console.log(`\npublic/gomdori/ 에 ${files.length}개 넣었습니다.\n`);
