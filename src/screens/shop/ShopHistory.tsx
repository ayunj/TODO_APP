'use client';

import { useMemo } from 'react';
import { DOW, dowOf, monthOf, dayOf, todayStr } from '@/lib/date';
import { useStore } from '@/lib/store';
import type { ShopItem } from '@/lib/types';

/** 산 날짜별로 묶어서 최근 것부터 */
function byDay(items: ShopItem[]) {
  const map = new Map<string, ShopItem[]>();
  for (const i of items) {
    const day = i.boughtOn ?? '';
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(i);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

const label = (day: string) => {
  if (!day) return '날짜 모름';
  if (day === todayStr()) return '오늘';
  return `${monthOf(day)}월 ${dayOf(day)}일 ${DOW[dowOf(day)]}요일`;
};

/** 지난 장보기 — 언제 무엇을 샀는지. 눌러서 다시 담을 수 있다. */
export default function ShopHistory({ items }: { items: ShopItem[] }) {
  const { rebuyShopItem } = useStore();
  const days = useMemo(() => byDay(items), [items]);

  if (days.length === 0) return null;

  return (
    <details className="mt-6">
      <summary className="cursor-pointer list-none border-t border-line py-3 text-[12.5px] text-ink3 [&::-webkit-details-marker]:hidden">
        지난 장보기 {items.length}개 보기
      </summary>

      <div className="mt-1.5">
        {days.map(([day, list]) => (
          <div key={day} className="mb-3.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-medium text-ink2">{label(day)}</span>
              <span className="font-mono text-[11.5px] text-ink3">{list.length}</span>
            </div>
            <ul className="flex list-none flex-wrap gap-1.5 p-0">
              {list.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => rebuyShopItem(i.id)}
                    title="다시 담기"
                    className="rounded-full bg-card px-3 py-1.5 text-[13px] text-ink2 shadow-card active:scale-95"
                  >
                    {i.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="pb-1 text-[12px] leading-[1.6] text-ink3">
          눌러서 다시 담을 수 있어요. 지난 기록은 그대로 남습니다.
        </p>
      </div>
    </details>
  );
}
