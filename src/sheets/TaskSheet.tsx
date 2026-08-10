'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { DangerButton, GoButton } from '@/components/form';
import TaskFormFields, { type FormValue } from './TaskFormFields';
import { shortDate } from '@/lib/date';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function TaskSheet({ id }: { id: string | null }) {
  const { tasks, presets, categories, addTask, updateTask, removeTask, addPreset } = useStore();
  const { cursor, filter, closeSheet, setCursor } = useUi();

  const editing = id ? (tasks.find((t) => t.id === id) ?? null) : null;
  const [alsoPreset, setAlsoPreset] = useState(false);
  const [value, setValue] = useState<FormValue>(() => ({
    title: editing?.title ?? '',
    // 카테고리 id는 기기마다 새로 매겨진다 — 고정된 이름을 기본값으로 두면 안 된다
    categoryId: editing?.categoryId ?? filter ?? categories[0]?.id ?? '',
    priority: editing?.priority ?? 2,
    date: editing?.date ?? cursor,
    repeatDays: editing?.repeatDays ?? 0,
    repeatUntil: editing?.repeatUntil ?? '',
    memo: editing?.memo ?? '',
    assigneeId: editing?.assigneeId ?? null,
    rotate: editing?.rotate ?? 'once',
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
      assigneeId: value.assigneeId,
      rotate: value.rotate,
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
          assigneeId: input.assigneeId,
          rotate: input.rotate,
        });
      }
      setCursor(input.date);
      toast('추가했습니다');
    }
    closeSheet();
  };

  return (
    <Sheet title={editing ? '할 일 수정' : '할 일 추가'} onClose={closeSheet}>
      <TaskFormFields value={value} onChange={patch} editing={!!editing} />

      {!editing && (
        <label className="flex cursor-pointer items-center gap-2.5 pb-3.5 pt-1.5 text-[13.5px] text-ink2">
          <input
            type="checkbox"
            className="h-[18px] w-[18px] accent-[var(--accent)]"
            checked={alsoPreset}
            onChange={(e) => setAlsoPreset(e.target.checked)}
          />
          즐겨찾기에 저장
        </label>
      )}

      <GoButton onClick={submit}>{editing ? '저장' : '추가'}</GoButton>

      {editing && (
        <DangerButton
          onClick={() => {
            // 다음 회차가 잡혀 있으면 그건 안 지운다는 걸 미리 알려준다
            const pending = tasks.find((t) => t.parentId === editing.id && !t.done);
            const message = pending
              ? `이 할 일을 지웁니다. 다음 회차(${shortDate(pending.date)})는 그대로 남습니다.`
              : '이 할 일을 지웁니다.';
            if (!confirm(message)) return;
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
