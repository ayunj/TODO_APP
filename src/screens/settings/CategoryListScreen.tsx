'use client';

import PageBar from '@/components/PageBar';
import { PeopleIcon } from '@/components/Icons';
import { GoButton } from '@/components/form';
import { Group, Note, Row } from '@/components/rows';
import { tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { myCategories } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 목록은 **들어가는 줄만** 늘어놓는다.
 * 고치기·지우기 버튼을 줄마다 달면 한 줄에 누를 곳이 셋이 된다 —
 * 손보는 일은 한 겹 안(카테고리 설정)에서 한다.
 *
 * 나눈 카테고리에는 **어느 방에 나눴는지를 여기서 붙인다.**
 * 안에 들어가야만 알 수 있으면, 왜 이 카테고리만 다르게 구는지를
 * (지운 것이 방 설정에 모이는 것 같은) 들어가 보고서야 알게 된다.
 *
 * **남이 연 방 카테고리는 여기 없다.** 그건 그 방을 연 사람 것이고,
 * 이름이나 색을 손대면 방 사람들 화면이 다 같이 바뀐다.
 * 손님 화면에 두면 "내 것을 고치는 자리"에 남의 것이 섞인다 —
 * 흐리게 눕혀두는 대신 아예 안 그린다.
 */
export default function CategoryListScreen() {
  const { categories, tasks } = useStore();
  const { rooms } = useRooms();
  const { pushView } = useUi();

  // 여기 오르는 것은 **내가 손볼 수 있는 것**뿐이다. 세는 규칙은 설정 첫 화면과 한 벌이다.
  const list = myCategories(categories, rooms);
  const shared = list.filter((c) => c.roomId).length;

  return (
    <>
      <PageBar title="카테고리" />

      <div className="mb-4">
        <Group>
          {list.map((c) => {
            const room = c.roomId ? (rooms.find((r) => r.id === c.roomId) ?? null) : null;
            return (
              <Row
                key={c.id}
                value={`${tasks.filter((t) => t.categoryId === c.id).length}개`}
                onClick={() => pushView({ kind: 'category', id: c.id })}
              >
                <span className="flex min-w-0 items-center gap-[9px]">
                  <span
                    className="h-[11px] w-[11px] flex-none rounded-full"
                    style={{ background: c.color }}
                  />
                  <span className="min-w-0 truncate">{c.name}</span>
                  {/* 방 색으로 칠한다 — 카테고리 점과 색이 달라서 딴 것이라는 게 먼저 읽힌다 */}
                  {room && (
                    <span
                      className="inline-flex flex-none items-center gap-1 rounded-full px-2 py-[3px] text-[11.5px] font-medium"
                      style={{ background: tintOf(room.color), color: room.color }}
                    >
                      <PeopleIcon className="h-[13px] w-[13px]" />
                      {room.name}에 나눔
                    </span>
                  )}
                </span>
              </Row>
            );
          })}
        </Group>
      </div>

      {shared > 0 && (
        <Note>나눈 카테고리는 그 방 사람들과 함께 봐요.</Note>
      )}

      <div className="mt-4">
        <GoButton onClick={() => pushView({ kind: 'category', id: null })}>새 카테고리</GoButton>
      </div>
    </>
  );
}
