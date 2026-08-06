'use client';

import { useMemo } from 'react';
import FrequentChips from './shop/FrequentChips';
import ShopAddRow from './shop/ShopAddRow';
import ShopHistory from './shop/ShopHistory';
import ShopRow from './shop/ShopRow';
import EmptyBox from '@/components/EmptyBox';
import { todayStr } from '@/lib/date';
import { onShopList } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/**
 * 장보기 — 날짜도 주기도 없는 평평한 목록.
 * 오늘 담은 것까지만 목록에 남고, 그 전 것은 다음 날 저절로 기록으로 내려간다.
 */
export default function ShopScreen() {
  const { shopping } = useStore();
  const today = todayStr();

  const { open, bought, history, onList } = useMemo(() => {
    const live = shopping.filter((i) => onShopList(i, today));
    return {
      open: live.filter((i) => !i.done),
      bought: live.filter((i) => i.done),
      history: shopping.filter((i) => !onShopList(i, today)),
      onList: new Set(live.map((i) => i.title)),
    };
  }, [shopping, today]);

  return (
    <>
      <ShopAddRow />
      <FrequentChips history={history} onList={onList} />

      {open.length + bought.length === 0 ? (
        <EmptyBox title="담아둘 것이 없습니다">
          떠오를 때마다 위에 적어두세요.
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
            <EmptyBox title="다 담았습니다">{bought.length}개 전부 챙겼어요.</EmptyBox>
          )}

          {/* 담은 것은 오늘까지만 여기 남는다 — 마트에서 "이거 담았나" 확인이 돼야 하니까 */}
          {bought.length > 0 && (
            <>
              <div className="mb-2.5 mt-[22px]">
                <span className="text-[13px] font-medium text-ink3">오늘 담음 {bought.length}</span>
                <span className="ml-2 text-[12.5px] text-ink3">내일이면 기록으로 내려가요</span>
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
    </>
  );
}
