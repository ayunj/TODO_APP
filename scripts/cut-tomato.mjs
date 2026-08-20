/**
 * 토마토 시트 자르기 — `npm run tomato [원본경로]`
 *
 * 손그림 한 장에 컷 열 개가 들어 있다. 좌표를 손으로 박아두면 원본을 다시 뽑을 때마다
 * 어긋나므로, 투명한 자리를 읽어서 컷 경계를 스스로 찾는다.
 *
 *   1) 가운데쯤에서 가장 넓은 빈 가로줄을 찾아 위아래 두 줄로 가른다
 *   2) 줄마다 빈 세로줄을 찾아 컷으로 가른다
 *   3) 컷마다 다시 가로로 갈라, **가장 큰 덩어리(=토마토)까지만** 남긴다
 *
 * 3번이 핵심이다. 토마토 아래 붙은 라벨("할 일 없으면")은 앱에서는 방해가 되니 버리고,
 * 위에 뜬 zzz·땀방울·말풍선은 그림의 일부라 남긴다. 위는 남기고 아래는 버리는 기준이
 * "가장 큰 덩어리"다 — 라벨은 늘 토마토보다 작고 늘 아래에 있다.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2] ?? fileURLToPath(new URL('../assets/tomato-sheet.png', import.meta.url));
const OUT = new URL('../public/tomato/', import.meta.url);

/** 앱에서 부를 이름. 원본의 왼쪽→오른쪽, 위줄→아래줄 순서와 같아야 한다. */
const NAMES = [
  ['empty', 'busy', 'one', 'all'],
  ['heart', 'peek', 'rest', 'run', 'cycle', 'cheer'],
];

const ALPHA = 24; // 이보다 옅으면 종이로 친다 (손그림이라 가장자리가 부옇다)
const INK = 2; // 한 줄에 이만큼은 찍혀야 그림으로 친다 — 먼지 한 점에 안 갈라지게
const GAP = 12; // 이만큼 이어서 비어야 컷 사이 골로 친다
const PAD = 8; // 자른 뒤 사방에 남기는 여백
const MAX = 480; // 내보내는 긴 변 (레티나에서도 버틴다. 원본보다 크게는 안 늘린다)

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const at = (x, y) => data[(y * W + x) * C + C - 1] > ALPHA;

/** [from,to) 안에서 켜진 줄이 이어지는 구간들 */
const bands = (on, from, to) => {
  const out = [];
  let start = -1;
  let blank = 0;
  for (let i = from; i < to; i++) {
    if (on(i)) {
      if (start < 0) start = i;
      blank = 0;
    } else if (start >= 0 && ++blank > GAP) {
      out.push([start, i - blank]);
      start = -1;
    }
  }
  if (start >= 0) out.push([start, to - 1]);
  return out;
};

const rowOn = (x0, x1) => (y) => {
  let n = 0;
  for (let x = x0; x <= x1; x++) if (at(x, y) && ++n >= INK) return true;
  return false;
};
const colOn = (y0, y1) => (x) => {
  let n = 0;
  for (let y = y0; y <= y1; y++) if (at(x, y) && ++n >= INK) return true;
  return false;
};
const ink = (x0, x1, y0, y1) => {
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(x, y)) n++;
  return n;
};

// 1) 가운데 3분의 1에서 가장 넓은 빈 가로줄 — 여기가 위줄과 아래줄의 경계다
const full = rowOn(0, W - 1);
let split = -1;
let widest = 0;
for (let y = Math.floor(H * 0.33), run = 0; y < Math.floor(H * 0.67); y++) {
  run = full(y) ? 0 : run + 1;
  if (run > widest) [widest, split] = [run, y - Math.floor(run / 2)];
}
if (split < 0) throw new Error('위아래 두 줄로 가를 빈 자리를 못 찾았습니다. 원본이 시트가 맞습니까?');

const rows = [
  [0, split],
  [split + 1, H - 1],
];

await mkdir(OUT, { recursive: true });
const cuts = [];

for (const [r, [y0, y1]] of rows.entries()) {
  const cols = bands(colOn(y0, y1), 0, W);
  if (cols.length !== NAMES[r].length) {
    console.error(`\n${r + 1}번째 줄에서 컷 ${cols.length}개를 찾았는데 이름은 ${NAMES[r].length}개입니다.`);
    console.error('찾은 자리:', cols.map(([a, b]) => `${a}~${b}`).join('  '));
    console.error('GAP 값을 올리거나(붙었을 때) 내려서(갈라졌을 때) 다시 돌려보세요.\n');
    process.exit(1);
  }

  for (const [c, [x0, x1]] of cols.entries()) {
    // 3) 컷 안을 다시 가로로 갈라 가장 큰 덩어리를 찾고, 거기까지만 남긴다
    const parts = bands(rowOn(x0, x1), y0, y1 + 1);
    let big = 0;
    for (let i = 1; i < parts.length; i++) {
      if (ink(x0, x1, ...parts[i]) > ink(x0, x1, ...parts[big])) big = i;
    }
    const top = parts[0][0];
    const bottom = parts[big][1];

    const left = Math.max(0, x0 - PAD);
    const right = Math.min(W - 1, x1 + PAD);
    const box = {
      left,
      top: Math.max(0, top - PAD),
      width: right - left + 1,
      height: Math.min(H - 1, bottom + PAD) - Math.max(0, top - PAD) + 1,
    };

    const name = NAMES[r][c];
    const out = fileURLToPath(new URL(`${name}.png`, OUT));
    await sharp(SRC)
      .extract(box)
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
      // 폰에 설치해 쓰는 앱이라 무게가 곧 값이다. 색을 팔레트로 줄이면 열 컷이 1.5MB→260KB인데,
      // 크레용 질감이 눌리는지 확대해 견줘보니 차이가 안 보인다. 실제로는 이보다 훨씬 작게 뜬다.
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toFile(out);

    const dropped = parts.length - big - 1;
    cuts.push(`${name.padEnd(6)} ${String(box.width).padStart(4)}x${String(box.height).padStart(4)}` +
      (dropped > 0 ? `   (아래 덩어리 ${dropped}개 버림 — 라벨)` : ''));
  }
}

console.log(`\n원본 ${W}x${H} · 가른 자리 y=${split}`);
console.log(cuts.join('\n'));
console.log(`\npublic/tomato/ 에 ${cuts.length}개 넣었습니다.\n`);
