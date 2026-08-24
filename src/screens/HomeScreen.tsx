'use client';

import { useMemo } from 'react';
import MiniPair from './home/MiniPair';
import RoomCard from './home/RoomCard';
import TodayList from './home/TodayList';
import WeekStrip from './home/WeekStrip';
import { todayStr } from '@/lib/date';
import { sortTasks, tasksOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';

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
    </>
  );
}
