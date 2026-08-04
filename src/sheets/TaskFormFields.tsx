'use client';

import { CategoryPicker, DateField, Field, Hint, PriorityStars } from '@/components/form';
import { PRIORITY_LABEL } from '@/lib/constants';
import type { DateStr, Priority } from '@/lib/types';

export interface FormValue {
  title: string;
  categoryId: string;
  priority: Priority;
  date: DateStr;
  repeatDays: number;
  repeatUntil: string;
  memo: string;
}

/** 할 일 시트와 자주 쓰는 일 시트가 같은 필드를 쓴다. 자주 쓰는 일에는 날짜가 없다. */
export default function TaskFormFields({
  value,
  onChange,
  showDate = true,
}: {
  value: FormValue;
  onChange: (patch: Partial<FormValue>) => void;
  showDate?: boolean;
}) {
  return (
    <>
      <Field label="이름" htmlFor="f-title">
        <input
          id="f-title"
          type="text"
          className="field-input"
          placeholder="무엇을 하나요?"
          autoComplete="off"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>

      <Field label="카테고리">
        <CategoryPicker value={value.categoryId} onChange={(categoryId) => onChange({ categoryId })} />
      </Field>

      <Field label={`우선순위 — ${PRIORITY_LABEL[value.priority]}`}>
        <PriorityStars value={value.priority} onChange={(priority) => onChange({ priority })} />
      </Field>

      <div className={showDate ? 'flex gap-2.5 [&>*]:flex-1' : ''}>
        {showDate && (
          <Field label="날짜" htmlFor="f-date">
            <DateField id="f-date" value={value.date} onChange={(date) => onChange({ date })} />
          </Field>
        )}
        <Field label="주기 (일)" htmlFor="f-rep">
          <input
            id="f-rep"
            type="number"
            min={1}
            max={365}
            className="field-input"
            placeholder="없음"
            value={value.repeatDays || ''}
            onChange={(e) => onChange({ repeatDays: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
      </div>

      <Field label="반복 종료일" htmlFor="f-until">
        <DateField
          id="f-until"
          value={value.repeatUntil}
          onChange={(repeatUntil) => onChange({ repeatUntil })}
        />
      </Field>

      <Field label="메모" htmlFor="f-memo">
        <textarea
          id="f-memo"
          rows={2}
          className="field-input resize-y leading-[1.6]"
          placeholder="없으면 비워두세요"
          value={value.memo}
          onChange={(e) => onChange({ memo: e.target.value })}
        />
      </Field>

      <Hint>
        주기를 넣으면 완료한 날로부터 그만큼 지난 뒤 다시 나타납니다. 예: 8 → 오늘 완료 시 8일 뒤.
        종료일을 정하면 그날이 지난 뒤로는 다시 생기지 않습니다. 비워두면 계속 반복합니다.
      </Hint>
    </>
  );
}
