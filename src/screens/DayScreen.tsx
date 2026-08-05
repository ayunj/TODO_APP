'use client';

import { useMemo } from 'react';
import ProgressStrip from './day/ProgressStrip';
import PostponeRow from './day/PostponeRow';
import PresetChips from './day/PresetChips';
import TaskRow from './day/TaskRow';
import StaleSection from './day/StaleSection';
import EmptyBox from '@/components/EmptyBox';
import { todayStr } from '@/lib/date';
import { sortTasks, tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 일별 — 진행 스트립 / 자주 쓰는 일 칩 / 목록 / 지난 미완료 */
export default function DayScreen() {
  const { tasks, categoryOf } = useStore();
  const { cursor, filter, openSheet } = useUi();
  const today = todayStr();

  const { open, shut, total } = useMemo(() => {
    const all = tasksOn(tasks, cursor, filter);
    return {
      open: sortTasks(all.filter((t) => !t.done)),
      shut: all.filter((t) => t.done),
      total: all.length,
    };
  }, [tasks, cursor, filter]);

  return (
    <>
      {total > 0 && <ProgressStrip done={shut.length} total={total} />}

      <PresetChips />

      {total === 0 ? (
        <EmptyBox
          title={
            filter
              ? `${categoryOf(filter).name} 할 일이 없습니다`
              : cursor === today
                ? '오늘은 아직 비어 있습니다'
                : '이 날은 비어 있습니다'
          }
        >
          위 칩을 누르거나 아래 버튼으로 추가하세요.
        </EmptyBox>
      ) : (
        <>
          {open.length > 0 ? (
            <ul className="flex list-none flex-col gap-[9px] p-0">
              {open.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          ) : (
            <EmptyBox title="다 끝났습니다">{total}개 전부 완료했어요.</EmptyBox>
          )}

          {/* 완료한 것은 숨기지 않는다. 아래로 내리고 취소선만 긋는다. */}
          {shut.length > 0 && (
            <>
              <div className="mb-2.5 mt-[22px] text-[12px] font-medium text-ink3">
                완료 {shut.length}
              </div>
              <ul className="flex list-none flex-col gap-[9px] p-0">
                {shut.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {open.length > 0 && <PostponeRow tasks={open} from={cursor} />}

      <button
        type="button"
        onClick={() => openSheet({ kind: 'task', id: null })}
        className="mt-[11px] w-full rounded-card border-[1.5px] border-dashed border-edge p-[15px] text-[13.5px] font-medium text-accent active:bg-accent-soft"
      >
        + 새 할 일 추가하기
      </button>

      {cursor === today && <StaleSection />}
    </>
  );
}
