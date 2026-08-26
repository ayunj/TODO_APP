'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageBar from '@/components/PageBar';
import AdminForm from './admin/AdminForm';
import AdminList from './admin/AdminList';
import { useGomdori } from '@/lib/gomdori';
import { pullShop } from '@/lib/repo/remote';
import { toast } from '@/lib/toast';
import type { Shop } from '@/lib/types';

/**
 * 상점 채우기 — [시안](../../design/관리자.html)의 **앱 판** 그대로.
 *
 * **화면이 둘이다.** 목록과 채우기를 한 화면에 같이 두지 않는다 —
 * 시안의 넷째 까닭이다. 넓은 판은 왼쪽에 그림, 오른쪽에 적는 칸을 나란히 두는데
 * 360px에서는 그 둘이 세로로 쌓여 스크롤이 두 배가 된다.
 *
 *   올린 것  ← 먼저 열린다. 서른 개를 훑고 켜고 끄는 일이 새로 올리는 일보다 잦다
 *   채우기   ← `＋ 채우기`를 누르면
 *
 * **여는 사람은 `shop_admins`에 든 사람뿐이다.** 명단에 넣는 길은 앱에 없다 —
 * SQL Editor에서 손으로 넣는다(관리자 하나가 새면 상점 전체가 샌다).
 *
 *   insert into shop_admins (user_id)
 *   select id from auth.users where email = '내메일@example.com'
 *   on conflict do nothing;
 *
 * **이 화면이 지키는 것은 없다.** 통과 값표를 막는 것은 RLS(`is_shop_admin()`)라
 * 화면을 억지로 열어도 올리는 데서 막힌다. 여기서 감추는 것은 안 쓸 사람에게
 * 안 보이게 하는 것뿐이다.
 */
export default function ShopAdminScreen() {
  const { admin } = useGomdori();
  const [shop, setShop] = useState<Shop | null>(null);
  /** 채우는 중인 물건. `null`이면 목록, `''`이면 새로 넣는 중 */
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      /*
        관리자에게는 **숨긴 것까지 내려온다**(값표 정책이 `active or is_shop_admin()`).
        상점 화면이 쓰는 것과 같은 함수라 따로 부를 것이 없다.
      */
      setShop(await pullShop());
    } catch {
      toast('상점을 못 읽었어요');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const live = useMemo(
    () => (shop ? shop.items.filter((c) => c.active).length : 0),
    [shop],
  );

  if (!admin) {
    return (
      <>
        <PageBar title="상점 채우기" />
        <div className="rounded-card bg-card px-[18px] py-10 text-center text-[13px] leading-[1.7] text-ink3 shadow-card">
          <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">
            채울 수 있는 계정이 아니에요
          </b>
          명단은 앱에서 못 늘려요. Supabase SQL Editor에서 넣습니다.
        </div>
      </>
    );
  }

  if (!shop) {
    return (
      <>
        <PageBar title="상점 채우기" />
        <p className="py-10 text-center text-[13px] text-ink3">불러오는 중…</p>
      </>
    );
  }

  /*
    제목 옆의 셈 — **올린 것과 파는 중을 같이 적는다.** 하나만 적으면
    숨겨둔 것이 몇 개인지가 어디에도 안 뜬다.
  */
  return editing === null ? (
    <>
      <PageBar title="상점 채우기" right={<Crumb>{`올린 것 ${shop.items.length} · 파는 중 ${live}`}</Crumb>} />
      <AdminList shop={shop} onOpen={setEditing} onDone={load} />
    </>
  ) : (
    <>
      {/* 화살표는 목록으로 돌아간다 — 겹을 벗으면 화면을 통째로 나가버린다 */}
      <PageBar
        title="채우기"
        onBack={() => setEditing(null)}
        right={<Crumb>{editing ? editing : '새 물건'}</Crumb>}
      />
      <AdminForm
        key={editing || 'new'}
        shop={shop}
        itemKey={editing || null}
        onClose={() => setEditing(null)}
        onDone={load}
      />
    </>
  );
}

function Crumb({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[10.5px] text-ink3">{children}</span>;
}
