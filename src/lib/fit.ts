/**
 * 올리는 그림을 **맞춰서 담는다** — 브라우저 쪽.
 *
 * [scripts/bears.mjs](../../scripts/bears.mjs)의 `stand()`와 같은 일을 한다.
 * 저쪽은 원본을 두고 `npm run shop`으로 올릴 때, 이쪽은 **관리자가 화면에서
 * 파일을 고를 때.** 어느 쪽으로 들어와도 같은 자리에 같은 크기로 서야 한다.
 *
 * **왜 그냥 안 올리나** — 그린 그림은 여백이 그때그때 다르다. 재보니 몸이
 * 캔버스의 49%~94%까지 벌어져 있었다. 그대로 올리면 상점에서 갈아입을 때
 * 곰돌이가 커졌다 작아졌다 한다. 그리고 원본이 1.4MB인데 상점 격자 한 칸은
 * 103px이다 — **눌러 담지 않으면 칸 하나에 1.4MB를 받는다.**
 *
 * 하는 일 넷 —
 *
 *   1. 투명한 둘레를 **잘라낸다**
 *   2. **키를 맞춰** 줄인다 — 정사각 칸의 `TALL × scale`
 *   3. 가로 가운데, **발끝을 바닥에서 `FLOOR`**에 놓는다
 *   4. PNG로 담는다
 *
 * 배경(`room`)은 안 맞춘다 — 정사각 한 장을 통째로 쓰는 것이라 자를 여백이 없다.
 */

/**
 * 곰돌이 한 장이 앉는 정사각 칸 · 그 안에서 차지하는 키 · 발끝이 뜨는 높이.
 *
 * **`scripts/bears.mjs`에 같은 값이 있다.** 저쪽은 node에서 sharp로, 이쪽은
 * 브라우저에서 canvas로 도는 것이라 한 파일을 같이 못 쓴다 — 셋 중 하나를
 * 고치면 **두 곳을 같이 고친다.**
 */
export const BODY = 760;
export const TALL = 0.94;
export const FLOOR = 0.03;

/** 배경은 정사각 한 장을 통째로 쓴다 — 방 그림과 같은 크기다 */
export const SCENE = 1000;

/**
 * 위로 솟는 옷일수록 크게 잡는다 — 귀 끝까지가 키라서,
 * 덜 줄여야 얼굴이 다른 옷과 같은 크기로 선다.
 * 어떻게 고르는지는 [곰 맞추기](../../design/곰-맞추기.html)에 있다.
 */
export const DEFAULT_SCALE = 0.85;

/**
 * 맞춘 값 — **`scripts/bears.mjs`의 `FIT`과 같은 셋이다.**
 *
 * | | 무엇 | 기본 |
 * |---|---|---|
 * | `scale` | 키를 얼마나. 1이면 칸의 `TALL`만큼 찬다 | `DEFAULT_SCALE` |
 * | `dx` | 가로로 몇 픽셀 (760 칸 기준) | `0` |
 * | `dy` | 세로로 몇 픽셀. 양수면 아래로 | `0` |
 *
 * **담을 때 박힌다.** 손잡이로 맞춘 그대로 PNG에 구워져서, 올린 뒤에
 * 앱이 다시 맞출 것이 없다 — 앱은 정사각 한 장을 그대로 세운다.
 */
export interface Fit {
  scale: number;
  dx: number;
  dy: number;
}

export const NO_FIT: Fit = { scale: DEFAULT_SCALE, dx: 0, dy: 0 };

