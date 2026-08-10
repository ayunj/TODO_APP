'use client';

import PageBar from '@/components/PageBar';
import { PeopleIcon } from '@/components/Icons';
import { GoButton } from '@/components/form';
import { Group, Note, Row } from '@/components/rows';
import { tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
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
 */
export default function CategoryListScreen() {
  const { categories, tasks } = useStore();
  const { rooms } = useRooms();
  const { pushView } = useUi();

  const shared = categories.filter((c) => c.roomId).length;

  return (
    <>
      <PageBar title="카테고리" />

      <div className="mb-4">
        <Group>
          {categories.map((c) => {
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
        <Note>나눈 카테고리는 그 방 사람들과 함께 봅니다. 지운 것도 방 설정에 모여요.</Note>
      )}

      <div className="mt-4">
        <GoButton onClick={() => pushView({ kind: 'category', id: null })}>새 카테고리</GoButton>
      </div>
    </>
  );
}
