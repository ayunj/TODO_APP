'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { DangerButton, GoButton } from '@/components/form';
import TaskFormFields, { type FormValue } from './TaskFormFields';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function TaskSheet({ id }: { id: string | null }) {
  const { tasks, presets, addTask, updateTask, removeTask, addPreset } = useStore();
  const { cursor, filter, closeSheet, setCursor } = useUi();

  const editing = id ? (tasks.find((t) => t.id === id) ?? null) : null;
  const [alsoPreset, setAlsoPreset] = useState(false);
  const [value, setValue] = useState<FormValue>(() => ({
    title: editing?.title ?? '',
    categoryId: editing?.categoryId ?? filter ?? 'home',
    priority: editing?.priority ?? 2,
    date: editing?.date ?? cursor,
    repeatDays: editing?.repeatDays ?? 0,
    repeatUntil: editing?.repeatUntil ?? '',
    memo: editing?.memo ?? '',
  }));

  const patch = (p: Partial<FormValue>) => setValue((v) => ({ ...v, ...p }));

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
      date: value.date || cursor,
      repeatDays: value.repeatDays,
      repeatUntil: value.repeatUntil || null,
    };

    if (editing) {
      updateTask(editing.id, input);
      toast('수정했습니다');
    } else {
      addTask(input);
      if (alsoPreset && !presets.some((p) => p.title === title)) {
        addPreset({
          title,
          memo: input.memo,
          categoryId: input.categoryId,
          priority: input.priority,
          repeatDays: input.repeatDays,
          repeatUntil: input.repeatUntil,
        });
      }
      setCursor(input.date);
      toast('추가했습니다');
    }
    closeSheet();
  };

  return (
    <Sheet title={editing ? '할 일 수정' : '할 일 추가'} onClose={closeSheet}>
      <TaskFormFields value={value} onChange={patch} />

      {!editing && (
        <label className="flex cursor-pointer items-center gap-2.5 pb-3.5 pt-1.5 text-[13.5px] text-ink2">
          <input
            type="checkbox"
            className="h-[18px] w-[18px] accent-[var(--accent)]"
            checked={alsoPreset}
            onChange={(e) => setAlsoPreset(e.target.checked)}
          />
          자주 쓰는 일로 저장
        </label>
      )}

      <GoButton onClick={submit}>{editing ? '저장' : '추가'}</GoButton>

      {editing && (
        <DangerButton
          onClick={() => {
            if (!confirm('이 할 일을 지웁니다.')) return;
            removeTask(editing.id);
            closeSheet();
          }}
        >
          이 할 일 삭제
        </DangerButton>
      )}
    </Sheet>
  );
}
