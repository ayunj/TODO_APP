/**
 * 곰돌이를 **같은 크기 같은 자리에** 앉힌다.
 *
 * [그릴 것](../design/g/그릴-것.md)에서 제일 중요한 두 줄이 `캔버스 안에서 늘 같은
 * 크기, 같은 자리에`인데, 받아오는 그림은 그때그때 다르다. 재보니 몸이 캔버스의
 * 49%~94%까지 벌어져 있었다.
 *
 * 그대로 두면 상점에서 갈아입을 때마다 곰돌이가 커졌다 작아졌다 한다.
 * `Stage`가 폭으로 크기를 잡아서, **여백이 넉넉한 그림일수록 곰이 작게 뜬다.**
 *
 * 그래서 여기서 한 번 맞춘다 —
 *
 *   1. 투명한 둘레를 **잘라내고**(`trim`) 그림마다 다른 여백을 없앤다
 *   2. **키를 맞춰** 줄인다 — 정사각 칸의 `TALL`만큼
 *   3. 가로 가운데, **발끝을 바닥에서 `FLOOR`**에 놓는다
 *
 * **이것만으로는 안 맞는다.** 둘레로만 맞추면 토끼 귀나 마법사 모자가 위로 솟은
 * 만큼 **몸이 쪼그라든다** — 귀 끝까지가 같은 키라 정작 얼굴은 작아진다.
 * 눈으로 봐야 아는 값이라 아래 `FIT`에 한 줄씩 손으로 적는다.
 *
 * **`npm run canvas`가 그 값을 고르는 자리를 만들어 준다.**
 */
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** 곰돌이 한 장이 앉는 정사각 칸 */
export const BODY = 760;
/** 잘라낸 그림이 그 칸에서 차지하는 키 — 제일 큰 옷(`scale: 1`)이 이만큼 찬다 */
export const TALL = 0.94;
/** 발끝이 바닥에서 얼마나 떠 있나 */
export const FLOOR = 0.03;

/**
 * 앱에서 이 정사각이 칸의 몇 %로 뜨나 — **[곰 맞추기](../design/곰-맞추기.html)가 쓴다.**
 *
 * 진짜 값은 앱에 있다(`src/lib/stage.ts`의 `BEAR_W`·`BEAR_FLOOR`).
 * 여기 적힌 것은 **미리 보여주려고 베껴 온 것**이라, 저쪽을 고치면 여기도 고친다.
 *
 * 홈과 상점이 **같은 값이어야 한다** — 걸쳐본 대로 홈에 서야 한다.
 */
export const SLOT = { stage: 90, home: 90 };
/** 발끝이 칸 바닥에서 몇 % 떠 있나 — `stage.ts`의 `BEAR_FLOOR` */
export const SLOT_FLOOR = 9;

/**
 * 옷마다 손으로 맞춘 값 — **[곰 맞추기](../design/곰-맞추기.html)에서 고른다.**
 *
 * | | 무엇 | 기본 |
 * |---|---|---|
 * | `scale` | 키를 얼마나 더 줄일까. 1보다 작으면 작아진다 | `1` |
 * | `dx` | 가로로 몇 픽셀 밀까 (760 칸 기준) | `0` |
 * | `dy` | 세로로 몇 픽셀 밀까. 양수면 아래로 | `0` |
 *
 * **위로 솟는 옷일수록 `scale`이 크다.** 토끼 귀·마법사 모자·용 뿔이 그렇다 —
 * 귀 끝까지가 키라서, 덜 줄여야 얼굴이 다른 옷과 같은 크기로 선다.
 * 여기 없는 열쇠는 그냥 둘레에 맞춘다(`scale: 1`).
 *
 * ─── 아래 값이 어디서 나왔나 ──────────────────────────────────
 *
 * **눈 사이를 재서 골랐다.** 얼굴은 옷이 달라져도 똑같이 그리기로 했으니
 * (`design/g/그릴-것.md`), **두 눈 사이가 곧 얼굴 크기**다. 잘라낸 키로 나누면
 * 그 옷이 얼마나 위로 솟았는지가 한 숫자로 나온다 —
 *
 * | 옷 | 눈 사이 ÷ 키 | 왜 |
 * |---|---|---|
 * | 기본 곰돌이 | 0.216 | 머리 위에 아무것도 없다 |
 * | 공주 곰 | 0.212 | 티아라가 낮다 |
 * | 곰드래곤 | 0.196 | 뿔 |
 * | 마법사 곰 | 0.179 | 고깔 |
 * | 곰토끼 | 0.153 | **귀가 제일 길다** |
 *
 * 이 숫자에 **딱 반비례로 맞춘다** — 얼굴이 정확히 같아진다.
 *
 * 한때 일곱 걸음만 갔었다(0.7). 딱 맞추면 곰토끼 귀가 칸을 뚫고 나가서다.
 * 지금은 기본 곰을 0.67로 줄여 **머리 위 여백을 258px 벌려뒀으니**
 * 제일 큰 곰토끼(1.42배)까지 들어간다 — 걸음을 줄일 까닭이 없어졌다.
 *
 * 나머지 셋은 **눈으로 보고 고친다** — 이 셈은 얼굴 크기만 보지
 * 몸이 옆으로 얼마나 퍼졌는지는 안 본다.
 */
