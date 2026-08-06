'use client';

import EmptyBox from '@/components/EmptyBox';
import { dayOf, daysInMonth, monthKey, todayStr } from '@/lib/date';
import { habitRows } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { Task } from '@/lib/types';

/**
 * 한 달 격자. 행 = 되풀이하는 일 하나, 열 = 1일부터 말일까지.
 * "이번 달에 청소를 몇 번 했나"를 세는 게 아니라 흐름이 보이게 하는 것.
 *
 * 이름을 `반복 기록`으로 잡았다. 예전 `자주 하는 일`은 즐겨찾기(`자주 쓰는 일`)와
 * 한 음절 차이라 같은 걸 가리키는 줄 알기 쉬웠다 — 여기는 등록해둔 목록이 아니라 지나간 기록이다.
 */
export default function HabitGrid({ monthTasks }: { monthTasks: Task[] }) {
  const { presets, categoryOf, } = useStore();
  const { cursor, openSheet } = useUi();

  const days = daysInMonth(cursor);
  const rows = habitRows(monthTasks, presets, (id) => categoryOf(id).color);
  const today = todayStr();
  const todayDay = monthKey(today) === monthKey(cursor) ? dayOf(today) : 0;

  if (rows.length === 0) {
    return (
      <div className="mt-2.5">
        <EmptyBox title="아직 채운 칸이 없습니다">
          주기를 정한 할 일이나 즐겨찾기에 넣어둔 일이 이 달에 있으면, 하루씩 칸으로 칠해집니다.
        </EmptyBox>
      </div>
    );
  }

  return (
    <div className="mt-2.5 overflow-hidden rounded-card bg-card px-3 py-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <b className="text-[13.5px] font-medium text-ink2">반복 기록</b>
        <span className="flex items-center gap-[9px] text-[11.5px] text-ink3">
          <span className="inline-flex items-center gap-1">
            <i className="h-[9px] w-[9px] rounded-[3px] bg-ink3" />
            했음
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-[9px] w-[9px] rounded-[3px] bg-ink3 opacity-[.28]" />
            예정
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-[9px] w-[9px] rounded-[3px] bg-sunk" />
            없음
          </span>
        </span>
      </div>

      {/* 눈금과 칸이 같은 폭을 쓴다 — 제목은 위로 올려서 격자에서 폭을 빼앗지 않는다 */}
      <span
        className="mb-1 grid text-[10.5px] text-ink3"
        style={{ gridTemplateColumns: `repeat(${days},minmax(0,1fr))` }}
      >
        {Array.from({ length: days }, (_, i) => i + 1).map((n) => (
          <span key={n} className="row-start-1 text-center" style={{ gridColumn: n }}>
            {n % 5 === 0 || n === 1 ? n : ''}
          </span>
        ))}
      </span>

      {rows.map((r) => (
        <div key={r.title} className="py-2 [&+&]:border-t [&+&]:border-line2">
          <div className="mb-[7px] flex items-baseline gap-2">
            <button
              type="button"
              title={r.title}
              onClick={() => openSheet({ kind: 'task', id: r.sampleId })}
              className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[13.5px] text-ink2"
            >
              {r.title}
            </button>
            <span className="flex-none font-mono text-[12.5px] text-ink3">{r.count}</span>
          </div>

          {/*
            칸에 최소 높이를 주면 aspect-square를 타고 최소 너비로 번져서
            좁은 화면에서 격자가 화면 밖으로 밀려난다. minmax(0,1fr)로 줄어들게 둔다.
          */}
          <span
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${days},minmax(0,1fr))` }}
          >
            {Array.from({ length: days }, (_, i) => {
              const d = i + 1;
              const st = r.mark[d];
              return (
                <i
                  key={d}
                  className={`aspect-square rounded-[2px] bg-sunk ${
                    d === todayDay ? 'shadow-[0_0_0_1.5px_var(--ink2)]' : ''
                  }`}
                  style={
                    st === 'done'
                      ? { background: r.color }
                      : st === 'todo'
                        ? { background: r.color, opacity: 0.26 }
                        : undefined
                  }
                />
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
