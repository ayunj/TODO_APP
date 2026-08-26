/**
 * 상점 그림 올리기 — `npm run shop`
 *
 * `assets/shop/` 밑의 원본을 눌러 담아 Supabase Storage의 **`shop` 통**에 올린다.
 * **폴더 생김새가 통과 똑같아서** 자리를 따로 정할 것이 없다 —
 * 여기 있는 자리가 곧 저기 있을 자리다([assets/shop/README.md](../assets/shop/README.md)).
 *
 * ```
 * assets/shop/deco/costume/gomdori/wizard.png   원본 1.3MB
 *   → npm run shop                              맞추고 눌러 담아 올린다
 * shop/deco/costume/gomdori/wizard.png          150KB
 * ```
 *
 * **눌러 담는 것은 여기서 한다.** 1.3MB짜리를 그대로 올리면 상점 격자 한 칸이
 * 103px인데 1.3MB를 받는다. 곰돌이는 [bears.mjs](bears.mjs)의 `stand()`로
 * 크기와 자리까지 맞춘다 — 갈아입을 때 곰이 커졌다 작아졌다 하면 안 된다.
 *
 * 배경(`background`)과 소품(`prop`)은 맞추지 않는다. 배경은 정사각 한 장을
 * 통째로 쓰고, 소품은 아직 그린 것이 없다.
 *
 * ─── 열쇠가 있어야 한다 ───────────────────────────────────────────
 *
 * **`shop` 통은 관리자만 쓸 수 있다**(`is_shop_admin()`). 브라우저에 나가는
 * Publishable key로는 못 올린다 — 그래서 이 스크립트는 **Secret key를 그때그때 받는다.**
 *
 *   $env:SUPABASE_SECRET_KEY = 'sb_secret_...'   # PowerShell
 *   npm run shop
 *
 * **`.env.local`에 넣지 말 것.** 그 파일은 `next dev`가 읽어서 브라우저로 나가고,
 * Secret key는 RLS를 통째로 무시하는 열쇠다. 올릴 때만 한 줄 세워 쓰고 만다.
 *
 * 열쇠가 없으면 **눌러 담아 보고 어디로 갈지만 적고 끝낸다** —
 * 대시보드 Storage에서 손으로 올릴 때 그 목록을 보면 된다.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BODY, stand } from './bears.mjs';

const SRC = new URL('../assets/shop/', import.meta.url);

/** 배경은 정사각 한 장을 통째로 쓴다 — 방 그림과 같은 크기다 */
const SCENE = 1000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url) {
  console.error('\nNEXT_PUBLIC_SUPABASE_URL이 없습니다. .env.local을 보세요.\n');
  process.exit(1);
}

const jobs = [];
for (const at of await walk(SRC)) {
  const key = at.slice(at.lastIndexOf('/') + 1).replace(/\.png$/, '');
  // `<대분류>/<중분류>/<종류>/<열쇠>.png` — 뒤에서 둘째가 종류다
  const kind = at.split('/').at(-2);
  const from = fileURLToPath(new URL(at, SRC));

  const body =
    kind === 'gomdori'
      ? await stand(from, key, BODY)
      : sharp(from).resize({ width: SCENE, height: SCENE, fit: 'inside', withoutEnlargement: true });

  const png = await body
    .png({ compressionLevel: 9, palette: true, quality: 82 })
    .toBuffer({ resolveWithObject: true });
  jobs.push({ at, key, png: png.data, w: png.info.width, h: png.info.height });
}

if (jobs.length === 0) {
  console.log('\nassets/shop/ 에 올릴 그림이 없습니다.\n');
  process.exit(0);
}

if (!secret) {
  console.log('\nSUPABASE_SECRET_KEY가 없어 올리지 않습니다.');
  console.log('대시보드 Storage → shop 통에 아래대로 손으로 올리면 같은 것입니다.\n');
  for (const j of jobs) {
    console.log(`  shop/${j.at.padEnd(38)} ${j.w}x${j.h}  ${(j.png.length / 1024).toFixed(0)}KB`);
  }
  console.log('\n열쇠를 세워 두면 이 스크립트가 대신 올립니다 —');
  console.log("  $env:SUPABASE_SECRET_KEY = 'sb_secret_...'; npm run shop\n");
  process.exit(0);
}

const client = createClient(url, secret, { auth: { persistSession: false } });

for (const j of jobs) {
  /*
   * `upsert`로 올린다. 그림을 다시 그려 올릴 때 지웠다 올리게 하면
   * 지운 뒤 올리기 전에 상점을 연 사람에게 빈 칸이 뜬다.
   */
  const { error } = await client.storage
    .from('shop')
    .upload(j.at, j.png, { contentType: 'image/png', upsert: true });
  if (error) {
    console.error(`\n${j.key} 올리다 막혔습니다 — ${error.message}\n`);
    process.exit(1);
  }
  console.log(`${j.key.padEnd(10)} →  shop/${j.at}  ${(j.png.length / 1024).toFixed(0)}KB`);
}

console.log(`\n${jobs.length}장 올렸습니다.`);
console.log('값표의 img는 SQL이 채웁니다 — sql/2026-08-26_빈-껍데기-지우고-코스튬-셋.sql\n');

/** `assets/shop/` 밑의 png를 통에서 쓸 자리 그대로 모은다 */
async function walk(root, at = '') {
  const here = new URL(at ? `${at}/` : '', root);
  const found = [];
  for (const e of await readdir(fileURLToPath(here), { withFileTypes: true })) {
    const next = at ? `${at}/${e.name}` : e.name;
    if (e.isDirectory()) found.push(...(await walk(root, next)));
    else if (e.name.endsWith('.png')) found.push(next);
  }
  return found.sort();
}
