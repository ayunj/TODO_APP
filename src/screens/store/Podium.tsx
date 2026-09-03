'use client';

import StoreCard from './StoreCard';
import { NextIcon } from '@/components/Icons';
import type { Costume } from '@/lib/types';

/** 시상대에 서는 것은 셋뿐이다. 넷째부터는 `전체보기`에 있다 */
export const PODIUM = 3;

/**
 * 랭킹 — **가로줄이 아니라 시상대다.**
 *
 * 다른 줄과 같은 가로줄로 세웠더니 1·2·3이 왼쪽부터 차례로 서기만 했다.
 * 그건 **목록이지 순위가 아니다** — 밀면 4등 5등이 똑같은 모양으로 이어져서
 * 차례가 있다는 것이 숫자 하나에만 걸려 있었다.
 *
 * 그래서 셋만 세우고 **가운데를 높인다.**
 *
 * ```
 *        ┌─────┐
 *  ┌───┐ │  1  │ ┌───┐
 *  │ 2 │ │     │ │ 3 │
 *  └───┘ └─────┘ └───┘
 * ```
 *
 * **차례가 2 · 1 · 3이다.** 왼쪽부터 1·2·3으로 두면 가운데가 2등인데 제일 크다 —
 * 시상대는 어디서나 가운데가 1등이라, 그 모양을 거스르면 크기와 숫자가 싸운다.
 *
 * **넷째부터는 안 세운다.** 시상대에 네 자리가 없다. 나머지는 `전체보기`가
 * 격자로 펼치고, 거기서는 메달 없이 숫자만 붙는다.
 */
export default function Podium({
  icon,
  title,
  list,
  onPick,
  onMore,
}: {
  icon: React.ReactNode;
  title: string;
  list: Costume[];
  onPick: (key: string) => void;
  onMore: () => void;
}) {
  /* 셋이 안 차면 시상대가 아니다 — 둘뿐인 시상대는 순위로 안 읽힌다 */
  if (list.length < PODIUM) return null;

  /** 세울 차례 — 2 · 1 · 3. 값은 `등수 - 1`이라 카드에 넘길 때 되돌린다 */
  const order = [1, 0, 2];

  return (
    <>
      <div className="mb-2.5 flex items-center gap-[7px]">
        <span className="flex-none text-cycle">{icon}</span>
        <b className="min-w-0 flex-1 truncate text-[14px] font-bold tracking-[-.01em]">{title}</b>
        <button
          type="button"
          onClick={onMore}
          className="flex flex-none items-center gap-px py-0.5 text-[11.5px] text-accent"
        >
          전체보기
          <NextIcon className="h-[13px] w-[13px]" />
        </button>
      </div>

      {/*
        **가운데가 넓고 양옆이 낮다.** 셋을 똑같이 세우면 색만 다른 세 칸이라
        `그래서 뭐가 1등인데`가 그림에서 안 읽힌다.

        `items-end`로 바닥을 맞춘다 — 위를 맞추면 가운데가 아래로 삐져나가서
        시상대가 아니라 **잘못 놓인 칸**으로 보인다.
      */}
      <div className="mb-[22px] grid grid-cols-[1fr_1.14fr_1fr] items-end gap-[7px]">
        {order.map((i) => (
          <StoreCard
            key={list[i].key}
            item={list[i]}
            rank={i + 1}
            onPick={() => onPick(list[i].key)}
          />
        ))}
      </div>
    </>
  );
}
