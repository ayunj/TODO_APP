/**
 * 올리는 그림을 **맞춰서 담는다** — 브라우저 쪽.
 *
 * 뼈대는 [design/bear_align.html](../../design/bear_align.html)에서 가져왔다.
 * 그쪽은 1800 캔버스에 `발바닥 y=1640` 같은 숫자를 박아뒀고, 여기는
 * **기본 곰을 재서 쓴다**(`readSpec`) — 맞출 자가 그 그림이니 숫자를 따로
 * 적어둘 까닭이 없다. 적어두면 기본 곰을 다시 그리는 날 둘이 어긋나고,
 * 어긋나면 그 뒤에 올리는 옷이 다 조금씩 밀린다.
 *
 * ─── 발바닥과 중심이 기준점이다 ────────────────────────────────
 *
 * 그림 놓는 자리를 **왼쪽 위가 아니라 발바닥 가운데로** 잡는다.
 * 그래야 **크기를 바꿔도 발이 안 뜬다** — 왼쪽 위를 기준으로 두면 줄이는 순간
 * 곰돌이가 공중에 뜨고, 그걸 내리느라 손잡이 둘을 번갈아 만지게 된다.
 *
 * ─── 왜 그냥 안 올리나 ─────────────────────────────────────────
 *
 * 그린 그림은 여백이 그때그때 다르다. 재보니 몸이 캔버스의 49%~94%까지
 * 벌어져 있었다. 그대로 올리면 상점에서 갈아입을 때 곰돌이가 커졌다 작아졌다 한다.
 * 그리고 원본이 1.4MB인데 상점 격자 한 칸은 103px이다 —
 * **눌러 담지 않으면 칸 하나에 1.4MB를 받는다.**
 */

/**
 * 곰돌이 한 장이 앉는 정사각 칸.
 *
 * **`scripts/bears.mjs`에도 같은 값이 있다.** 저쪽은 node에서 sharp로, 이쪽은
 * 브라우저에서 canvas로 도는 것이라 한 파일을 같이 못 쓴다.
 */
export const BODY = 760;

/** 배경은 정사각 한 장을 통째로 쓴다 — 방 그림과 같은 크기다 */
export const SCENE = 1000;

/**
 * **맞출 자** — 기본 곰이 이 칸 안에서 어디에 어떻게 서 있나.
 * `readSpec`이 `public/gomdori/front.png`를 재서 낸다.
 */
export interface Spec {
  /** 발바닥이 닿는 y */
  foot: number;
  /** 머리 끝 y — **이 위가 모자와 귀 자리다** */
  head: number;
  /** 몸 가운데 x */
  cx: number;
  /** 머리 끝에서 발바닥까지 — `크기 100%`가 이 키다 */
  bodyH: number;
}

/**
 * 맞춘 값.
 *
 * | | 무엇 | 기본 |
 * |---|---|---|
 * | `scale` | **기본 곰 키의 몇 배인가.** 1이면 기본 곰과 같은 키 | `1` |
 * | `dx` | 중심에서 가로로 몇 픽셀 | `0` |
 * | `dy` | 발바닥에서 세로로 몇 픽셀. 양수면 아래로 | `0` |
 *
 * **담을 때 그림에 박힌다.** 올린 뒤에 앱이 다시 맞출 것이 없다 —
 * 앱은 정사각 한 장을 그대로 세운다. 따로 담아두면 그림과 어긋날 자리가 하나 더 생긴다.
 */
export interface Fit {
  scale: number;
  dx: number;
  dy: number;
}

export const NO_FIT: Fit = { scale: 1, dx: 0, dy: 0 };

/** 담은 결과 — 올릴 것과 눈으로 볼 것 */
export interface Fitted {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  bytes: number;
}

/** 재어 둔 그림 — 손잡이를 밀 때마다 파일을 또 읽지 않으려고 들고 있는다 */
export interface Art {
  canvas: HTMLCanvasElement;
  /** 안 비치는 데가 어디서 어디까지인가 */
  box: { x: number; y: number; w: number; h: number };
}

/** **맞출 자를 잰다** — 기본 곰 그림에서. 같은 출처(`public/`)라 되읽을 수 있다. */
export async function readSpec(url: string): Promise<Spec> {
  const { box } = await load(url);
  return { foot: box.y + box.h, head: box.y, cx: box.x + box.w / 2, bodyH: box.h };
}

/**
 * 그림을 읽어 잰다. `white`면 **흰 배경을 지운다.**
 *
 * 앨범에서 고른 그림에는 배경 투명 PNG가 잘 없다. 흰 바탕이 붙어 있으면
 * 둘레가 캔버스 전체가 되어 곰돌이가 콩알만 하게 들어간다.
 */
export async function readArt(from: File | string, white: boolean): Promise<Art> {
  const art = await load(from);
  if (!white) return art;
  const cut = keyOutWhite(art.canvas);
  return { canvas: cut, box: bbox(cut) };
}

/**
 * 그리는 자리를 낸다 — [bear_align.html](../../design/bear_align.html)의 `anchor`와 같은 셈.
 * **화면에 미리 보일 때도 담을 때도 이 함수 하나를 쓴다** — 둘이 갈리면 맞춘 대로 안 나온다.
 */
export function at(art: Art, spec: Spec, fit: Fit) {
  const s = (spec.bodyH / art.box.h) * fit.scale;
  return {
    s,
    x: spec.cx - (art.box.x + art.box.w / 2) * s + fit.dx,
    y: spec.foot - (art.box.y + art.box.h) * s + fit.dy,
    w: art.canvas.width * s,
    h: art.canvas.height * s,
  };
}

