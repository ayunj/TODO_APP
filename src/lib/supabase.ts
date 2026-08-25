import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 열쇠가 아직 없으면 로그인도 동기화도 없는 1단계 그대로 돈다.
 * 반쯤 붙은 상태로 로그인 벽만 세워두면 앱을 아예 못 쓰게 된다.
 */
export const hasSupabase = Boolean(url && anonKey);

/**
 * 올린 그림이 서는 주소. 통은 열려 있어서(`public`) 서명 없이 바로 붙는다 —
 * 닫아두면 격자 칸마다 주소를 받아오는 요청이 한 번씩 더 붙는다.
 *
 * 값표에는 통 이름 뒤부터 적혀 있다(`deco/daily/gomdori/0000001.png`).
 * 통을 옮겨도 값표를 안 고치게 하려고 그렇게 뒀다.
 */
export const shopImageUrl = (path: string): string =>
  `${url}/storage/v1/object/public/shop/${path}`;

let pending: Promise<SupabaseClient> | null = null;

/**
 * 클라이언트는 쓸 때 가서 받아온다.
 * 위에서 그냥 import하면 60KB짜리 짐이 열쇠 없는 사람 화면에도 실린다.
 */
export function supabase(): Promise<SupabaseClient> {
  if (!hasSupabase) return Promise.reject(new Error('Supabase 설정이 없습니다'));
  if (!pending) {
    pending = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url!, anonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // 비밀번호 재설정 메일의 링크를 받아내야 한다. 그 값은 주소의 # 뒤에 실려 오고,
          // 초대 링크의 ?join=코드는 ? 뒤라서 서로 건드리지 않는다.
          detectSessionInUrl: true,
        },
      }),
    );
  }
  return pending;
}
