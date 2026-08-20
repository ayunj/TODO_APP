/**
 * 콕 찌르기 푸시 — **이 앱이 서버에 코드를 두는 유일한 자리다.**
 *
 * 찌른 사람의 앱이 `send_nudge`를 마친 다음 이 함수를 부른다.
 * 함수가 하는 일은 하나뿐이다 — **받을 기기 목록을 받아 FCM으로 밀어준다.**
 *
 * 누구에게 보낼지 고르는 규칙은 여기 없다. `nudge_targets()`가 SQL 쪽에서 고른다
 * (방금 만들어진 콕인가 · 부르는 사람이 그 방 사람인가).
 * 여기서 고르게 두면 열쇠를 든 코드가 아무 줄이나 읽을 수 있게 된다.
 *
 * 필요한 것 — 대시보드 › Edge Functions › Secrets
 *   FCM_PROJECT_ID       파이어베이스 프로젝트 id
 *   FCM_CLIENT_EMAIL     서비스 계정 이메일
 *   FCM_PRIVATE_KEY      서비스 계정 비밀키 (줄바꿈은 \n 그대로)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FCM = 'https://fcm.googleapis.com/v1/projects';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: '로그인이 필요합니다' }, 401);

  const { room, task } = await req.json().catch(() => ({}));
  if (!room || !task) return json({ error: '방과 할 일이 있어야 합니다' }, 400);

  // **부르는 사람의 토큰 그대로 부른다.** 그래야 nudge_targets 안의 auth.uid()가 그 사람이 된다.
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data, error } = await db.rpc('nudge_targets', { room, task });
  if (error) return json({ error: error.message }, 400);

  const targets = (data ?? []) as { token: string; from_name: string; task_title: string }[];
  if (targets.length === 0) return json({ sent: 0 });

  const bearer = await googleToken();
  const project = Deno.env.get('FCM_PROJECT_ID')!;
  const gone: string[] = [];

  const results = await Promise.all(
    targets.map(async (t) => {
      const res = await fetch(`${FCM}/${project}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: t.token,
            // 받는 알림에는 **이름을 쓴다.** 찌르기는 사람이 보낸 것이라 누가 보냈는지가 곧 내용이다.
            notification: { title: `${t.from_name} — 콕 찔렀어요`, body: t.task_title },
            android: { priority: 'HIGH', notification: { channel_id: 'nudge' } },
            data: { kind: 'nudge', room: String(room), task: String(task) },
          },
        }),
      });
      // 앱을 지운 기기다. 다음부터 안 보내게 치운다.
      if (res.status === 404) gone.push(t.token);
      return res.ok;
    }),
  );

  if (gone.length) {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await admin.from('device_tokens').delete().in('token', gone);
  }

  return json({ sent: results.filter(Boolean).length });
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/**
 * 서비스 계정으로 구글 토큰을 받는다.
 *
 * 라이브러리를 안 쓴다 — JWT 하나 만들자고 짐을 늘릴 이유가 없다.
 * 한 시간짜리라 매번 새로 받아도 값이 안 든다.
 */
async function googleToken(): Promise<string> {
  const email = Deno.env.get('FCM_CLIENT_EMAIL')!;
  const pem = Deno.env.get('FCM_PRIVATE_KEY')!.replace(/\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(claim));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${head}.${body}`),
  );
  const jwt = `${head}.${body}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const out = await res.json();
  if (!out.access_token) throw new Error('구글 토큰을 못 받았습니다');
  return out.access_token as string;
}

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const raw = atob(body);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}
