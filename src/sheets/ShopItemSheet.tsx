'use client';

import { useMemo, useState } from 'react';
import Sheet from '@/components/Sheet';
import { DangerButton, Field, GoButton } from '@/components/form';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 이름·메모·구입처. 빠르게 담는 건 위 입력 줄이 맡고, 여기는 자세히 적는 자리다. */
export default function ShopItemSheet({ id }: { id: string }) {
  const { shopping, updateShopItem, removeShopItem } = useStore();
  const { closeSheet } = useUi();

  const item = shopping.find((i) => i.id === id) ?? null;
  const [title, setTitle] = useState(item?.title ?? '');
  const [note, setNote] = useState(item?.note ?? '');
  const [place, setPlace] = useState(item?.place ?? '');

  /** 전에 적어둔 곳들을 골라 쓸 수 있게 — 매번 '쿠팡'을 다시 치지 않도록 */
  const places = useMemo(
    () => [...new Set(shopping.map((i) => i.place).filter(Boolean))].sort(),
    [shopping],
  );

  if (!item) return null;

  const submit = () => {
    if (!title.trim()) {
      document.getElementById('s-title')?.focus();
      toast('이름을 적어주세요');
      return;
    }
    updateShopItem(item.id, { title, note, place });
    closeSheet();
    toast('수정했습니다');
  };

  return (
    <Sheet title="장보기 항목" onClose={closeSheet}>
      <Field label="이름" htmlFor="s-title">
        <input
          id="s-title"
          type="text"
          className="field-input"
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field label="어디서" htmlFor="s-place">
        <input
          id="s-place"
          type="text"
          className="field-input"
          list="shop-places"
          placeholder="예: 쿠팡, 이마트"
          autoComplete="off"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
        />
        <datalist id="shop-places">
          {places.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>

      <Field label="메모" htmlFor="s-note">
        <textarea
          id="s-note"
          rows={2}
          className="field-input resize-y leading-[1.6]"
          placeholder="예: 저지방으로, 2개"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <GoButton onClick={submit}>저장</GoButton>
      <DangerButton
        onClick={() => {
          removeShopItem(item.id);
          closeSheet();
          toast(`${item.title} — 목록에서 뺐습니다`);
        }}
      >
        이 항목 삭제
      </DangerButton>
    </Sheet>
  );
}
