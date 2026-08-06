'use client';

import { useMemo } from 'react';
import ScrollRow from '@/components/ScrollRow';
import { useStore } from '@/lib/store';
import type { ShopItem } from '@/lib/types';

/** 기록에서 많이 산 순으로. 이미 목록에 있는 것은 뺀다. */
function frequent(history: ShopItem[], onList: Set<string>, limit = 8) {
  const count = new Map<string, { title: string; id: string; n: number }>();
  for (const i of history) {
    const found = count.get(i.title);
    // id는 가장 최근 것으로 — 다시 담을 때 최근 메모·구입처가 따라오게
    if (found) {
      found.n += 1;
      found.id = i.id;
    } else count.set(i.title, { title: i.title, id: i.id, n: 1 });
  }
  return [...count.values()]
    .filter((c) => c.n >= 2 && !onList.has(c.title))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

/** 두 번 이상 산 것은 매번 다시 적지 않게 칩으로 꺼내둔다 */
export default function FrequentChips({ history, onList }: { history: ShopItem[]; onList: Set<string> }) {
  const { rebuyShopItem } = useStore();
  const chips = useMemo(() => frequent(history, onList), [history, onList]);

  if (chips.length === 0) return null;

  return (
    <ScrollRow className="mb-3">
      {chips.map((c) => (
        <button
          key={c.title}
          type="button"
          onClick={() => rebuyShopItem(c.id)}
          className="inline-flex flex-none items-center gap-1.5 rounded-full bg-card px-[15px] py-2.5 text-[13.5px] font-medium text-ink2 shadow-card active:scale-95"
        >
          {c.title}
          <span className="font-mono text-[11px] text-ink3">{c.n}</span>
        </button>
      ))}
    </ScrollRow>
  );
}
