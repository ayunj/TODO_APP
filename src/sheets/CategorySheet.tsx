'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { ColorPicker, Field, GoButton } from '@/components/form';
import { PALETTE } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function CategorySheet({ id }: { id: string | null }) {
  const { categories, addCategory, updateCategory } = useStore();
  const { closeSheet } = useUi();

  const editing = id ? (categories.find((c) => c.id === id) ?? null) : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState(
    editing?.color ?? PALETTE[categories.length % PALETTE.length],
  );

  // 내리면 목록 화면이 그대로 뒤에 있다 — 상위로 가는 화살표를 따로 두지 않는다
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      document.getElementById('c-name')?.focus();
      toast('이름을 적어주세요');
      return;
    }
    if (editing) {
      updateCategory(editing.id, trimmed, color);
      toast('수정했습니다');
    } else {
      addCategory(trimmed, color);
      toast('추가했습니다');
    }
    closeSheet();
  };

  return (
    <Sheet title={editing ? '카테고리 수정' : '새 카테고리'} onClose={closeSheet}>
      <Field label="이름" htmlFor="c-name">
        <input
          id="c-name"
          type="text"
          className="field-input"
          placeholder="예: 반려동물"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="색">
        <ColorPicker value={color} onChange={setColor} />
      </Field>

      <GoButton onClick={submit}>{editing ? '저장' : '추가'}</GoButton>
    </Sheet>
  );
}
