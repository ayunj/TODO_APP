'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import ScrollRow from './ScrollRow';
import { PeopleIcon } from './Icons';
import { tintOf } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 헤더 아래 가로 스크롤. 세 화면 모두에 적용된다.
 *
 * 공유 카테고리를 고르면 **그 밑에서 사람 줄이 열린다.**
 * 배정만으로는 안 쓰인다 — 거를 수 있어야 이름표가 아니라 기능이 된다.
 * 그렇다고 사람 칩을 늘 띄우면 혼자 쓰는 날에도 자리를 먹는다.
 */
export default function CategoryFilter() {
  const { categories } = useStore();
  const { account } = useAuth();
  const { membersOf } = useRooms();
  const { filter, setFilter, who, setWho } = useUi();

  const picked = categories.find((c) => c.id === filter) ?? null;
  const people = picked?.roomId ? membersOf(picked.roomId) : [];

  // 고른 칩의 가운데를 재둔다 — 사람 줄을 그 밑에 놓으면 어디 딸린 줄인지가 위치만으로 보인다
  const chips = useRef(new Map<string, HTMLButtonElement>());
  const [center, setCenter] = useState(0);

  useLayoutEffect(() => {
    if (!filter || people.length === 0) return;
    const el = chips.current.get(filter);
    if (el) setCenter(Math.max(0, el.offsetLeft + el.offsetWidth / 2 - 30));
  }, [filter, people.length, categories]);

  const chip =
    'flex-none inline-flex items-center gap-1.5 rounded-full px-[15px] py-[7px] text-[12.5px] font-medium transition-colors';

  return (
    /*
      두 줄을 **같은 가로 스크롤 칸**에 담는다.
      따로 두면 칩 줄을 옆으로 밀 때 아래 줄만 제자리에 남아 어긋난다.
    */
    <ScrollRow className="pb-[14px]" role="group" aria-label="카테고리 필터">
      <span className="flex flex-col gap-2">
        <span className="flex gap-2">
          <button
            type="button"
            aria-pressed={!filter}
            onClick={() => setFilter(null)}
            className={chip}
            style={
              !filter
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--accent-tint)', color: 'var(--accent)' }
            }
          >
            전체
          </button>
          {categories.map((c) => {
            const on = filter === c.id;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  if (el) chips.current.set(c.id, el);
                  else chips.current.delete(c.id);
                }}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(c.id)}
                className={chip}
                style={
                  on
                    ? { background: c.color, color: '#fff' }
                    : { background: tintOf(c.color), color: c.color }
                }
              >
                {c.name}
                {c.roomId && <PeopleIcon className="h-[13px] w-[13px] opacity-75" />}
              </button>
            );
          })}
        </span>

        {/*
          한 톤 작게 그린다. 구분선은 위 줄과 같은 뜻이다 —
          왼쪽이 `전체`, 오른쪽부터 사람.
          `전체`나 개인 카테고리를 고르면 닫힌다. 방마다 사람이 다르니 한 줄에 섞을 수 없다.
        */}
        {people.length > 0 && (
          <span className="flex gap-1.5" style={{ marginLeft: center }}>
            <Who on={!who} onClick={() => setWho(null)}>
              전체
            </Who>
            <span className="my-[3px] w-px flex-none bg-line2" />
            {people.map((m) => (
              <Who key={m.userId} on={who === m.userId} onClick={() => setWho(m.userId)}>
                {m.userId === account?.id ? '나' : m.displayName}
              </Who>
            ))}
          </span>
        )}
      </span>
    </ScrollRow>
  );
}

/** 사람 칩은 코랄이다 — 카테고리에는 색이 있지만 사람에게는 없다 */
function Who({
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
      className={`flex-none rounded-full px-3 py-[5px] text-[11.5px] font-medium transition-colors ${
        on ? 'bg-accent text-white' : 'bg-accent-tint text-accent'
      }`}
    >
      {children}
    </button>
  );
}
