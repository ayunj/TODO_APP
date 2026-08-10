'use client';

import { useEffect, useRef, useState } from 'react';
import { bandOf } from '@/lib/constants';
import { whenDay } from '@/lib/date';
import type { Memo, Room } from '@/lib/types';

interface Props {
  memo: Memo;
  open: boolean;
  /** 이 메모가 걸린 방들 (걸린 순서대로) */
  rooms: Room[];
  /** 내가 본 뒤에 남이 고쳤나 — 점 하나로만 말한다 */
  unread: boolean;
  /** 남이 고쳤으면 그 이름. 내가 고친 것이면 null */
  by: string | null;
  onOpen: () => void;
  onChange: (text: string) => void;
  onShare: () => void;
  onRemove: () => void;
}

/** 접었을 때 보일 첫 줄. 없으면 빈 메모다. */
const firstLine = (text: string) => text.split('\n').find((l) => l.trim()) ?? '';

/**
 * 메모 한 장.
 *
 * 접히면 **두 줄까지** 보이고 넘치면 잘린다 — `3줄 더` 같은 말은 안 붙인다.
 * 잘린 자리가 곧 "더 있다"는 말이라서, 세어 적으면 같은 말을 두 번 하는 셈이다.
 * 접힘에서 아낀 자리는 펼침에서 쓴다.
 */
export default function MemoCard({
  memo,
  open,
  rooms,
  unread,
  by,
  onOpen,
  onChange,
  onShare,
  onRemove,
}: Props) {
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
    return (
      <button
        type="button"
        onClick={onOpen}
        className="relative w-full rounded-card bg-card px-[18px] py-4 text-left shadow-card active:bg-sunk"
      >
        {/* 내가 본 뒤에 남이 고친 것에만 점이 뜬다. 열면 사라진다. */}
        {unread && (
          <span className="absolute right-4 top-[15px] h-[7px] w-[7px] rounded-full bg-accent" />
        )}
        <span
          className={`block text-[15px] leading-[1.5] [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden ${
            head ? '' : 'text-ink3'
          } ${unread ? 'pr-4' : ''}`}
        >
          {memo.text.trim() || '빈 메모'}
        </span>
        <span className="mt-1.5 flex items-center gap-2 text-[11.5px] text-ink3">
          <span>{whenDay(memo.updatedAt)}</span>
          {/* 칩은 두 개까지. 나머지는 작게 +N — 줄이 칩으로 덮이면 무슨 메모인지가 안 보인다 */}
          {rooms.length > 0 && (
            <span className="ml-auto flex flex-none items-center gap-[5px]">
              {rooms.slice(0, 2).map((r) => (
                <RoomPill key={r.id} room={r} />
              ))}
              {rooms.length > 2 && (
                <span className="text-[10px] text-ink3">+{rooms.length - 2}</span>
              )}
            </span>
          )}
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
        className="min-h-[7.5rem] w-full resize-none bg-transparent text-[15px] leading-[1.75] text-ink outline-none placeholder:leading-[1.9] placeholder:text-[var(--placeholder)]"
      />

      {/* 펼치면 걸린 방이 다 보인다 — 접혔을 때 아낀 자리를 여기서 쓴다 */}
      {rooms.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-[5px]">
          {rooms.map((r) => (
            <RoomPill key={r.id} room={r} />
          ))}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2 border-t border-line2 pt-2.5">
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink3">
          {by ? (
            <>
              <b className="font-medium text-accent">{by}가 고침</b> · {whenDay(memo.updatedAt)}
            </>
          ) : (
            '적는 대로 저장돼요'
          )}
        </span>
        <button
          type="button"
          onClick={onShare}
          className="flex-none rounded-[10px] px-2.5 py-1.5 text-[12px] font-medium text-accent active:bg-accent-tint"
        >
          같이 보기
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex-none rounded-[10px] px-2.5 py-1.5 text-[12px] text-ink3 active:bg-danger-soft active:text-high"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/** 방 이름표 — 방 색을 옅게 깔고 글씨는 검게. 여러 개가 붙어도 눈이 안 아프다. */
function RoomPill({ room }: { room: Room }) {
  return (
    <span
      className="inline-flex flex-none items-center rounded-full px-[9px] py-[2.5px] text-[10.5px] font-medium text-ink"
      style={{ background: bandOf(room.color) }}
    >
      {room.name}
    </span>
  );
}
