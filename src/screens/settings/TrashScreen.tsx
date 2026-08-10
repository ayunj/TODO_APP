'use client';

import EmptyBox from '@/components/EmptyBox';
import PageBar from '@/components/PageBar';
import { tintOf } from '@/lib/constants';
import { whenDay } from '@/lib/date';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import type { Trashed, TrashScope } from '@/lib/types';

/**
 * 지운 것 — 30일.
 *
 * `누가 무엇을 했습니다`를 줄줄이 쌓는 화면은 안 만든다. 그건 감시가 된다.
 * 정말 필요한 순간은 하나뿐이다 — **"내가 적은 게 왜 없어졌지?"**
 *
 * 한데 모아 보여주는 화면도 없다. 찾는 사람은 **어디 것인지를 이미 알고** 찾는다.
 * 방 것은 여러 카테고리에 걸쳐 있어 한자리에 모으고, 내 카테고리 것은 그 카테고리에 둔다.
 */
export default function TrashScreen({ scope, id }: { scope: TrashScope; id: string }) {
  const { trash, restore, categoryOf } = useStore();
  const { account } = useAuth();
  const { rooms, membersOf } = useRooms();
  const { popView } = useUi();

  const room = scope === 'room' ? (rooms.find((r) => r.id === id) ?? null) : null;
  const people = scope === 'room' ? membersOf(id) : [];

  const rows = trash.filter((t) =>
    scope === 'room'
      ? t.roomId === id
      : // 개인 것만이다. 공유 카테고리에서 지운 것은 방 설정에 모인다.
        !t.roomId &&
        (scope === 'category'
          ? t.kind === 'task' && t.categoryId === id
          : t.kind === (scope === 'shop' ? 'shop' : 'memo')),
  );

  const where =
    scope === 'room'
      ? (room?.name ?? '방')
      : scope === 'category'
        ? categoryOf(id).name
        : scope === 'shop'
          ? '장보기'
          : '메모';

  const undo = (t: Trashed) => {
    restore(t.kind, t.id);
    toast(`${t.title} — 되돌렸어요`);
    // 마지막 한 줄을 되돌리면 빈 화면만 남는다 — 하던 일이 끝났으니 도로 나간다
    if (rows.length === 1) popView();
  };

  return (
    <>
      <PageBar
        title="지운 것"
        right={<span className="flex-none text-[11.5px] text-ink3">{where} · 30일</span>}
      />

      {rows.length === 0 ? (
        <EmptyBox title="비어 있습니다">30일 안에 지운 것이 여기 모여요.</EmptyBox>
      ) : (
        <ul className="flex list-none flex-col gap-[9px] p-0">
          {rows.map((t) => (
            <li
              key={`${t.kind}-${t.id}`}
              className="flex items-center gap-[11px] rounded-2xl bg-card px-[15px] py-[13px] shadow-card"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{t.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-ink3">
                  {/*
                    방 쪽에만 칩과 이름이 붙는다 — 거긴 여러 카테고리가 섞여 있으니 필요하다.
                    내 카테고리 쪽은 헤더가 이미 말하고 있어서 줄마다 또 적으면 도배가 된다.
                  */}
                  {scope === 'room' && <Chip row={t} />}
                  <span>
                    {scope === 'room' ? who(t, account?.id ?? null, people) : whenText(t.at)}
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => undo(t)}
                className="flex-none rounded-full bg-accent-tint px-3 py-[7px] text-[12px] font-medium text-accent active:scale-95"
              >
                되돌리기
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <p className="ml-1 mt-3 text-[11.5px] leading-[1.6] text-ink3">
          되돌리면 있던 자리로 그대로 돌아가요. 30일이 지나면 사라집니다.
        </p>
      )}
    </>
  );
}

/** 무엇이었는지 — 할 일은 제 카테고리 색으로, 장보기·메모는 이름 그대로 */
function Chip({ row }: { row: Trashed }) {
  const { categoryOf } = useStore();
  const base = 'inline-flex flex-none items-center rounded-full px-2 py-[2px] text-[11px] font-medium';

  if (row.kind !== 'task') {
    return <span className={`${base} bg-sunk text-ink2`}>{row.kind === 'shop' ? '장보기' : '메모'}</span>;
  }
  const c = categoryOf(row.categoryId ?? '');
  return (
    <span className={base} style={{ background: tintOf(c.color), color: c.color }}>
      {c.name}
    </span>
  );
}

/** '어제 지움' · '8월 3일에 지움' — 붙는 말이 날짜에 따라 갈린다 */
function whenText(at: string): string {
  const day = whenDay(at);
  return day === '오늘' || day === '어제' ? `${day} 지움` : `${day}에 지움`;
}

/** 방에서는 누가 지웠는지가 먼저다 — 내가 적은 게 왜 없어졌는지를 찾는 자리라서 */
function who(
  row: Trashed,
  me: string | null,
  members: { userId: string; displayName: string }[],
): string {
  const day = whenDay(row.at);
  if (!row.by) return `${day}에 지움`;
  if (row.by === me) return `내가 지움 · ${day}`;
  const name = members.find((m) => m.userId === row.by)?.displayName;
  return name ? `${name}가 지움 · ${day}` : `지움 · ${day}`;
}
