/**
 * 메달 셋을 한 장에서 잘라 담는다 — `npm run medals`
 *
 * 원본(`assets/medal/me.png`)은 **검은 바탕에 빛무리를 얹어** 그린 한 장이다.
 * 그대로 쓰면 카드 위에 검은 네모가 얹히니 세 가지를 한다 —
 *
 *   1. **어디가 메달인지 찾는다.** 자리를 손으로 적어두지 않는다 —
 *      원본을 다시 그리면 그 숫자가 다 어긋난다. 밝은 데를 세로로 훑어
 *      **덩어리 셋**을 가른다
 *   2. **검은 바탕을 지운다.** 밝기로만 자르면 안 됐다 — 메달 둘레의 빛무리가
 *      검정보다 밝아서 **네모난 노란 자국**이 그대로 남는다.
 *      그래서 **가장자리에서 번져 들어간다**: 테두리에서 시작해 어두운 데를 타고
 *      번지고, 못 닿은 데가 메달이다. 빛무리는 테두리와 이어져 있어 통째로 지워지고
 *      메달 속 어두운 자리(눈금·그림자)는 못 닿아서 남는다
 *   3. **둘레를 바짝 자르고** 같은 높이로 줄인다
 *
 * 나오는 것은 `public/gomdori/medal-1.png` · `-2` · `-3`.
 * **1·2·3이 파일 이름이다** — 등수를 그대로 부르면 되니 표를 따로 안 만든다.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../assets/medal/me.png', import.meta.url));
const OUT = new URL('../public/gomdori/', import.meta.url);

/** 카드 위에 26~34dp로 얹힌다. 3배 화면까지 또렷하면 되니 이만하면 넉넉하다 */
const HEIGHT = 160;

/**
 * 번져 들어가는 자 — **이보다 어두우면 바탕**이다.
 *
 * 메달은 몸통도 리본도 이 위다(제일 어두운 은메달 리본이 190쯤).
 * 빛무리는 메달에 붙은 자리가 제일 밝은데 그래도 이 아래라 통째로 지워진다.
 */
const BG = 165;

/** 덩어리를 가를 때는 **메달 몸통만** 세도록 높게 잡는다 */
const SOLID = 200;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const maxAt = (x, y) => {
  const i = (y * W + x) * C;
  return Math.max(data[i], data[i + 1], data[i + 2]);
};

/** 세로로 훑어 밝은 칸이 있는 열 → 그 열들이 이어진 덩어리 */
const bands = [];
let run = null;
for (let x = 0; x < W; x += 1) {
  let lit = false;
  for (let y = 0; y < H && !lit; y += 1) if (maxAt(x, y) > SOLID) lit = true;
  if (lit) run = run ?? { x0: x, x1: x };
  if (lit) run.x1 = x;
  else if (run) {
    bands.push(run);
    run = null;
  }
}
if (run) bands.push(run);

/** 자잘한 얼룩은 버린다 — 메달은 원본 폭의 10%는 넘는다 */
const wide = bands.filter((b) => b.x1 - b.x0 > W * 0.1);
if (wide.length !== 3) {
  console.error(`메달 셋을 못 찾았습니다 (찾은 것: ${wide.length}). 원본을 확인하세요.`);
  process.exit(1);
}

await mkdir(fileURLToPath(OUT), { recursive: true });

/** 원본은 **2 · 1 · 3** 차례로 서 있다. 파일 이름은 등수다 */
const RANK = [2, 1, 3];

for (const [i, band] of wide.entries()) {
  let y0 = H;
  let y1 = 0;
  for (let x = band.x0; x <= band.x1; x += 1) {
    for (let y = 0; y < H; y += 1) {
      if (maxAt(x, y) <= SOLID) continue;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  /* 둘레에 한 칸 여유를 준다 — 번지기가 시작할 자리가 있어야 한다 */
  const pad = 4;
  const x0 = Math.max(0, band.x0 - pad);
  const xe = Math.min(W - 1, band.x1 + pad);
  const ys = Math.max(0, y0 - pad);
  const ye = Math.min(H - 1, y1 + pad);
  const w = xe - x0 + 1;
  const h = ye - ys + 1;

  const bright = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = ((y + ys) * W + (x + x0)) * C;
      bright[y * w + x] = Math.max(data[s], data[s + 1], data[s + 2]);
    }
  }

  /*
    **테두리에서 번져 들어간다.** 어두운 칸을 타고만 번지니 메달에 막혀 선다.
    번진 자리가 바탕이고, 못 닿은 자리가 메달이다 —
    메달 속 어두운 자리(눈금·그림자)는 둘러싸여 있어 안 지워진다.
  */
  const bg = new Uint8Array(w * h);
  const queue = [];
  const push = (x, y) => {
    const i = y * w + x;
    if (bg[i] || bright[i] >= BG) return;
    bg[i] = 1;
    queue.push(i);
  };
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const i = queue[head];
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  const cut = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = ((y + ys) * W + (x + x0)) * C;
      const i = y * w + x;
      const d = i * 4;
      cut[d] = data[s];
      cut[d + 1] = data[s + 1];
      cut[d + 2] = data[s + 2];
      cut[d + 3] = bg[i] ? 0 : 255;
    }
  }

  const rank = RANK[i];
  const file = `medal-${rank}.png`;
  const out = await sharp(cut, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ height: HEIGHT, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(fileURLToPath(new URL(file, OUT)));
  console.log(`${file.padEnd(14)} ${out.width}x${out.height}  ${(out.size / 1024).toFixed(0)}KB`);
}

console.log(`\npublic/gomdori/ 에 메달 셋을 넣었습니다.\n`);
