/**
 * 곰 맞추기 — `npm run canvas`
 *
 * **곰돌이 크기를 눈으로 맞추는 자리를 만든다.** 돌리면
 * [design/곰-맞추기.html](../design/곰-맞추기.html)이 나오고, 브라우저로 열어
 * 손잡이를 밀면서 맞춘 뒤 값을 [scripts/bears.mjs](bears.mjs)의 `FIT`에 옮겨 적는다.
 *
 * ─── 왜 만들어 쓰나 ────────────────────────────────────────────
 *
 * 곰돌이를 맞추려면 **투명한 둘레가 어디서 끝나는지**를 알아야 하는데,
 * 브라우저는 그걸 못 잰다 — `file://`로 연 페이지는 캔버스에 그린 그림을
 * 되읽을 수 없다(tainted canvas). 서버를 하나 띄우면 되지만,
 * 그림 맞추자고 서버를 띄우고 끄는 건 성가시다.
 *
 * 그래서 **여기서 재어 페이지 안에 박아 넣는다.** 나온 파일 하나만 열면
 * 아무것도 안 띄우고 바로 맞출 수 있다.
 *
 * 페이지의 셈은 [bears.mjs](bears.mjs)의 `stand()`와 **한 글자도 안 다르다.**
 * 다르면 맞춘 대로 안 나오고, 그러면 맞추는 뜻이 없다.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative, dirname } from 'node:path';
import { BODY, FIT, FLOOR, SLOT, TALL, bearSources, boxOf } from './bears.mjs';

const OUT = new URL('../design/곰-맞추기.html', import.meta.url);
const ROOM = new URL('../public/gomdori/room.png', import.meta.url);

const bears = [];
for (const b of await bearSources()) {
  const box = await boxOf(b.file);
  bears.push({
    key: b.key,
    from: b.from,
    // 페이지에서 `<img src>`로 쓸 자리 — design/ 에서 본 상대 경로
    src: rel(b.file),
    w: box.w,
    h: box.h,
    x: box.x,
    y: box.y,
    cw: box.cw,
    ch: box.ch,
    fit: FIT[b.key] ?? {},
  });
  console.log(`${b.key.padEnd(10)} ${box.cw}x${box.ch}  ←  ${b.from}`);
}

bears.sort((a, b) => (a.key === 'front' ? -1 : b.key === 'front' ? 1 : a.key.localeCompare(b.key)));

await writeFile(fileURLToPath(OUT), page(bears), 'utf8');
console.log(`\ndesign/곰-맞추기.html — 곰 ${bears.length}마리. 브라우저로 열면 됩니다.\n`);

function rel(file) {
  return relative(dirname(fileURLToPath(OUT)), file).split('\\').join('/');
}

function page(list) {
  const data = JSON.stringify({ bears: list, BODY, TALL, FLOOR, SLOT, room: rel(fileURLToPath(ROOM)) });
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>곰 맞추기</title>
<!--
  **손으로 고친 것이 아니다.** \`npm run canvas\`가 만든다 —
  고칠 일이 있으면 scripts/canvas.mjs를 고친다.
-->
<style>
  :root {
    --bg: #f6f1ea; --card: #fff; --ink: #4a3f36; --ink2: #7d6f63; --ink3: #a89a8c;
    --line: #e6ddd2; --sunk: #f2ece4; --accent: #e08a5d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px; background: var(--bg); color: var(--ink);
    font: 14px/1.6 -apple-system, "Malgun Gothic", sans-serif;
  }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .sub { margin: 0 0 22px; color: var(--ink2); font-size: 13px; }
  .wrap { display: flex; flex-wrap: wrap; gap: 22px; align-items: flex-start; }
  .card { background: var(--card); border: 1.4px solid var(--line); border-radius: 16px; padding: 16px; }

  /* 상점 걸쳐보는 칸 그대로 — 360 폰에서 328×328 */
  .stage { position: relative; width: 328px; height: 328px; border-radius: 14px; overflow: hidden; background: var(--sunk); }
  .stage .room { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: bottom; }
  /* 곰 한 마리가 앉는 네모 — Stage의 max-w 46%, mb 6% */
  .slot { position: absolute; left: 50%; bottom: 6%; aspect-ratio: 1; transform: translateX(-50%); }
  .slot img { position: absolute; image-rendering: auto; }

  .guide { position: absolute; inset: 0; pointer-events: none; }
  .guide i { position: absolute; display: block; background: #e0555588; }
  .guide .h { left: 0; right: 0; height: 1px; }
  .guide .v { top: 0; bottom: 0; width: 1px; }
  .guide b { position: absolute; right: 4px; font: 10px/1 monospace; color: #e05555; background: #fff8; padding: 2px 3px; }

  .rows { width: 420px; }
  .row { display: grid; grid-template-columns: 84px 1fr 52px; gap: 8px; align-items: center; padding: 5px 0; }
  .row label { color: var(--ink2); font-size: 12px; }
  .row output { font: 12px/1 monospace; color: var(--ink); text-align: right; }
  input[type=range] { width: 100%; accent-color: var(--accent); }

  .who { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .who button {
    border: 1.4px solid var(--line); background: var(--card); color: var(--ink2);
    border-radius: 999px; padding: 7px 14px; font-size: 12.5px; cursor: pointer;
  }
  .who button[aria-pressed=true] { background: var(--accent); border-color: var(--accent); color: #fff; }

  .toggles { display: flex; gap: 14px; margin: 14px 0 4px; font-size: 12.5px; color: var(--ink2); }
  .toggles label { display: flex; gap: 5px; align-items: center; cursor: pointer; }

  pre {
    margin: 12px 0 0; padding: 12px 14px; background: var(--sunk); border-radius: 12px;
    font: 12px/1.7 monospace; white-space: pre; overflow-x: auto;
  }
  .copy {
    margin-top: 10px; border: 0; background: var(--accent); color: #fff;
    border-radius: 10px; padding: 9px 16px; font-size: 13px; cursor: pointer;
  }
  .note { margin: 18px 0 0; max-width: 780px; color: var(--ink2); font-size: 12.5px; }
  .note code { background: var(--sunk); padding: 1px 5px; border-radius: 5px; }
  .strip { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  .strip .stage { width: 164px; height: 164px; }
  .strip figcaption { margin-top: 5px; text-align: center; font-size: 11.5px; color: var(--ink3); }
</style>
</head>
<body>
<h1>곰 맞추기</h1>
<p class="sub">
  상점에서 갈아입을 때 <b>곰돌이가 커졌다 작아졌다 하지 않게</b> 맞추는 자리.
  맞춘 값을 <code>scripts/bears.mjs</code>의 <code>FIT</code>에 옮겨 적고 <code>npm run gomdori</code>·<code>npm run shop</code>을 돌린다.
</p>

<div class="wrap">
  <div class="card">
    <div class="stage" id="stage">
      <img class="room" id="room" alt="" />
      <div class="guide" id="guide" hidden></div>
    </div>
    <div class="toggles">
      <label><input type="checkbox" id="all" /> 다 겹쳐 보기</label>
      <label><input type="checkbox" id="lines" checked /> 눈금</label>
      <label><input type="checkbox" id="bg" checked /> 방</label>
      <label>어디 <select id="where">
        <option value="stage">상점</option>
        <option value="home">홈</option>
      </select></label>
    </div>
  </div>

  <div class="rows card">
    <div class="who" id="who"></div>
    <div class="row">
      <label for="scale">크기</label>
      <input type="range" id="scale" min="0.5" max="1.15" step="0.01" />
      <output id="scaleOut"></output>
    </div>
    <div class="row">
      <label for="dx">가로</label>
      <input type="range" id="dx" min="-60" max="60" step="1" />
      <output id="dxOut"></output>
    </div>
    <div class="row">
      <label for="dy">세로</label>
      <input type="range" id="dy" min="-60" max="60" step="1" />
      <output id="dyOut"></output>
    </div>
    <pre id="out"></pre>
    <button class="copy" id="copy">FIT 복사</button>
  </div>
</div>

<div class="strip" id="strip"></div>

<p class="note">
  <b>눈금이 뜻하는 것</b> — 가로줄 둘은 <code>TALL</code>(잘라낸 그림의 키)과 바닥선이고,
  세로줄은 한가운데다. 얼굴이 다 같은 높이에 오면 맞은 것이다.
  <b>발끝보다 얼굴을 보고 맞춘다</b> — 토끼 귀나 마법사 모자가 위로 솟은 만큼
  <code>크기</code>를 줄여야 얼굴이 같은 크기로 선다.
</p>

<script>
const D = ${data};
const stage = document.getElementById('stage');
/* 곰이 칸의 몇 %로 뜨나 — 상점 걸쳐보는 칸과 홈 칸이 다르다 */
let W = D.SLOT.stage;
const guide = document.getElementById('guide');
document.getElementById('room').src = D.room;

/* stand()와 같은 셈. 760 칸 안의 자리를 낸 다음 칸 크기로 나눠 %로 쓴다. */
function lay(b) {
  const f = b.fit || {};
  const scale = f.scale ?? 1, dx = f.dx ?? 0, dy = f.dy ?? 0;
  const tall = Math.round(D.BODY * D.TALL * scale);
  // 잘라낸 것을 키에 맞춰 줄인다 — 폭은 따라온다
  const s = tall / b.ch;
  const cw = Math.round(b.cw * s);
  const left = Math.round((D.BODY - cw) / 2 + dx);
  const top = Math.round(D.BODY - D.BODY * D.FLOOR - tall + dy);
  // 원본을 통째로 얹되, 잘라낸 자리가 위에서 낸 데로 가게 민다
  return {
    w: b.w * s, h: b.h * s,
    left: left - b.x * s,
    top: top - b.y * s,
  };
}

function slot(b, dim) {
  const p = lay(b);
  const el = document.createElement('div');
  el.className = 'slot';
  el.style.width = W + '%';
  const img = document.createElement('img');
  img.src = b.src;
  img.alt = '';
  img.style.width = (p.w / D.BODY * 100) + '%';
  img.style.height = (p.h / D.BODY * 100) + '%';
  img.style.left = (p.left / D.BODY * 100) + '%';
  img.style.top = (p.top / D.BODY * 100) + '%';
  if (dim) img.style.opacity = dim;
  el.appendChild(img);
  return el;
}

let who = D.bears[0].key;
const of = (k) => D.bears.find((b) => b.key === k);

function draw() {
  stage.querySelectorAll('.slot').forEach((n) => n.remove());
  const all = document.getElementById('all').checked;
  if (all) for (const b of D.bears) stage.appendChild(slot(b, b.key === who ? 1 : 0.35));
  else stage.appendChild(slot(of(who)));

  guide.hidden = !document.getElementById('lines').checked;
  rule();
  document.getElementById('room').style.visibility =
    document.getElementById('bg').checked ? '' : 'hidden';

  // 아래 줄줄이 — 다 같이 보면서 맞춘다
  const strip = document.getElementById('strip');
  strip.innerHTML = '';
  for (const b of D.bears) {
    const fig = document.createElement('figure');
    fig.style.margin = '0';
    const st = document.createElement('div');
    st.className = 'stage';
    const rm = document.createElement('img');
    rm.className = 'room'; rm.src = D.room; rm.alt = '';
    if (!document.getElementById('bg').checked) rm.style.visibility = 'hidden';
    st.appendChild(rm);
    st.appendChild(slot(b));
    const cap = document.createElement('figcaption');
    cap.textContent = b.key;
    fig.appendChild(st); fig.appendChild(cap);
    strip.appendChild(fig);
  }
  show();
}

function show() {
  const f = of(who).fit;
  const set = (id, v) => {
    document.getElementById(id).value = v;
    document.getElementById(id + 'Out').textContent = v;
  };
  set('scale', f.scale ?? 1);
  set('dx', f.dx ?? 0);
  set('dy', f.dy ?? 0);
  document.getElementById('out').textContent = text();
}

/* bears.mjs에 그대로 붙여 넣을 수 있게 — 기본값인 칸은 안 적는다 */
function text() {
  const rows = D.bears
    .map((b) => {
      const f = b.fit, parts = [];
      if ((f.scale ?? 1) !== 1) parts.push('scale: ' + (+f.scale).toFixed(2));
      if ((f.dx ?? 0) !== 0) parts.push('dx: ' + f.dx);
      if ((f.dy ?? 0) !== 0) parts.push('dy: ' + f.dy);
      return parts.length ? '  ' + b.key + ': { ' + parts.join(', ') + ' },' : null;
    })
    .filter(Boolean);
  return 'export const FIT = {\\n' + (rows.join('\\n') || '  // 다 그대로다') + '\\n};';
}

for (const id of ['scale', 'dx', 'dy']) {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = id === 'scale' ? +e.target.value : Math.round(+e.target.value);
    of(who).fit[id] = v;
    document.getElementById(id + 'Out').textContent = v;
    draw();
  });
}
for (const id of ['all', 'lines', 'bg']) {
  document.getElementById(id).addEventListener('change', draw);
}
document.getElementById('copy').addEventListener('click', async (e) => {
  await navigator.clipboard.writeText(text());
  e.target.textContent = '복사했어요';
  setTimeout(() => (e.target.textContent = 'FIT 복사'), 1200);
});

const whoBox = document.getElementById('who');
for (const b of D.bears) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = b.key;
  btn.addEventListener('click', () => {
    who = b.key;
    whoBox.querySelectorAll('button').forEach((n) =>
      n.setAttribute('aria-pressed', String(n.textContent === who)),
    );
    draw();
  });
  whoBox.appendChild(btn);
}
whoBox.firstChild.setAttribute('aria-pressed', 'true');

// 눈금 — TALL 선, 바닥선, 한가운데
function rule() {
  guide.innerHTML = '';
  const px = (v) => 100 - 6 - W + W * v;   // 칸 위(%)에서 v만큼
  const line = (cls, style, tag) => {
    const i = document.createElement('i');
    i.className = cls;
    Object.assign(i.style, style);
    guide.appendChild(i);
    if (tag) {
      const b = document.createElement('b');
      b.textContent = tag;
      b.style.top = style.top;
      guide.appendChild(b);
    }
  };
  line('h', { top: px(1 - D.FLOOR - D.TALL) + '%' }, 'TALL');
  line('h', { top: px(1 - D.FLOOR) + '%' }, '바닥');
  line('v', { left: '50%' });
}

/* 상점 칸과 홈 칸을 오간다 — 같은 그림이 두 자리에서 다르게 뜬다 */
document.getElementById('where').addEventListener('change', (e) => {
  W = D.SLOT[e.target.value];
  draw();
});

draw();
</script>
</body>
</html>
`;
}
