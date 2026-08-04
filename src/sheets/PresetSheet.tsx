'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { GoButton } from '@/components/form';
import TaskFormFields, { type FormValue } from './TaskFormFields';
import { todayStr } from '@/lib/date';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 날짜 필드는 없고 주기·종료일·메모는 있다 */
export default function PresetSheet({ id }: { id: string | null }) {
  const { presets, addPreset, updatePreset } = useStore();
  const { filter, openSheet, closeSheet } = useUi();

  const editing = id ? (presets.find((p) => p.id === id) ?? null) : null;
  const [value, setValue] = useState<FormValue>(() => ({
    title: editing?.title ?? '',
    categoryId: editing?.categoryId ?? filter ?? 'home',
    priority: editing?.priority ?? 2,
    date: todayStr(),
    repeatDays: editing?.repeatDays ?? 0,
    repeatUntil: editing?.repeatUntil ?? '',
    memo: editing?.memo ?? '',
  }));

  const back = () => openSheet({ kind: 'presetList' });

  const submit = () => {
    const title = value.title.trim();
    if (!title) {
      document.getElementById('f-title')?.focus();
      toast('이름을 적어주세요');
      return;
    }
    const input = {
      title,
      memo: value.memo.trim(),
      categoryId: value.categoryId,
      priority: value.priority,
      repeatDays: value.repeatDays,
      repeatUntil: value.repeatUntil || null,
    };
    if (editing) {
      updatePreset(editing.id, input);
      toast('수정했습니다');
    } else {
      addPreset(input);
      toast('추가했습니다');
    }
    back();
  };

  return (
    <Sheet
      title={editing ? '자주 쓰는 일 수정' : '자주 쓰는 일 추가'}
      onClose={closeSheet}
      onBack={back}
    >
      <TaskFormFields
        value={value}
        onChange={(p) => setValue((v) => ({ ...v, ...p }))}
        showDate={false}
      />
      <GoButton onClick={submit}>{editing ? '저장' : '추가'}</GoButton>
    </Sheet>
  );
}
