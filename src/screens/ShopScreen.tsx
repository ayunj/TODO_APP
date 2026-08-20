'use client';

import { useMemo, useState } from 'react';
import FrequentChips from './shop/FrequentChips';
import ShopAddRow from './shop/ShopAddRow';
import ShopHistory from './shop/ShopHistory';
import ShopRow from './shop/ShopRow';
import EmptyBox from '@/components/EmptyBox';
import ScopeChips, { roomOfScope, settleScope, type Scope } from '@/components/ScopeChips';
import TrashLine from '@/components/TrashLine';
import { todayStr } from '@/lib/date';
import { useRooms } from '@/lib/rooms';
import { onShopList } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/**
 * 장보기 — 날짜도 주기도 없는 평평한 목록.
 * 오늘 담은 것까지만 목록에 남고, 그 전 것은 다음 날 저절로 기록으로 내려간다.
 *
 * 방을 쓰면 맨 위에 방 칩 줄이 붙는다. **기본은 전체** —
 * 마트에서는 집 것 회사 것 가리지 않고 그냥 훑는다.
 */
export default function ShopScreen() {
  const { shopping } = useStore();
  const { rooms } = useRooms();
  const today = todayStr();

  // 장보기를 나누는 방만 나온다. 껐으면 고를 길이 아예 없다 — 잘못 누를 수 없다.
  const sharing = useMemo(() => rooms.filter((r) => r.shareShop), [rooms]);
  const [scope, setScope] = useState<Scope>('all');
  // 방에서 나왔거나 장보기를 끈 참이면 전체로 돌려놓는다 (없는 칸을 보고 있지 않게)
  const picked = settleScope(scope, sharing);

  const { open, bought, history, onList } = useMemo(() => {
    const here = shopping.filter((i) =>
      picked === 'all' ? true : picked === 'mine' ? !i.roomId : i.roomId === picked,
    );
    const live = here.filter((i) => onShopList(i, today));
    return {
      open: live.filter((i) => !i.done),
      bought: live.filter((i) => i.done),
      history: here.filter((i) => !onShopList(i, today)),
      onList: new Set(live.map((i) => i.title)),
    };
  }, [shopping, picked, today]);

  const room = sharing.find((r) => r.id === roomOfScope(picked)) ?? null;

  return (
    <>
      <ScopeChips rooms={sharing} value={picked} onChange={setScope} />
      {/* 고른 자리에 담긴다 — 집 칩을 눌러놓고 적으면 집 목록으로 간다 */}
      <ShopAddRow roomId={room?.id ?? null} where={room?.name ?? null} />
      {/* 다시 담기는 그 항목이 있던 자리로 되돌아간다 — 기록도 이미 걸러진 것이다 */}
      <FrequentChips history={history} onList={onList} />

      {open.length + bought.length === 0 ? (
        <EmptyBox pose="peek" title="담아둘 것이 없습니다">
          {room ? `${room.name} 목록이 비어 있어요.` : '떠오를 때마다 위에 적어두세요.'}
          <br />장 보러 가서 하나씩 지우면 됩니다.
        </EmptyBox>
      ) : (
        <>
          {open.length > 0 ? (
            <ul className="flex list-none flex-col gap-[9px] p-0">
              {open.map((item) => (
                <ShopRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <EmptyBox pose="rest" title="다 담았습니다">{bought.length}개 전부 챙겼어요.</EmptyBox>
          )}

          {/* 담은 것은 오늘까지만 여기 남는다 — 마트에서 "이거 담았나" 확인이 돼야 하니까 */}
          {bought.length > 0 && (
            <>
              <div className="mb-2.5 mt-[22px]">
                <span className="text-[12px] font-medium text-ink3">오늘 담음 {bought.length}</span>
                <span className="ml-2 text-[11.5px] text-ink3">내일이면 기록으로 내려가요</span>
              </div>
              <ul className="flex list-none flex-col gap-[9px] p-0">
                {bought.map((item) => (
                  <ShopRow key={item.id} item={item} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <ShopHistory items={history} />
      {/*
        장보기·메모에는 카테고리가 없다 — 각자 제 화면 맨 아래에서 같은 화면으로 들어간다.
        방을 보고 있을 때는 안 그린다. 여기 오르는 건 개인 것뿐이고
        방 장보기를 되돌리는 자리는 방 설정이다.
      */}
      {!room && <TrashLine scope="shop" />}
    </>
  );
}
