'use client';

import { useMemo } from 'react';
import ScrollRow from './ScrollRow';
import { BackIcon, PeopleIcon } from './Icons';
import { tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi, type Scope } from '@/lib/ui';
import type { Category } from '@/lib/types';

/** 나눈 한 자리 — 방마다 하나, 못 받아온 방 것은 한 덩이로 */
interface Bunch {
  key: Scope;
  name: string;
  /** 방 색. 못 받아온 방 덩이에는 색이 없다 */
  color: string | null;
  list: Category[];
}

/**
 * 헤더 아래 가로 스크롤 한 줄. 일·월·기록 세 화면이 같은 줄을 쓴다.
 *
 * **방 하나에 카테고리 하나**라 나눈 것은 방마다 칩 하나로 선다 — 이름도 색도 그 방 것이다.
 *
 * ```
 * [전체] [건강] [공부] │ [우리집 👥] [회사 👥]
 *    내 것              방마다 하나씩
 * ```
 *
 * **내 것은 접지 않는다.** `나만` 하나로 묶어 눌러 들어가게도 해봤는데,
 * 정작 늘 누르는 것이 내 카테고리라 한 번을 더 누르게 됐다. 밖에 그대로 편다.
 *
 * 한 방에 여럿을 올릴 수 있던 때가 있었다. 그때는 묶음마다 방 이름표를 세워야 했고,
 * 방이 둘이면 이름표가 되풀이돼 정작 누를 칩이 화면 밖으로 밀렸다.
 * **여럿 걸린 방은 지난 데이터에만 남아 있다** — 그때만 방 이름으로 서고,
 * 누르면 이 줄이 그 방 안으로 갈린다(`‹`로 나온다).
 *
 * **차례로 거르는 자리는 없다.** 사람마다 칩을 두는 줄도, `내 차례` 토글도 안 둔다 —
 * 누가 할 일인지는 할 일 줄의 차례 칩이 이미 말하고 있고,
 * 이 앱은 두 사람이 나눠 쓰는 자리라 걸러낼 만큼 목록이 길지 않다.
 */
