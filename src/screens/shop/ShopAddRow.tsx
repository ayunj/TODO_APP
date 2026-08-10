'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';

/**
 * 항상 떠 있는 입력 한 줄.
 * 시트를 띄우면 다섯 개 적을 때 다섯 번 열어야 한다 — 엔터로 이어 적게 둔다.
 *
 * 위에서 방 칩을 골라뒀으면 **그 방으로 담긴다.** 어디로 가는지는 적는 칸이 말한다 —
 * `집에 살 것 적기`. 담고 나서 어디 갔는지 찾게 하지 않는다.
 */
export default function ShopAddRow({
  roomId = null,
  where = null,
}: {
  roomId?: string | null;
  /** 고른 방 이름 — 없으면 나만 보는 자리 */
  where?: string | null;
}) {
  const { addShopItem } = useStore();
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!text.trim()) return;
    addShopItem(text, { roomId });
    setText('');
    ref.current?.focus(); // 이어서 다음 것을 적을 수 있게
  };

  return (
    // 포커스 테두리가 고정 헤더에 닿지 않게 살짝 띄운다
    <div className="mb-3 mt-0.5 flex items-center gap-2">
      <input
        ref={ref}
        type="text"
        className="field-input flex-1"
        placeholder={where ? `${where}에 살 것 적기` : '살 것 적기'}
        autoComplete="off"
        enterKeyHint="done"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="button"
        aria-label="담기"
        onClick={submit}
        disabled={!text.trim()}
        className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] bg-accent text-[24px] font-light leading-none text-white shadow-card active:scale-95 disabled:bg-edge disabled:text-white/70"
      >
        +
      </button>
    </div>
  );
}
