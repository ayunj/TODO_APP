'use client';

import { useMemo, useState } from 'react';
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
        상점 띠 — **그림 한 장에 단추만 얹는다.** 비율 3:1이고 띠 안의 글씨는 그림에 들어 있다.

        `main_costume.png`에서 비어 있는 칸이 가로 13~37%, 세로 50~78%다.
        왼쪽 12.5%까지는 화분, 37.5%부터는 곰돌이 러그라 이 안을 벗어나면 겹친다.
        글씨를 키우면 오른쪽으로 번져 러그를 먹으니 11px에 묶어둔다.

        **로그인해야 뜬다.** 포인트를 서버가 세서 로그인 안 하면 살 수가 없는데,
        못 누르는 줄을 흐리게 두면 계속 눌러보게 된다.
      */}
      {enabled && (
        <button
          type="button"
          onClick={() => pushView({ kind: 'store' })}
          aria-label="상점 바로가기"
          className="relative block aspect-[3/1] w-full overflow-hidden rounded-card bg-accent-tint shadow-card active:opacity-90"
        >
          <StoreBanner />
          <span className="absolute bottom-[12%] left-[13%] inline-flex items-center gap-1 rounded-full bg-accent px-[11px] py-1.5 text-[11px] font-medium text-white">
            바로가기 ›
          </span>
        </button>
      )}
    </>
  );
}

/**
 * 띠 그림. 못 불러오면 **글자가 대신 선다** —
 * 그림 안에 글씨가 들어 있어서 그림이 빠지면 무슨 자리인지 알 수가 없다.
 */
function StoreBanner() {
  const [gone, setGone] = useState(false);

  if (gone) {
    return (
      <span className="absolute left-[6%] right-[36%] top-[15%] text-left">
        <b className="mb-0.5 block text-[14px] font-bold">상점</b>
        <span className="text-[11px] leading-[1.4] text-ink3">
          귀여운 옷으로 곰돌이를 꾸며보세요
        </span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/gomdori/store-banner.png"
      alt=""
      aria-hidden="true"
      onError={() => setGone(true)}
      className="absolute inset-0 h-full w-full select-none object-cover"
    />
  );
}
