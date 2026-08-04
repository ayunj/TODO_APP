'use client';

import { useMemo } from 'react';
import ShopAddRow from './shop/ShopAddRow';
import ShopRow from './shop/ShopRow';
import EmptyBox from '@/components/EmptyBox';
import { useStore } from '@/lib/store';

/**
 * 장보기 — 날짜도 주기도 없는 평평한 목록.
 * 마트에서 한 손으로 훑는 화면이라 카드를 크게 잡고 누를 곳을 넓게 둔다.
 */
export default function ShopScreen() {
  const { shopping, clearBoughtShopItems } = useStore();

  const { open, bought } = useMemo(
    () => ({
      open: shopping.filter((i) => !i.done),
      bought: shopping.filter((i) => i.done),
    }),
    [shopping],
  );

  return (
    <>
      <ShopAddRow />

      {shopping.length === 0 ? (
        <EmptyBox title="담아둘 것이 없습니다">
          떠오를 때마다 위에 적어두세요.
          <br />
          장 보러 가서 하나씩 지우면 됩니다.
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
            <EmptyBox title="다 담았습니다">{bought.length}개 전부 챙겼어요.</EmptyBox>
          )}

          {/* 담은 것은 지우지 않고 아래로 내린다 — 마트에서 "이거 담았나" 확인이 된다 */}
          {bought.length > 0 && (
            <>
              <div className="mb-2.5 mt-[22px] flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-ink3">담음 {bought.length}</span>
                <button
                  type="button"
                  onClick={clearBoughtShopItems}
                  className="rounded-[10px] px-2.5 py-1.5 text-[12px] text-ink3 active:bg-sunk"
                >
                  치우기
                </button>
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
    </>
  );
}
