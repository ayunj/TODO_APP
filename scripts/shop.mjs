/**
 * 상점 그림 올리기 — `npm run shop`
 *
 * `public/gomdori/`에 눌러 담긴 그림을 Supabase Storage의 **`shop` 통**에 올린다.
 * 올리고 나면 값표의 `img`가 가리키는 자리에 파일이 서 있게 된다.
 *
 * ```
 * assets/gomdori/wizard.png   원본 1.4MB
 *   → npm run gomdori         눌러 담기
 * public/gomdori/wizard.png   150KB   ← 앱과 같이 나가는 것 (못 읽었을 때 대비책)
 *   → npm run shop            올리기
 * shop/deco/costume/gomdori/wizard.png ← 앱이 실제로 보는 것
 * ```
 *
 * **자리는 `<대분류>/<중분류>/<종류>/<열쇠>.png`다.** 서버의 `shop_folder()`가
 * 짓는 것과 같은 규칙이고, 값표의 `img`에 적히는 것도 이 문자열 그대로다
 * (통 이름 `shop`은 안 적는다 — 통을 옮기면 줄마다 다 고쳐야 한다).
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
 * 열쇠가 없으면 **무엇을 어디에 올려야 하는지만 적고 끝낸다** —
 * 대시보드 Storage에서 손으로 올릴 때 그 목록을 보면 된다.
 */
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = new URL('../public/gomdori/', import.meta.url);

/**
 * 무엇을 어디에.
 *
 * **기본 곰돌이와 기본 룸은 여기 없다.** 그 둘은 값표의 `img`를 비워두고
 * 앱이 가진 그림으로 세운다 — 로그인 전에도 서버를 못 읽어도 서 있어야 하는 것이라
 * 올려두면 오히려 그 자리에서만 안 뜬다.
 *
 * 곰토끼도 아직 여기 없다. 앞으로 그린 것을 올릴 때 한 줄씩 더한다.
 */
const UP = [
  { key: 'dragon', file: 'dragon.png', to: 'deco/costume/gomdori/dragon.png' },
  { key: 'princess', file: 'princess.png', to: 'deco/costume/gomdori/princess.png' },
  { key: 'wizard', file: 'wizard.png', to: 'deco/costume/gomdori/wizard.png' },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url) {
  console.error('\nNEXT_PUBLIC_SUPABASE_URL이 없습니다. .env.local을 보세요.\n');
  process.exit(1);
}

if (!secret) {
  console.log('\nSUPABASE_SECRET_KEY가 없어 올리지 않습니다.');
  console.log('대시보드 Storage → shop 통에 아래대로 손으로 올리면 같은 것입니다.\n');
  for (const u of UP) console.log(`  public/gomdori/${u.file.padEnd(14)} →  shop/${u.to}`);
  console.log('\n열쇠를 세워 두면 이 스크립트가 대신 올립니다 —');
  console.log("  $env:SUPABASE_SECRET_KEY = 'sb_secret_...'; npm run shop\n");
  process.exit(0);
}

const client = createClient(url, secret, { auth: { persistSession: false } });

for (const u of UP) {
  const body = await readFile(fileURLToPath(new URL(u.file, OUT)));
  /*
   * `upsert`로 올린다. 그림을 다시 그려 올릴 때 지웠다 올리게 하면
   * 지운 뒤 올리기 전에 상점을 연 사람에게 빈 칸이 뜬다.
   */
  const { error } = await client.storage
    .from('shop')
    .upload(u.to, body, { contentType: 'image/png', upsert: true });
  if (error) {
    console.error(`\n${u.key} 올리다 막혔습니다 — ${error.message}\n`);
    process.exit(1);
  }
  console.log(`${u.key.padEnd(10)} →  shop/${u.to}  ${(body.length / 1024).toFixed(0)}KB`);
}

console.log(`\n${UP.length}장 올렸습니다.`);
console.log('값표의 img는 SQL이 채웁니다 — sql/2026-08-26_빈-껍데기-지우고-코스튬-셋.sql\n');
