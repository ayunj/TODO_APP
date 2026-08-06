/** @type {import('next').NextConfig} */

/**
 * 앱(Capacitor)으로 빌드할 때만 `out/`에 정적 파일로 내보낸다.
 * 웹은 지금까지처럼 Vercel이 그대로 굴린다 — 앱을 붙이면서 웹 배포를 건드리지 않으려고 갈라뒀다.
 *
 *   npm run build      → 웹 (Vercel)
 *   npm run app:build  → 앱 (out/ → android/)
 *
 * 서버 코드가 한 줄도 없어서 둘 다 같은 결과가 나온다. 갈라둔 건 안전장치다.
 */
const forApp = process.env.BUILD_TARGET === 'app';

const nextConfig = {
  reactStrictMode: true,
  ...(forApp ? { output: 'export', images: { unoptimized: true } } : {}),
};

export default nextConfig;
