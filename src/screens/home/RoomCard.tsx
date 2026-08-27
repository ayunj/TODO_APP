'use client';

import { useState } from 'react';
import { CalendarIcon } from '@/components/Icons';
import { diffDays, todayStr } from '@/lib/date';
import { useGomdori } from '@/lib/gomdori';
import { BEAR_ART, ROOM_ART, ROOM_BOX } from '@/lib/stage';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { Task } from '@/lib/types';

/**
 * 곰돌이가 사는 칸.
 *
 * **방 그림과 곰돌이는 따로 얹는다.** 합쳐 그리면 옷을 못 갈아입힌다 —
 * 방은 칸을 통째로 덮고 곰돌이가 그 위에 선다.
 *
 * 서는 자리는 [stage.ts](../../lib/stage.ts)가 들고 있다 —
 * **상점 걸쳐보는 칸과 같은 값이어야 한다.**
 *
 * 오늘 숫자는 **그림 밖 아랫줄**에 앉는다. 그림 위에 얻으면
 * 모자를 쓴 곰돌이가 숫자를 덮는다 — 방 그림은 이제 오른쪽 위를 비울 이유가 없다.
 */
export default function RoomCard({ done, total }: { done: number; total: number }) {
  const { tasks } = useStore();
  const { item, wornBear, wornRoom } = useGomdori();
  const { setCursor, setTab } = useUi();
  const today = todayStr();
  const pct = total ? Math.round((done / total) * 100) : 0;

  // 곧 돌아오는 것 — 오늘 뒤에 서 있는 회차 중 제일 가까운 하나
  const next = tasks
    .filter((t) => !t.done && t.repeatDays > 0 && t.date > today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0] as Task | undefined;

  return (
    <section className="mb-[11px] overflow-hidden rounded-card bg-card shadow-card">
      {/*
        **내 옷장의 걸쳐보는 칸과 같은 자리다**([stage.ts](../../lib/stage.ts)).
        걸쳐본 대로 홈에 서지 않으면 걸쳐보는 뜻이 없다 —
        여기 따로 적어뒀다가 홈에서만 곰돌이가 훨씬 컸다.

        **크기는 여기가 더 크다.** 옷장 칸은 카드 폭의 80%로 한 뼘 작은데,
        묶이는 것은 비율이지 크기가 아니라 걸쳐본 대로 그대로 선다.
      */}
      <div className={`${ROOM_BOX} bg-sunk`}>
        <Art src={item(wornRoom).img} className={ROOM_ART} />
        <Art src={item(wornBear).img} className={BEAR_ART} />
      </div>

      {/* 오늘 숫자 — 그림 **아래** 줄이다 */}
      <div className="border-t border-line2 px-3.5 py-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold">오늘 할 일</h2>
          <div className="font-mono text-[26px] font-bold leading-none text-accent">
            {done} <em className="text-[15px] font-medium not-italic text-ink3">/ {total}</em>
          </div>
        </div>
        <span className="mt-[9px] block h-2 overflow-hidden rounded-full bg-track">
          <i
            className="block h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </span>
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
function Art({ src, className }: { src?: string; className: string }) {
  const [gone, setGone] = useState(false);
  if (!src || gone) return null;
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
