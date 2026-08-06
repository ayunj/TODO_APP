/**
 * 앱 아이콘 만들기 — `npm run icons`
 *
 * 강조색이 바뀔 때마다 손으로 다시 그리지 않으려고 스크립트로 둔다.
 * iOS는 매니페스트를 보지 않고 apple-touch-icon(PNG)만 쓴다. 투명한 모서리도 못 받으므로
 * 홈 화면용은 모서리를 깎지 않은 꽉 찬 사각형으로 뽑는다. 둥글리기는 iOS가 알아서 한다.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BRAND = '#D97A5E';
const CHECK = 'M160 262l62 62 132-140';
const OUT = new URL('../public/', import.meta.url);

const svg = ({ round = false, scale = 1 } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${round ? 'rx="112"' : ''} fill="${BRAND}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="${CHECK}" fill="none" stroke="#fff" stroke-width="42"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

/** 마스커블은 어떤 모양으로 잘려도 살아남게 안쪽 80%에만 그린다 */
const FILES = [
  { name: 'icon-192.png', size: 192, opts: { round: true } },
  { name: 'icon-512.png', size: 512, opts: { round: true } },
  { name: 'icon-maskable-512.png', size: 512, opts: { scale: 0.7 } },
  { name: 'apple-touch-icon.png', size: 180, opts: {} },
];

await writeFile(new URL('icon.svg', OUT), svg({ round: true }).trim() + '\n');

for (const { name, size, opts } of FILES) {
  // 윈도에서 URL.pathname은 '/C:/…'가 되어 못 쓴다 — fileURLToPath로 실제 경로를 얻는다
  const out = fileURLToPath(new URL(name, OUT));
  await sharp(Buffer.from(svg(opts))).resize(size, size).png().toFile(out);
  console.log(`${name}  ${size}x${size}`);
}

/*
 * 안드로이드 앱(Capacitor)용 원본 — `npx capacitor-assets generate`가 여기서 모든 밀도를 뽑는다.
 * 웹 아이콘과 달리 모서리를 안 깎는다. 런처가 기기 모양대로 잘라내기 때문에
 * 미리 깎아두면 두 번 깎인다. 앞면(foreground)은 잘려도 살아남게 안쪽 70%에만 그린다.
 */
const bare = (inner) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>`;
const check = (scale, stroke = '#fff') => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="${CHECK}" fill="none" stroke="${stroke}" stroke-width="42"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const APP = [
  { name: 'icon.png', size: 1024, svg: svg({}) },
  { name: 'icon-foreground.png', size: 1024, svg: bare(check(0.7)) },
  { name: 'icon-background.png', size: 1024, svg: bare(`<rect width="512" height="512" fill="${BRAND}"/>`) },
  { name: 'splash.png', size: 2732, svg: bare(`<rect width="512" height="512" fill="#FAF6F0"/>${check(0.5, BRAND)}`) },
];

await mkdir(new URL('../assets/', import.meta.url), { recursive: true });
for (const { name, size, svg: src } of APP) {
  const out = fileURLToPath(new URL(`../assets/${name}`, import.meta.url));
  await sharp(Buffer.from(src)).resize(size, size).png().toFile(out);
  console.log(`assets/${name}  ${size}x${size}`);
}
