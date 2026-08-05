'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import { UiProvider } from '@/lib/ui';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <StoreProvider>
        <UiProvider>{children}</UiProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
