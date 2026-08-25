'use client';

import { useMemo } from 'react';
import MiniPair from './home/MiniPair';
import RoomCard from './home/RoomCard';
import TodayList from './home/TodayList';
import WeekStrip from './home/WeekStrip';
import { todayStr } from '@/lib/date';
import { useGomdori } from '@/lib/gomdori';
import { sortTasks, tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 홈 — 곰돌이가 사는 자리이자 하루를 훑는 자리.
 *
 * **여기는 늘 오늘이다.** 날짜를 넘기지 않는다 — 넘기는 화면은 일·월·기록 셋이고,
 * 홈까지 날짜를 물면 어느 날을 보는 중인지 네 자리에서 헷갈린다.
 *
 * **카테고리 필터도 안 탄다.** 걸러진 숫자를 곰돌이 위에 얹으면
 * `오늘 2/5`가 사람마다 다른 뜻이 된다.
 */
export default function HomeScreen() {
  const { tasks } = useStore();
  const { enabled } = useGomdori();
  const { pushView } = useUi();
  const today = todayStr();

  const { open, shut, total } = useMemo(() => {
    const all = tasksOn(tasks, today, null);
    return {
      open: sortTasks(all.filter((t) => !t.done)),
      shut: all.filter((t) => t.done),
      total: all.length,
    };
  }, [tasks, today]);

  return (
    <>
      <RoomCard done={shut.length} total={total} />
      <WeekStrip left={open.length} />
      <TodayList open={open} shut={shut} />
      <MiniPair />

      {/*
        상점으로 가는 길은 이 띠 하나뿐이다. 상단에 아이콘을 또 두지 않는다 —
        장보기·메모는 하루에도 몇 번씩 열지만 상점은 포인트가 모였을 때 가끔 여는 자리다.

        **로그인해야 뜬다.** 포인트를 서버가 세서 로그인 안 하면 살 수가 없는데,
        못 누르는 줄을 흐리게 두면 계속 눌러보게 된다.
      */}
      {enabled && (
        <button
          type="button"
          onClick={() => pushView({ kind: 'store' })}
          className="flex w-full items-center gap-3 rounded-card bg-accent-tint px-4 py-[15px] text-left active:opacity-80"
        >
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-bold text-ink">상점</b>
            <span className="text-[11.5px] text-ink3">곰돌이에게 옷을 입혀보세요</span>
          </span>
          <span className="flex-none rounded-full bg-accent px-3 py-1.5 text-[11.5px] font-medium text-white">
            바로가기 ›
          </span>
        </button>
      )}
    </>
  );
}
