'use client';

import { shortDate } from '@/lib/date';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { ShopItem } from '@/lib/types';

/** 한 줄. 이름을 누르면 이름·메모·구입처를 고치는 시트가 열린다. */
export default function ShopRow({ item }: { item: ShopItem }) {
  const { toggleShopItem } = useStore();
  const { openSheet } = useUi();

  return (
    <li
      className={`flex items-start gap-3 rounded-card px-[15px] ${
        item.done ? 'bg-sunk py-[13px]' : 'bg-card py-[15px] shadow-card'
      }`}
    >
      <button
        type="button"
        aria-label="담음 표시"
        aria-pressed={item.done}
        onClick={() => toggleShopItem(item.id)}
        className={`mt-px grid h-[25px] w-[25px] flex-none place-items-center rounded-full border-[1.8px] text-[13px] font-bold active:scale-90 ${
          item.done ? 'border-ok bg-ok text-white' : 'border-edge text-transparent'
        }`}
      >
        ✓
      </button>

      <button
        type="button"
        aria-label="수정"
        onClick={() => openSheet({ kind: 'shopItem', id: item.id })}
        className="min-w-0 flex-1 bg-transparent text-left"
      >
        <span
          className={`block break-words text-[16px] ${
            item.done ? 'text-done line-through decoration-1' : ''
          }`}
        >
          {item.title}
        </span>

        {item.note && (
          <span
            className={`mt-1.5 block whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[13.5px] leading-[1.55] ${
              item.done ? 'text-done' : 'bg-memo text-ink2'
            }`}
          >
            {item.note}
          </span>
        )}

        {(item.place || (item.done && item.boughtOn)) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink3">
            {item.place && (
              <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[12px] font-medium text-accent">
                {item.place}
              </span>
            )}
            {item.done && item.boughtOn && (
              <span className="font-mono">{shortDate(item.boughtOn)} 담음</span>
            )}
          </span>
        )}
      </button>
    </li>
  );
}