export default function CategoryFilter() {
  const { categories } = useStore();
  const { rooms } = useRooms();
  const { scope, setScope, filter, setFilter } = useUi();

  // 아무 방에도 안 건 것 — 접지 않고 칩 그대로 편다
  const mine = useMemo(() => categories.filter((c) => !c.roomId), [categories]);

  const bunches = useMemo<Bunch[]>(() => {
    const out: Bunch[] = [];

    for (const r of rooms) {
      const list = categories.filter((c) => c.roomId === r.id);
      // 할 일을 안 나누는 방은 여기 아예 안 뜬다 — 고를 것이 없다
      if (!list.length) continue;
      out.push({ key: r.id, name: r.name, color: r.color, list });
    }

    // 아직 못 받아온 방에 걸린 것도 흘리지 않는다 — 마지막에 한 덩이로 붙인다
    const known = new Set(rooms.map((r) => r.id));
    const stray = categories.filter((c) => c.roomId && !known.has(c.roomId));
    if (stray.length) out.push({ key: 'stray', name: '공유', color: null, list: stray });

    return out;
  }, [categories, rooms]);

  const here = bunches.find((b) => b.key === scope) ?? null;
  /*
    카테고리가 하나뿐인 묶음에는 안 들어간다 — 칩만 켜지고 줄은 그대로다.
    `전체 / 건강` 둘을 나란히 두면 같은 것을 두 번 묻는 꼴이 된다.
  */
  const open = here && here.list.length > 1 ? here : null;

  const chip =
    'flex-none inline-flex items-center gap-1.5 rounded-full px-[15px] py-[7px] text-[12.5px] font-medium transition-colors';
  const accentChip = (on: boolean) =>
    on
      ? { background: 'var(--accent)', color: '#fff' }
      : { background: 'var(--accent-tint)', color: 'var(--accent)' };

  /** 안 가림으로 되돌린다. 나오는 것과 전체를 누르는 것이 같은 일이다. */
  const leave = () => setScope('all');

  return (
    <ScrollRow className="pb-[14px]" role="group" aria-label="카테고리 필터">
      <span className="flex items-center gap-2">
        {open ? (
          <>
            <button
              type="button"
              aria-label={`${open.name}에서 나가기`}
              onClick={leave}
              className="-ml-1 grid h-[30px] w-[30px] flex-none place-items-center rounded-full text-ink2 active:bg-sunk"
            >
              <BackIcon className="h-[18px] w-[18px]" />
            </button>
            {/* 어디에 들어와 있는지는 말만 한다 — 누를 것이 아니라 자리를 알리는 이름이다 */}
            <span
              className="flex flex-none items-center gap-1 text-[12px] font-medium"
              style={{ color: open.color ?? 'var(--ink2)' }}
            >
              {open.color && <PeopleIcon className="h-[13px] w-[13px]" />}
              {open.name}
            </span>
            <span className="mx-[3px] my-[5px] w-px flex-none self-stretch bg-line" />

            <button
              type="button"
              aria-pressed={!filter}
              onClick={() => setFilter(null)}
              className={chip}
              style={accentChip(!filter)}
            >
              전체
            </button>
            {open.list.map((c) => (
              <Chip
                key={c.id}
                category={c}
                on={filter === c.id}
                className={chip}
                onClick={() => setFilter(c.id)}
              />
            ))}
          </>
        ) : (
          <>
            <button
              type="button"
              aria-pressed={scope === 'all' && !filter}
              onClick={leave}
              className={chip}
              style={accentChip(scope === 'all' && !filter)}
            >
              전체
            </button>

            {/* 내 것은 그대로 편다 — 늘 누르는 것이 이쪽이라 한 겹 두면 한 번을 더 누른다 */}
            {mine.map((c) => (
              <Chip
                key={c.id}
                category={c}
                on={filter === c.id}
                className={chip}
                // 방 안에 들어와 있었다면 같이 나온다 — 내 것과 방 것을 한 번에 볼 일은 없다
                onClick={() => {
                  setScope('all');
                  setFilter(c.id);
                }}
              />
            ))}

            {/* 내 것과 나눈 것 사이에만 줄을 세운다. 한쪽이 없으면 가를 것도 없다. */}
            {mine.length > 0 && bunches.length > 0 && (
              <span className="mx-[3px] my-[5px] w-px flex-none self-stretch bg-line" />
            )}

            {/*
              나눈 칩은 **방 이름**으로 선다. 이 줄에서 고르는 건 어느 방 것을 볼까이고,
              무슨 일인지는 할 일 줄이 `● 집안일`로 이미 말한다.
              카테고리 이름으로도 세워봤는데(방 하나에 하나라 그래도 되긴 한다)
              **누구와 나누는 자리인지가 안 보였다.** 색도 방 색이라 이름과 어긋나지 않는다.
            */}
            {bunches.map((b) => {
              const on = scope === b.key && !filter;
              return (
                <button
                  key={b.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setScope(b.key)}
                  className={chip}
                  style={
                    b.color
                      ? on
                        ? { background: b.color, color: '#fff' }
                        : { background: tintOf(b.color), color: b.color }
                      : on
                        ? { background: 'var(--ink2)', color: '#fff' }
                        : { background: 'var(--sunk)', color: 'var(--ink2)' }
                  }
                >
                  {b.name}
                  <PeopleIcon className="h-[13px] w-[13px] opacity-75" />
                </button>
              );
            })}
          </>
        )}
      </span>
    </ScrollRow>
  );
}

/** 카테고리 칩 하나. 어느 방 것인지는 들어와 있는 자리가 이미 말한다. */
function Chip({
  category,
  on,
  className,
  onClick,
}: {
  category: Category;
  on: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={className}
      style={
        on
          ? { background: category.color, color: '#fff' }
          : { background: tintOf(category.color), color: category.color }
      }
    >
      {category.name}
    </button>
  );
}
