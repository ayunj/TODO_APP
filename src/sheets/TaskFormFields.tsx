'use client';

import { CategoryPicker, DateField, Field, Hint, PriorityStars } from '@/components/form';
import { PRIORITY_LABEL } from '@/lib/constants';
import { addDays, todayStr } from '@/lib/date';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import type { DateStr, Priority, Rotate } from '@/lib/types';

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
  /** null이면 `안 정함` */
  assigneeId: string | null;
  rotate: Rotate;
}

/** `안 정함`이 기본이고 맨 앞에 온다 — 담당자 줄과 같은 순서다 */
const ROTATE: { v: Rotate; label: string; why: string }[] = [
  { v: 'once', label: '안 정함', why: '이번만 그 사람이고 다음부터는 비어 있어요' },
  { v: 'same', label: '같은 사람', why: '다음에도 그 사람 차례가 돼요' },
  { v: 'rotate', label: '번갈아', why: '방에 들어온 순서대로 돌아가요' },
];

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
  const { categoryOf } = useStore();
  const { membersOf } = useRooms();
  // 이 카테고리가 방을 물고 있으면 그 방 사람들. 개인 카테고리면 빈 배열이라 줄이 안 뜬다.
  const roomId = categoryOf(value.categoryId).roomId;
  const people = roomId ? membersOf(roomId) : [];

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

      {/*
        담당자 줄은 공유 카테고리를 골랐을 때만 나온다.
        카테고리가 방을 물고 있어서 방을 따로 고를 일이 없고, 혼자 하는 일에는 줄이 아예 안 생긴다.
        고르는 순서가 곧 좁혀가는 순서다 — 어느 방인지 정하고, 그 방 누구인지 정한다.
      */}
      {people.length > 0 && (
        <Field label="누가 하나요">
          <div className="flex flex-wrap gap-1.5">
            {/* `아무나`가 아니라 `안 정함`이다 — 앱이 하나 골라주는 게 아니라 아무도 안 정한 것 */}
            <Pick on={!value.assigneeId} onClick={() => onChange({ assigneeId: null, rotate: 'once' })}>
              안 정함
            </Pick>
            {people.map((m) => (
              <Pick
                key={m.userId}
                on={value.assigneeId === m.userId}
                onClick={() => onChange({ assigneeId: m.userId })}
              >
                {m.displayName}
              </Pick>
            ))}
          </div>
        </Field>
      )}

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
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
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

      {/*
        주기가 있고 담당자를 사람으로 골랐을 때만 뜬다.
        `안 정함`으로 두면 넘길 차례가 없어 이 줄이 아예 안 생긴다.
        반복에 배정을 붙이면 교대가 된다 — 설거지 하루씩, 분리수거 한 주씩.
      */}
      {value.repeatDays > 0 && value.assigneeId && people.length > 0 && (
        <Field label="다음 회차는">
          <div className="flex flex-wrap gap-1.5">
            {ROTATE.map((r) => (
              <Pick key={r.v} on={value.rotate === r.v} onClick={() => onChange({ rotate: r.v })}>
                {r.label}
              </Pick>
            ))}
          </div>
          <p className="ml-1 mt-2 text-[11.5px] text-ink3">
            {ROTATE.find((r) => r.v === value.rotate)?.why}
          </p>
        </Field>
      )}

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

/** 담당자 칩만 코랄이다 — 카테고리에는 색이 있지만 **사람에게는 색이 없다** */
function Pick({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-3.5 py-[7px] text-[12.5px] font-medium transition-colors ${
        on ? 'bg-accent text-white' : 'bg-accent-tint text-accent'
      }`}
    >
      {children}
    </button>
  );
}