export const FIT = {
  /*
   * 기본 곰이 **자다.** 여기 적힌 크기가 곧 `크기 100%`이고,
   * 남는 머리 위 여백이 **다른 옷이 커질 수 있는 끝**이 된다.
   *
   * 0.79였다. 그러면 여백이 174px뿐이라 **131%에서 잘렸다** —
   * 곰토끼는 귀가 길어 얼굴을 맞추려면 142%가 필요한데 거기서 모자가 날아갔다.
   * 0.67로 줄이면 여백이 257px이 되어 **154%까지 된다.**
   *
   * 줄인 만큼 앱의 칸을 키웠다(`src/lib/stage.ts`의 85%) — 그래서
   * **화면에 뜨는 기본 곰의 크기는 그대로다.** 자를 작게 그린 것이 아니라
   * 자 위에 빈자리를 더 둔 것이다.
   */
  front: { scale: 0.67 },
  princess: { scale: 0.68 },
  dragon: { scale: 0.74 },
  wizard: { scale: 0.81 },
  rabbit: { scale: 0.95 },
};

/** 곰돌이가 아닌 것 — 자리를 안 맞춘다. 방은 통째로 한 장이고 띠는 정사각이 아니다. */
export const NOT_A_BEAR = new Set(['room', 'store-banner']);

/**
 * 잘라낸 자리와 크기. **[곰 맞추기](../design/곰-맞추기.html)가 이걸 그대로 쓴다** —
 * 브라우저는 투명한 둘레를 잴 수가 없어서(`file://`에서 캔버스를 못 읽는다)
 * 여기서 재어 넘겨준다.
 */
export async function boxOf(file) {
  const src = sharp(file);
  const { width, height } = await src.metadata();
  const cut = await src.trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  return {
    /** 원본 크기 */
    w: width,
    h: height,
    /** 내용이 시작하는 자리 — `trimOffset`은 음수로 온다 */
    x: -cut.info.trimOffsetLeft,
    y: -cut.info.trimOffsetTop,
    /** 내용 크기 */
    cw: cut.info.width,
    ch: cut.info.height,
    data: cut.data,
  };
}

/**
 * 잘라내고 키를 맞춰 정사각 칸 바닥에 세운다.
 *
 * **[곰 맞추기](../design/곰-맞추기.html)의 셈과 한 글자도 안 달라야 한다** —
 * 거기서 맞춘 대로 여기서 나와야 맞추는 뜻이 있다.
 */
export async function stand(file, key, size = BODY) {
  const box = await boxOf(file);
  const fit = FIT[key] ?? {};
  const { scale = 1, dx = 0, dy = 0 } = fit;

  const tall = Math.round(size * TALL * scale);
  const art = await sharp(box.data)
    .resize({ height: tall, fit: 'inside' })
    .toBuffer({ resolveWithObject: true });

  const at = { left: place(size, art.info.width, dx), top: floor(size, art.info.height, dy) };
  // 칸 밖으로 밀려나면 sharp가 던진다. 맞추다 삐끗한 값을 여기서 잡아준다.
  if (at.left < 0 || at.top < 0 || at.left + art.info.width > size || at.top + art.info.height > size) {
    throw new Error(`${key}: 맞춘 값이 칸을 벗어납니다 — scale ${scale} · dx ${dx} · dy ${dy}`);
  }

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: art.data, ...at }]);
}

/** 가로 가운데에서 `dx`만큼 */
export const place = (size, w, dx) => Math.round((size - w) / 2 + dx);
/** 발끝을 바닥에서 `FLOOR`만큼 띄우고 `dy`만큼 */
export const floor = (size, h, dy) => Math.round(size - size * FLOOR - h + dy);

/**
 * 그림 원본이 있는 데 둘.
 *
 * | 어디 | 무엇 | 어디로 |
 * |---|---|---|
 * | `assets/gomdori/` | **앱과 같이 나가는 것** — 기본 곰돌이·기본 룸·상점 띠 | `public/gomdori/` |
 * | `assets/shop/**` | **나중에 올리는 것** — 파는 옷 | Storage `shop` 통 |
 *
 * 둘을 가르는 것은 **오프라인에서도 서야 하느냐**다. 기본 곰돌이와 기본 룸은
 * 로그인 전에도 서버를 못 읽어도 서 있어야 해서 앱이 들고 나간다
 * ([assets/shop/README.md](../assets/shop/README.md)).
 */
export async function bearSources() {
  const app = new URL('../assets/gomdori/', import.meta.url);
  const shop = new URL('../assets/shop/', import.meta.url);

  const out = [];
  for (const file of await pngs(app)) {
    const key = file.replace(/\.png$/, '');
    if (NOT_A_BEAR.has(key)) continue;
    out.push({ key, file: fileURLToPath(new URL(file, app)), from: `assets/gomdori/${file}` });
  }
  // `<대분류>/<중분류>/gomdori/` 밑에 있는 것만 곰이다 — 배경과 소품은 안 맞춘다
  for (const dir of await walk(shop, 'gomdori')) {
    for (const file of await pngs(new URL(`${dir}/`, shop))) {
      const key = file.replace(/\.png$/, '');
      out.push({
        key,
        file: fileURLToPath(new URL(`${dir}/${file}`, shop)),
        from: `assets/shop/${dir}/${file}`,
      });
    }
  }
  return out;
}

async function pngs(dir) {
  return (await readdir(fileURLToPath(dir))).filter((f) => f.endsWith('.png'));
}

/** `assets/shop` 밑에서 이름이 `leaf`인 폴더를 다 찾는다 */
async function walk(root, leaf, at = '') {
  const here = new URL(at ? `${at}/` : '', root);
  const found = [];
  for (const e of await readdir(fileURLToPath(here), { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const next = at ? `${at}/${e.name}` : e.name;
    if (e.name === leaf) found.push(next);
    else found.push(...(await walk(root, leaf, next)));
  }
  return found;
}