/** 지금 어디에 어떻게 서 있나 — 화면에 적어주는 수치 */
export function readout(art: Art, spec: Spec, fit: Fit) {
  const p = at(art, spec, fit);
  const foot = Math.round((art.box.y + art.box.h) * p.s + p.y);
  const cx = Math.round((art.box.x + art.box.w / 2) * p.s + p.x);
  return {
    foot,
    top: Math.round(art.box.y * p.s + p.y),
    cx,
    w: Math.round(art.box.w * p.s),
    h: Math.round(art.box.h * p.s),
    /** 발바닥과 중심이 자에 붙었나 — 2px까지는 붙은 것으로 본다 */
    ok: Math.abs(foot - spec.foot) <= 2 && Math.abs(cx - spec.cx) <= 2,
  };
}

/**
 * 정사각 칸에 세워 담는다 — **발바닥 가운데를 자에 맞춘다.**
 *
 * **칸을 벗어나도 자르지 않는다.** 손잡이를 끝까지 밀면 발끝이나 모자가 칸 밖으로
 * 나가는데, 잘라 버리면 무엇이 잘렸는지 화면에서 안 보인다.
 */
export async function fitBear(art: Art, spec: Spec, fit: Fit): Promise<Fitted> {
  const out = canvas(BODY, BODY);
  const p = at(art, spec, fit);
  out.ctx.drawImage(art.canvas, p.x, p.y, p.w, p.h);
  return pack(out.el, BODY, BODY);
}

/**
 * **이미 담긴 그림에서 맞춘 값을 되읽는다.**
 *
 * 올려둔 것을 고칠 때 쓴다. 맞춘 값은 그림에 박혀 있고 어디에도 안 담아뒀으니
 * **그림에서 되읽는다.** 되읽은 값을 손잡이의 시작점으로 놓으면
 * **아무것도 안 밀었을 때 지금 그대로**다 — 이걸 안 하면 칸을 열기만 해도
 * 크기가 튀어서 고치러 들어간 것이 고쳐지고 만다.
 *
 * `BODY × BODY`로 담긴 것만 되읽힌다. 그 크기가 아니면 우리가 담은 것이 아니다.
 */
export function readFit(art: Art, spec: Spec): Fit | null {
  if (art.canvas.width !== BODY || art.canvas.height !== BODY || art.box.h === 0) return null;
  return {
    scale: art.box.h / spec.bodyH,
    dx: art.box.x + art.box.w / 2 - spec.cx,
    dy: art.box.y + art.box.h - spec.foot,
  };
}

/** 배경 한 장 — 자르지 않고 크기만 맞춘다 */
export async function fitScene(file: File): Promise<Fitted> {
  const art = await load(file);
  const s = Math.min(SCENE / art.canvas.width, SCENE / art.canvas.height, 1);
  const w = Math.round(art.canvas.width * s);
  const h = Math.round(art.canvas.height * s);

  const out = canvas(w, h);
  out.ctx.drawImage(art.canvas, 0, 0, w, h);
  return pack(out.el, w, h);
}

function canvas(w: number, h: number) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('캔버스를 열지 못했습니다');
  return { el, ctx };
}

async function load(from: File | string): Promise<Art> {
  const blob = typeof from === 'string' ? await (await fetch(from)).blob() : from;
  const bitmap = await createImageBitmap(blob);
  const c = canvas(bitmap.width, bitmap.height);
  c.ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { canvas: c.el, box: bbox(c.el) };
}

/**
 * 안 비치는 데가 어디서 어디까지인가.
 * **알파만 본다** — 색을 보면 흰 배경을 깐 그림에서 곰돌이를 못 찾는다.
 */
function bbox(el: HTMLCanvasElement) {
  const ctx = el.getContext('2d', { willReadFrequently: true })!;
  const { width: W, height: H } = el;
  const d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (d[(y * W + x) * 4 + 3] <= 16) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: W, h: H };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * 흰 배경을 지운다 — **가장자리에서 번져 들어가는 방식.**
 *
 * 흰 픽셀을 다 지우면 **주둥이와 눈 흰자까지 뚫린다.** 가장자리에서만 번지게 하면
 * 곰돌이에 둘러싸인 흰 부분은 못 닿아서 그대로 남는다
 * ([bear_align.html](../../design/bear_align.html)의 `keyOutWhite`와 같은 얼개).
 */
function keyOutWhite(src: HTMLCanvasElement): HTMLCanvasElement {
  const W = src.width;
  const H = src.height;
  const out = canvas(W, H);
  out.ctx.drawImage(src, 0, 0);

  const img = out.ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const n = W * H;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;

  // 크림색까지 배경으로 본다 — 흰 바탕에 옅은 그림자가 깔린 그림이 많다
  const isBG = (i: number) => {
    const p = i * 4;
    return d[p + 3] > 8 && d[p] > 226 && d[p + 1] > 222 && d[p + 2] > 214;
  };
  const push = (i: number) => {
    if (!seen[i] && isBG(i)) {
      seen[i] = 1;
      stack[sp] = i;
      sp += 1;
    }
  };

  for (let x = 0; x < W; x += 1) {
    push(x);
    push((H - 1) * W + x);
  }
  for (let y = 0; y < H; y += 1) {
    push(y * W);
    push(y * W + W - 1);
  }

  while (sp > 0) {
    sp -= 1;
    const i = stack[sp];
    d[i * 4 + 3] = 0;
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }

  out.ctx.putImageData(img, 0, 0);
  return out.el;
}

function pack(el: HTMLCanvasElement, width: number, height: number): Promise<Fitted> {
  return new Promise((ok, no) => {
    el.toBlob((blob) => {
      if (!blob) return no(new Error('그림을 담지 못했습니다'));
      ok({ blob, url: URL.createObjectURL(blob), width, height, bytes: blob.size });
    }, 'image/png');
  });
}
