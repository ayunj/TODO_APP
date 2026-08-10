'use client';

import { bandOf } from '@/lib/constants';
import { shortDate } from '@/lib/date';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { ShopItem } from '@/lib/types';

/**
 * 한 줄. 이름을 누르면 이름·메모·구입처·어디에를 고치는 시트가 열린다.
 *
 * 방 칩은 **제목 줄 오른쪽**에 따로 칸을 잡는다. 이름 칸과 칩 칸이 갈려 있어
 * 이름이 두 줄이 돼도 칩은 첫 줄에 남고 겹칠 자리가 없다.
 * 칩이 없으면 나만 보는 것이다 — `나만`이라고 적지 않는다. 대부분이 그것이라서.
 */
export default function ShopRow({ item }: { item: ShopItem }) {
  const { toggleShopItem, removeShopItem } = useStore();
  const { rooms } = useRooms();
  const { openSheet } = useUi();

  const room = item.roomId ? (rooms.find((r) => r.id === item.roomId) ?? null) : null;

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
        className={`mt-px grid h-[25px] w-[25px] flex-none place-items-center rounded-full border-[1.8px] text-[12px] font-bold active:scale-90 ${
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
        <span className="flex items-start gap-2.5">
          <span
            className={`min-w-0 flex-1 [overflow-wrap:anywhere] text-[15px] ${
              item.done ? 'text-done line-through decoration-1' : ''
            }`}
          >
            {item.title}
          </span>
          {room && (
            <span
              className={`mt-0.5 inline-flex flex-none items-center rounded-full px-[9px] py-[2.5px] text-[10.5px] font-medium ${
                item.done ? 'bg-track text-done' : 'text-ink'
              }`}
              style={item.done ? undefined : { background: bandOf(room.color) }}
            >
              {room.name}
            </span>
          )}
        </span>

        {item.note && (
          <span
            className={`mt-1.5 block whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[12.5px] leading-[1.55] ${
              item.done ? 'text-done' : 'bg-memo text-ink2'
            }`}
          >
            {item.note}
          </span>
        )}

        {(item.place || (item.done && item.boughtOn)) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink3">
            {item.place && (
              <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-medium text-accent">
                {item.place}
              </span>
            )}
            {item.done && item.boughtOn && (
              <span className="font-mono">{shortDate(item.boughtOn)} 담음</span>
            )}
          </span>
        )}
      </button>

      {/*
        할 일 한 줄과 같은 자리에 같은 ×다. 여기만 없어서
        안 살 것을 빼려면 시트를 열어 맨 아래까지 내려가야 했다.
        지운 것은 30일 남는다 — 화면 맨 아래 `지운 것`에서 되돌린다.
      */}
      <button
        type="button"
        aria-label="삭제"
        onClick={() => removeShopItem(item.id)}
        className="mt-px grid h-7 w-7 flex-none place-items-center rounded-[10px] text-[16px] text-faint active:bg-sunk active:text-high"
      >
        ×
      </button>
    </li>
  );
}
