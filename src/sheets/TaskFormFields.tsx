'use client';

import { CategoryPicker, DateField, Field, Hint, PriorityStars } from '@/components/form';
import { PRIORITY_LABEL } from '@/lib/constants';
import { addDays, todayStr } from '@/lib/date';
import type { DateStr, Priority } from '@/lib/types';

/** 미룰 때 고르는 건 대개 이 셋이다 */
const QUICK_DAYS = [
  { label: '오늘', days: 0 },
  { label: '내일', days: 1 },
  { label: '다음 주', days: 7 },
];

export interface FormValue {
  title: string;
  categoryId: string;
  priority: Priority;
  date: DateStr;
  repeatDays: number;
  repeatUntil: string;
  memo: string;
}

/** 할 일 시트와 즐겨찾기 시트가 같은 필드를 쓴다. 즐겨찾기에는 날짜가 없다. */
export default function TaskFormFields({
  value,
  onChange,
  showDate = true,
  editing = false,
}: {
  value: FormValue;
  onChange: (patch: Partial<FormValue>) => void;
  showDate?: boolean;
  /** 고칠 때만 미루기 칩을 보여준다 — 새로 적는 자리에 미루기가 있으면 어수선하다 */
  editing?: boolean;
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
            <div className={`mt-2 flex flex-wrap gap-1.5 ${editing ? '' : 'hidden'}`}>
              {QUICK_DAYS.map(({ label, days }) => {
                const date = addDays(todayStr(), days);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={value.date === date}
                    onClick={() => onChange({ date })}
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${
                      value.date === date ? 'bg-accent text-white' : 'bg-card text-ink2 shadow-card'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
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
        주기를 넣으면 그 할 일의 날짜로부터 그만큼 지난 뒤 다시 나타납니다. 예: 8 → 8/4 것을 끝내면 8/12.
        종료일을 정하면 그날이 지난 뒤로는 다시 생기지 않습니다. 비워두면 계속 반복합니다.
      </Hint>
    </>
  );
}
