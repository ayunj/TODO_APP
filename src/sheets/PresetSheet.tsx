'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { GoButton } from '@/components/form';
import TaskFormFields, { type FormValue } from './TaskFormFields';
import { todayStr } from '@/lib/date';
import { useTaskFilter } from '@/lib/filter';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 날짜 필드는 없고 주기·종료일·메모는 있다 */
export default function PresetSheet({ id }: { id: string | null }) {
  const { presets, categories, addPreset, updatePreset } = useStore();
  const { closeSheet } = useUi();
  // 보고 있던 자리에서 만든다 — 켜둔 필터가 새 즐겨찾기의 카테고리로 이어진다
  const { cats } = useTaskFilter();

  const editing = id ? (presets.find((p) => p.id === id) ?? null) : null;
  const [value, setValue] = useState<FormValue>(() => ({
    title: editing?.title ?? '',
    // 카테고리 id는 기기마다 새로 매겨진다 — 고정된 이름을 기본값으로 두면 안 된다
    categoryId: editing?.categoryId ?? cats?.[0] ?? categories[0]?.id ?? '',
    priority: editing?.priority ?? 2,
    date: todayStr(),
    repeatDays: editing?.repeatDays ?? 0,
    repeatUntil: editing?.repeatUntil ?? '',
    memo: editing?.memo ?? '',
    assigneeId: editing?.assigneeId ?? null,
    rotate: editing?.rotate ?? 'once',
  }));

  // 내리면 목록 화면이 그대로 뒤에 있다 — 상위로 가는 화살표를 따로 두지 않는다
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
      assigneeId: value.assigneeId,
      rotate: value.rotate,
    };
    if (editing) {
      updatePreset(editing.id, input);
      toast('수정했습니다');
    } else {
      addPreset(input);
      toast('추가했습니다');
    }
    closeSheet();
  };

  return (
    <Sheet title={editing ? '즐겨찾기 수정' : '즐겨찾기 추가'} onClose={closeSheet}>
      <TaskFormFields
        value={value}
        onChange={(p) => setValue((v) => ({ ...v, ...p }))}
        showDate={false}
      />
      <GoButton onClick={submit}>{editing ? '저장' : '추가'}</GoButton>
    </Sheet>
  );
}
