'use client';

import Sheet from '@/components/Sheet';
import { DangerButton, Hint } from '@/components/form';
import { useAuth } from '@/lib/auth';
import { useUi } from '@/lib/ui';

/** 계정 — 로그인한 사람, 나가기. 방과 초대 링크가 붙을 자리이기도 하다. */
export default function AccountSheet() {
  const { account, signOut } = useAuth();
  const { closeSheet, openSheet } = useUi();

  return (
    <Sheet title="계정" onClose={closeSheet} onBack={() => openSheet({ kind: 'settings' })}>
      <div className="mb-4 rounded-card bg-card px-[18px] py-4 shadow-card">
        <span className="block text-[12.5px] text-ink3">{account?.guest ? '초대로 들어옴' : '로그인'}</span>
        <span className="mt-1 block break-all text-[15.5px]">
          {account?.email ?? '이름만 적고 들어온 상태'}
        </span>
      </div>

      <Hint>
        적어둔 것은 계정에 저장됩니다. 폰을 바꾸거나 브라우저를 비워도 그대로 있고, 다른 기기에서
        같은 계정으로 들어오면 이어집니다.
      </Hint>

      <DangerButton
        onClick={() => {
          if (!confirm('로그아웃합니다. 다시 로그인하면 그대로 이어집니다.')) return;
          void signOut();
          closeSheet();
        }}
      >
        로그아웃
      </DangerButton>
    </Sheet>
  );
}
