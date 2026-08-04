import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: '할 일',
  description: '반복되는 집안일을 나눠서 놓치지 않게 하는 할 일 앱',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '할 일' },
  // iOS는 매니페스트의 아이콘을 보지 않는다. apple-touch-icon(PNG)이 없으면 페이지 사진이 박힌다.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FAF6F0',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@300;400;500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
