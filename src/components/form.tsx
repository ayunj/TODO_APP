'use client';

import { useRef } from 'react';
import { CalendarIcon } from './Icons';
import { PALETTE, PRIORITY_LABEL } from '@/lib/constants';
import { longDate } from '@/lib/date';
import { useStore } from '@/lib/store';
import type { DateStr, Priority } from '@/lib/types';

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-2 block text-[13.5px] font-medium text-ink2">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <div className="-mt-1.5 mb-4 text-[12.5px] leading-[1.6] text-ink3">{children}</div>;
}

export function GoButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="mt-1 w-full rounded-2xl bg-accent p-4 text-[16px] font-medium text-white active:scale-[.99]"
    />
  );
}

export function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="mt-[9px] w-full rounded-2xl bg-danger-soft p-[15px] text-[15px] font-medium text-high"
    />
  );
}

/**
 * 날짜 입력.
 * 브라우저 로캘을 따르는 네이티브 표시(mm/dd/yyyy)를 덮고 연·월·일 순으로 직접 그린다.
 * 값이 없으면 형식 안내 없이 빈칸 — 안 정해도 되는 칸이라는 뜻이다.
 * 진짜 input은 투명하게 위에 겹쳐둔다. 달력은 네이티브 것을 그대로 쓴다.
 */
export function DateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: DateStr;
  onChange: (v: DateStr) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // 데스크톱에서는 달력 아이콘을 직접 눌러야만 열려서, 칸 아무 데나 눌러도 열리게 한다
  const openPicker = () => {
    const input = ref.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      /* 막는 브라우저에서는 네이티브 동작에 맡긴다 */
    }
  };

  return (
    <div className="field-input relative flex items-center justify-between gap-2 focus-within:outline focus-within:outline-2 focus-within:outline-accent">
      {/* 값이 없어도 칸 높이가 흔들리지 않게 빈 줄을 세워둔다 */}
      <span>{value ? longDate(value) : ' '}</span>
      <CalendarIcon className="h-[18px] w-[18px] flex-none text-ink3" />
      <input
        ref={ref}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className="absolute inset-0 h-full w-full cursor-pointer rounded-[14px] opacity-0"
      />
    </div>
  );
}

/** 카테고리는 하나만 고른다. 태그는 만들지 않는다. */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { categories } = useStore();
  return (
    <div className="flex flex-wrap gap-[7px]">
      {categories.map((c) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-[15px] py-2.5 text-[14px] shadow-card ${
              on ? 'bg-accent text-white' : 'bg-card text-ink2'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export function PriorityStars({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  return (
    <div className="flex gap-1">
      {([1, 2, 3] as Priority[]).map((p) => (
        <button
          key={p}
          type="button"
          aria-label={PRIORITY_LABEL[p]}
          onClick={() => onChange(p)}
          className={`p-0.5 text-[27px] leading-none ${p <= value ? 'text-star' : 'text-edge'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** 색은 자유 입력이 아니라 팔레트 10개 중에서 */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-[7px]">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          className="relative grid h-9 w-9 place-items-center rounded-full text-[16px] font-bold text-white"
          style={{ background: c }}
        >
          {c === value ? '✓' : ''}
        </button>
      ))}
    </div>
  );
}
