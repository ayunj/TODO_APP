'use client';

import { useEffect, useRef, useState } from 'react';
import { monthOf, dayOf, todayStr } from '@/lib/date';
import type { Memo } from '@/lib/types';

/** 접었을 때 보일 첫 줄. 없으면 빈 메모다. */
const firstLine = (text: string) => text.split('\n').find((l) => l.trim()) ?? '';
const restCount = (text: string) => text.split('\n').filter((l) => l.trim()).length - 1;

const when = (iso: string) => {
  const day = iso.slice(0, 10);
  if (day === todayStr()) return '오늘';
  return `${monthOf(day)}월 ${dayOf(day)}일`;
};

interface Props {
  memo: Memo;
  open: boolean;
  onOpen: () => void;
  onChange: (text: string) => void;
  onRemove: () => void;
}

export default function MemoCard({ memo, open, onOpen, onChange, onRemove }: Props) {
  const [text, setText] = useState(memo.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  // 적는 만큼 칸이 자란다 — 스크롤 안에 스크롤이 생기지 않게
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text, open]);

  if (!open) {
    const head = firstLine(memo.text);
    const more = restCount(memo.text);
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-card bg-card px-[18px] py-4 text-left shadow-card active:bg-sunk"
      >
        <span className={`block truncate text-[16px] ${head ? '' : 'text-ink3'}`}>
          {head || '빈 메모'}
        </span>
        <span className="mt-1 block text-[12.5px] text-ink3">
          {when(memo.updatedAt)}
          {more > 0 && ` · ${more}줄 더`}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-card bg-card px-[18px] py-4 shadow-card outline-2 [outline-offset:-2px] outline-accent focus-within:outline">
      <textarea
        ref={ref}
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={'예)\n관리비 계좌 000-00-000000 국민\n와이파이 비밀번호'}
        className="min-h-[7.5rem] w-full resize-none bg-transparent text-[16px] leading-[1.75] text-ink outline-none placeholder:leading-[1.9] placeholder:text-[var(--placeholder)]"
      />
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-line2 pt-2.5">
        <span className="text-[12.5px] text-ink3">적는 대로 저장돼요</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-[10px] px-2.5 py-1.5 text-[13px] text-ink3 active:bg-danger-soft active:text-high"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
