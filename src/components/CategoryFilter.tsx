'use client';

import { useMemo } from 'react';
import ScrollRow from './ScrollRow';
import { BackIcon, PeopleIcon } from './Icons';
import { tintOf } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi, type Scope } from '@/lib/ui';
import type { Category } from '@/lib/types';

/** 한 묶음 — 내 것 하나, 방마다 하나, 못 받아온 방 것 한 덩이 */
interface Bunch {
  key: Scope;
  name: string;
  /** 방 색. 내 것에는 색이 없다 */
  color: string | null;
  list: Category[];
  /** 나 말고 사람이 있는 방인가 — `내 차례`가 뜰 자리 */
  shared: boolean;
}

/**
 * 헤더 아래 가로 스크롤 한 줄. 일·월·기록 세 화면이 같은 줄을 쓴다.
 *
 * **줄이 쌓이지 않고 바뀐다.** 평소엔 묶음(전체·나만·방들)만 보이고,
 * 묶음을 누르면 그 줄이 그 안의 카테고리로 갈린다. `‹`로 나온다.
 *
 * 전에는 한 줄에 카테고리를 다 늘어놓고 묶음마다 이름표를 세웠는데,
 * 방이 둘이면 이름표가 되풀이돼 정작 누를 칩이 화면 밖으로 밀렸다.
 * 두 줄로 늘리는 대신 한 줄이 안팎으로 오가게 했다 —
 * **좁히자고 화면이 두꺼워지는 건 거꾸로다.**
 *
 * 사람마다 거르는 줄은 없앴다. 실제로 쓰는 건 `내 차례` 하나뿐이었고,
 * 남의 차례만 골라 보는 건 감시에 가깝다.
 */
export default function CategoryFilter() {
  const { categories } = useStore();
  const { account } = useAuth();
  const { rooms, membersOf } = useRooms();
  const { scope, setScope, filter, setFilter, who, setWho } = useUi();

  const bunches = useMemo<Bunch[]>(() => {
    const out: Bunch[] = [];
    const mine = categories.filter((c) => !c.roomId);
    if (mine.length) out.push({ key: 'mine', name: '나만', color: null, list: mine, shared: false });

    for (const r of rooms) {
      const list = categories.filter((c) => c.roomId === r.id);
      // 할 일을 안 나누는 방은 여기 아예 안 뜬다 — 고를 것이 없다
      if (!list.length) continue;
      out.push({
        key: r.id,
        name: r.name,
        color: r.color,
        list,
        shared: membersOf(r.id).length > 1,
      });
    }

    // 아직 못 받아온 방에 걸린 것도 흘리지 않는다 — 마지막에 한 덩이로 붙인다
    const known = new Set(rooms.map((r) => r.id));
    const stray = categories.filter((c) => c.roomId && !known.has(c.roomId));
    if (stray.length)
      out.push({ key: 'stray', name: '공유', color: null, list: stray, shared: false });

    return out;
  }, [categories, rooms, membersOf]);

  const here = bunches.find((b) => b.key === scope) ?? null;
  /*
    들어가 봤자 고를 게 없는 묶음에는 안 들어간다 — 칩만 켜지고 줄은 그대로다.
    카테고리가 하나뿐이고 혼자 쓰는 방이 그렇다. `전체 / 건강` 둘을 나란히 두면
    같은 것을 두 번 묻는 꼴이 된다.
  */
  const open = here && (here.list.length > 1 || here.shared) ? here : null;
  // 묶음이 내 것 하나뿐이면 접을 것이 없다 — 혼자 쓰는 사람에게는 예전 그대로 한 줄이다
  const flat = bunches.length === 1 && bunches[0].key === 'mine';
  // 내 것과 방 사이에만 줄을 세운다. 내 것이 없으면 가를 것도 없다.
  const firstRoom = bunches.findIndex((b) => b.key !== 'mine');

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

            {/* 카테고리는 둘 이상일 때만 고를 값이 있다 */}
            {open.list.length > 1 && (
              <>
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
            )}

            {/* 나 말고 사람이 있는 방에서만. 혼자 하는 일에는 차례가 없다. */}
            {open.shared && account && (
              <>
                {open.list.length > 1 && (
                  <span className="mx-[3px] my-[5px] w-px flex-none self-stretch bg-line" />
                )}
                <button
                  type="button"
                  aria-pressed={Boolean(who)}
                  onClick={() => setWho(who ? null : account.id)}
                  className={chip}
                  style={accentChip(Boolean(who))}
                >
                  내 차례
                </button>
              </>
            )}
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

            {flat
              ? // 방이 없으면 묶음을 물을 것도 없다. 내 카테고리를 그냥 펼쳐둔다.
                bunches[0].list.map((c) => (
                  <Chip
                    key={c.id}
                    category={c}
                    on={filter === c.id}
                    className={chip}
                    onClick={() => setFilter(c.id)}
                  />
                ))
              : bunches.map((b, i) => (
                  <span key={b.key} className="flex flex-none items-center gap-2">
                    {/* 나만과 방 사이만 가른다 — 앞엣것은 자리가 아니라 보는 눈이다 */}
                    {i === firstRoom && firstRoom > 0 && (
                      <span className="mx-[3px] my-[5px] w-px flex-none self-stretch bg-line" />
                    )}
                    <button
                      type="button"
                      aria-pressed={scope === b.key}
                      onClick={() => setScope(b.key)}
                      className={chip}
                      style={
                        b.color
                          ? scope === b.key
                            ? { background: b.color, color: '#fff' }
                            : { background: tintOf(b.color), color: b.color }
                          : scope === b.key
                            ? { background: 'var(--ink2)', color: '#fff' }
                            : { background: 'var(--sunk)', color: 'var(--ink2)' }
                      }
                    >
                      {b.name}
                      {b.color && <PeopleIcon className="h-[13px] w-[13px] opacity-75" />}
                    </button>
                  </span>
                ))}
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
