'use client';

import Sheet from '@/components/Sheet';
import { Hint } from '@/components/form';
import { useUi } from '@/lib/ui';

/**
 * 2단계 자리. 지금은 아직 붙이지 않았다.
 * 붙일 때는 Supabase Auth + 방 + 초대 링크로 가고,
 * 링크로 들어온 사람에게는 읽기 + 완료 체크만 열어준다.
 */
export default function ShareSheet() {
  const { closeSheet, openSheet } = useUi();

  return (
    <Sheet title="함께 쓰기" onClose={closeSheet} onBack={() => openSheet({ kind: 'settings' })}>
      <div className="rounded-card bg-card px-[18px] py-8 text-center text-[13px] leading-[1.8] text-ink3 shadow-card">
        <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">
          아직 준비 중입니다
        </b>
        1단계는 이 기기 안에서만 씁니다.
        <br />
        2단계에서 방을 만들고 초대 링크로 나눠 쓸 수 있게 됩니다.
      </div>

      <div className="mt-4">
        <Hint>
          링크를 받은 쪽은 설치도 회원가입도 없이 열어서 체크만 할 수 있게 만듭니다. 한쪽만 앱을
          깔고 있으면 오래 못 갑니다. 계정은 나중에 권한을 더하는 흐름으로 둡니다.
        </Hint>
      </div>
    </Sheet>
  );
}
