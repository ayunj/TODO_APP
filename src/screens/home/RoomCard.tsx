'use client';

import { useState } from 'react';
import { CalendarIcon } from '@/components/Icons';
import { diffDays, todayStr } from '@/lib/date';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { Task } from '@/lib/types';

/**
 * 곰돌이가 사는 칸.
 *
 * **방 그림과 곰돌이는 따로 얹는다.** 합쳐 그리면 옷을 못 갈아입힌다 —
 * 방은 칸을 통째로 덮고 곰돌이가 그 위에 선다.
 *
 * 오늘 숫자는 **그림 위 오른쪽**에 앉는다. 그래서 방 그림은 그 자리를 비워둬야 한다
 * (`design/g/그릴-것.md`의 1-2절).
 */
export default function RoomCard({ done, total }: { done: number; total: number }) {
  const { tasks } = useStore();
  const { setCursor, setTab } = useUi();
  const today = todayStr();
  const pct = total ? Math.round((done / total) * 100) : 0;

  // 곧 돌아오는 것 — 오늘 뒤에 서 있는 회차 중 제일 가까운 하나
  const next = tasks
    .filter((t) => !t.done && t.repeatDays > 0 && t.date > today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0] as Task | undefined;

  return (
    <section className="mb-[11px] overflow-hidden rounded-card bg-card shadow-card">
      <div className="relative grid aspect-square w-full place-items-end justify-center overflow-hidden bg-sunk">
        <Art src="/gomdori/room.png" className="absolute inset-0 h-full w-full object-cover" />
        {/*
          가로·세로를 **둘 다** 묶는다. 한쪽만 묶으면 그림 비가 바뀔 때 칸을 뚫는다.
        */}
        <Art
          src="/gomdori/front.png"
          className="relative z-[1] mb-[7%] block h-auto max-h-full w-auto max-w-[62%]"
        />

        <div className="absolute right-[15px] top-3.5 z-[3] w-[44%] text-right">
          <h2 className="mb-1 text-[13px] font-bold">오늘 할 일</h2>
          <div className="font-mono text-[34px] font-bold leading-none text-accent">
            {done} <em className="text-[16px] font-medium not-italic text-ink3">/ {total}</em>
          </div>
          <span className="mt-[9px] block h-2 overflow-hidden rounded-full bg-track">
            <i
              className="block h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </div>

      {/* 주기가 언제 돌아오는지 — 없으면 줄째로 안 뜬다 */}
      {next && (
        <button
          type="button"
          onClick={() => {
            setCursor(next.date);
            setTab('day');
          }}
          className="flex w-full items-center gap-2.5 border-t border-line2 px-3.5 py-3 text-left active:bg-sunk"
        >
          <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-accent-tint text-cycle">
            <CalendarIcon className="h-[17px] w-[17px]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[12.5px] font-medium text-ink2">곧 돌아오는 할 일</b>
            <span className="text-[12px] text-ink3">
              {next.title} · <i className="not-italic text-cycle">{diffDays(today, next.date)}일 뒤</i>
            </span>
          </span>
          <span className="flex-none text-[16px] text-faint">›</span>
        </button>
      )}
    </section>
  );
}

/** 그림이 아직 없어도 앱은 그대로 돈다 — 못 불러오면 조용히 사라진다 */
function Art({ src, className }: { src: string; className: string }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setGone(true)}
      className={`select-none ${className}`}
    />
  );
}
