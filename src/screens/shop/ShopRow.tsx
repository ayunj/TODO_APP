'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import type { ShopItem } from '@/lib/types';

/** 한 줄. 이름을 누르면 그 자리에서 고친다 — 이것 때문에 시트를 띄우지 않는다. */
export default function ShopRow({ item }: { item: ShopItem }) {
  const { renameShopItem, toggleShopItem, removeShopItem } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== item.title) renameShopItem(item.id, draft);
    else setDraft(item.title);
  };

  return (
    <li
      className={`flex items-center gap-3 rounded-card px-[15px] ${
        item.done ? 'bg-sunk py-[13px]' : 'bg-card py-[15px] shadow-card'
      }`}
    >
      <button
        type="button"
        aria-label="담음 표시"
        aria-pressed={item.done}
        onClick={() => toggleShopItem(item.id)}
        className={`grid h-[25px] w-[25px] flex-none place-items-center rounded-full border-[1.8px] text-[12px] font-bold active:scale-90 ${
          item.done ? 'border-ok bg-ok text-white' : 'border-edge text-transparent'
        }`}
      >
        ✓
      </button>

      {editing ? (
        <input
          ref={ref}
          type="text"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(item.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`min-w-0 flex-1 break-words bg-transparent text-left text-[15px] ${
            item.done ? 'text-done line-through decoration-1' : ''
          }`}
        >
          {item.title}
        </button>
      )}

      <button
        type="button"
        aria-label="빼기"
        onClick={() => removeShopItem(item.id)}
        className="grid h-7 w-7 flex-none place-items-center rounded-[10px] text-[16px] text-faint active:bg-sunk active:text-high"
      >
        ×
      </button>
    </li>
  );
}
