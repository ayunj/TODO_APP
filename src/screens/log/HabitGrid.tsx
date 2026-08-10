'use client';

import EmptyBox from '@/components/EmptyBox';
import { DOW, dowOf, todayStr } from '@/lib/date';
import { habitRows } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { DateStr, Task } from '@/lib/types';

/**
 * 반복 기록 격자. 행 = 되풀이하는 일 하나, 열 = 그 폭의 하루하루.
 * "이번 달에 청소를 몇 번 했나"를 세는 게 아니라 **흐름**이 보이게 하는 것.
 *
 * 그래서 **1~30 눈금을 안 그린다.** 숫자를 세려고 보는 화면이 아니다.
 * 오늘 칸만 테두리로 짚어주고, 날짜를 정확히 짚어야 하면 그날로 들어가면 된다.
 *
 * 주간은 칸이 커서 요일이 들어간다 — 그때만 머리에 요일을 단다.
 */
export default function HabitGrid({ spanTasks, days }: { spanTasks: Task[]; days: DateStr[] }) {
  const { presets, categoryOf } = useStore();

  const rows = habitRows(spanTasks, presets, (id) => categoryOf(id).color);
  const today = todayStr();
  // 칸이 일곱이면 요일이 들어갈 만큼 넓다
  const weekly = days.length === 7;

  if (rows.length === 0) {
    return (
      <div className="mt-2.5">
        <EmptyBox title="아직 채운 칸이 없습니다">
          주기를 정한 할 일이나 즐겨찾기에 넣어둔 일이 이 {weekly ? '주' : '달'}에 있으면, 하루씩
          칸으로 칠해집니다.
        </EmptyBox>
      </div>
    );
  }

  const cols = { gridTemplateColumns: `repeat(${days.length},minmax(0,1fr))` };

  return (
    <div className="mt-2.5 overflow-hidden rounded-card bg-card px-3 py-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <b className="text-[12.5px] font-medium text-ink2">반복 기록</b>
        <span className="flex items-center gap-[9px] text-[10.5px] text-ink3">
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

      {/* 주간에만 요일을 단다. 월간은 칸이 좁아 글자가 안 들어간다. */}
      {weekly && (
        <span className="mb-1.5 grid text-[10.5px]" style={cols}>
          {days.map((d) => {
            const w = dowOf(d);
            return (
              <span key={d} className={`text-center ${w === 0 ? 'text-high' : 'text-ink3'}`}>
                {DOW[w]}
              </span>
            );
          })}
        </span>
      )}

      {rows.map((r) => (
        <div key={r.title} className="py-2 [&+&]:border-t [&+&]:border-line2">
          <div className="mb-[7px] flex items-baseline gap-2">
            {/*
              누르면 아무 일도 없다. 여기는 지나간 날들을 훑어보는 자리다.
              제목을 누르면 어느 회차 하나가 열렸는데, 어느 날 것인지 알 수 없어
              고치고 나면 격자의 어느 칸이 바뀐 건지 모른다. 고치려면 그 날로 들어가면 된다.
            */}
            <span
              title={r.title}
              className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[12.5px] text-ink2"
            >
              {r.title}
            </span>
            <span className="flex-none font-mono text-[11.5px] text-ink3">{r.count}</span>
          </div>

          {/*
            칸에 최소 높이를 주면 aspect-square를 타고 최소 너비로 번져서
            좁은 화면에서 격자가 화면 밖으로 밀려난다. minmax(0,1fr)로 줄어들게 둔다.
          */}
          <span className={`grid ${weekly ? 'gap-1' : 'gap-0.5'}`} style={cols}>
            {days.map((d) => {
              const st = r.mark[d];
              return (
                <i
                  key={d}
                  className={`aspect-square bg-sunk ${weekly ? 'rounded-[5px]' : 'rounded-[2px]'} ${
                    d === today ? 'shadow-[0_0_0_1.5px_var(--ink2)]' : ''
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