/** 담은 결과 — 올릴 것과 눈으로 볼 것 */
export interface Fitted {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * 곰돌이 한 장을 정사각 칸에 세워 담는다.
 *
 * **칸을 벗어나도 자르지 않는다.** 손잡이를 끝까지 밀면 발끝이나 모자가 칸 밖으로
 * 나가는데, 그때 잘라 버리면 무엇이 잘렸는지 화면에서 안 보인다 —
 * 캔버스가 알아서 비워두니 그대로 두고 **눈금으로 보여준다.**
 */
export async function fitBear(file: File, fit: Fit = NO_FIT): Promise<Fitted> {
  const src = await draw(file);
  const box = trim(src);

  const tall = Math.round(BODY * TALL * fit.scale);
  const wide = Math.round((box.w * tall) / box.h);

  const out = canvas(BODY, BODY);
  out.ctx.drawImage(
    src.canvas,
    box.x,
    box.y,
    box.w,
    box.h,
    Math.round((BODY - wide) / 2 + fit.dx),
    Math.round(BODY - BODY * FLOOR - tall + fit.dy),
    wide,
    tall,
  );
  return pack(out.el, BODY, BODY);
}

/**
 * **이미 담긴 그림에서 맞춘 값을 되읽는다.**
 *
 * 올려둔 것을 고칠 때 쓴다. 맞춘 값은 그림에 박혀 있고 어디에도 안 담아뒀으니
 * (담아두면 그림과 어긋날 자리가 하나 더 생긴다) **그림에서 되읽는다.**
 *
 * 되읽은 값을 손잡이의 시작점으로 놓으면 **아무것도 안 밀었을 때 지금 그대로**다.
 * 이걸 안 하면 칸을 열기만 해도 크기가 기본값으로 튀어서, 고치러 들어간 것이
 * 고쳐지고 만다.
 *
 * `BODY × BODY`로 담긴 것만 되읽힌다. 그 크기가 아니면 우리가 담은 것이 아니라
 * (앨범에서 막 고른 것이거나 손으로 올린 것) 되읽을 값이 없다.
 */
export async function readFit(file: File): Promise<Fit | null> {
  const src = await draw(file);
  if (src.canvas.width !== BODY || src.canvas.height !== BODY) return null;

  const box = trim(src);
  if (box.h === 0) return null;

  return {
    scale: box.h / (BODY * TALL),
    dx: box.x - (BODY - box.w) / 2,
    dy: box.y - (BODY - BODY * FLOOR - box.h),
  };
}

/** 배경 한 장 — 자르지 않고 크기만 맞춘다 */
export async function fitScene(file: File): Promise<Fitted> {
  const src = await draw(file);
  const s = Math.min(SCENE / src.canvas.width, SCENE / src.canvas.height, 1);
  const w = Math.round(src.canvas.width * s);
  const h = Math.round(src.canvas.height * s);

  const out = canvas(w, h);
  out.ctx.drawImage(src.canvas, 0, 0, w, h);
  return pack(out.el, w, h);
}

function canvas(w: number, h: number) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('캔버스를 열지 못했습니다');
  return { el, ctx };
}

async function draw(file: File) {
  const bitmap = await createImageBitmap(file);
  const c = canvas(bitmap.width, bitmap.height);
  c.ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { canvas: c.el, data: c.ctx.getImageData(0, 0, c.el.width, c.el.height) };
}

/**
 * 안 비치는 데가 어디서 어디까지인가.
 * **알파만 본다** — 색을 보면 흰 배경을 깐 그림에서 곰돌이를 못 찾는다.
 */
function trim({ data }: { data: ImageData }) {
  const { width: W, height: H } = data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data.data[(y * W + x) * 4 + 3] <= 1) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  // 통째로 비치면 자를 데가 없다 — 원본 그대로 쓴다
  if (x1 < 0) return { x: 0, y: 0, w: W, h: H };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function pack(el: HTMLCanvasElement, width: number, height: number): Promise<Fitted> {
  return new Promise((ok, no) => {
    el.toBlob((blob) => {
      if (!blob) return no(new Error('그림을 담지 못했습니다'));
      ok({ blob, url: URL.createObjectURL(blob), width, height, bytes: blob.size });
    }, 'image/png');
  });
}
