'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import { GomdoriProvider } from '@/lib/gomdori';
import { RoomsProvider } from '@/lib/rooms';
import { StoreProvider } from '@/lib/store';
import { UiProvider } from '@/lib/ui';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    // 앱(Capacitor) 안에서는 등록하지 않는다. 파일이 이미 기기에 들어 있어서
    // 캐시할 게 없고, http://localhost 로 뜨는 껍데기라 옛 캐시가 끼면 고친 게 안 보인다.
    if ('Capacitor' in window) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <RoomsProvider>
        <GomdoriProvider>
          <StoreProvider>
            <UiProvider>{children}</UiProvider>
          </StoreProvider>
        </GomdoriProvider>
      </RoomsProvider>
    </AuthProvider>
  );
}
