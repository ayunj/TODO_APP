'use client';

import StoreCard from './StoreCard';
import { NextIcon } from '@/components/Icons';
import type { Costume } from '@/lib/types';

/**
 * 줄에 이만큼은 서야 한다. **셋뿐인 가로줄은 격자보다 초라하다** —
 * 밀 것도 없으면서 밀라고 잘라놓은 꼴이 된다.
 *
 * 빈 무더기를 안 세우는 규칙(`Group`)과 같은 뜻인데, 문턱만 다르다.
 * 격자는 하나만 있어도 한 줄이 차지만 가로줄은 안 찬다.
 */
export const RAIL_MIN = 4;

/**
 * 상점 메인의 가로줄 하나 — **머리 + 밀리는 칸들.**
 *
 * **`더보기`가 장식이 아니다.** 한 줄에 셋 반쯤 보이고 나머지는 밀어야 나오는데,
 * 안 미는 사람에게는 없는 물건이다. 세로 격자는 이 문제가 없었다(다 보였다) —
 * 가로줄은 **보여주는 대신 가리는 것**과 맞바꾸는 것이라, 가린 데로 가는 길을
 * 반드시 같이 둔다.
 *
 * **넷보다 적으면 통째로 안 선다.** 그 판단은 부르는 쪽에서 하지 않고 여기서 한다 —
 * 줄이 다섯 군데에서 서는데 문턱을 저마다 적어두면 한 곳만 빠뜨린다.
 */
export default function Rail({
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
  if (list.length < RAIL_MIN) return null;

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
          더보기
          <NextIcon className="h-[13px] w-[13px]" />
        </button>
      </div>

      {/*
        칸 폭이 격자와 같은 103px이다. **셋 반쯤 보인다** — 셋이 딱 맞게 보이면
        더 있는지 없는지 알 수가 없어서, 넷째가 반쯤 걸쳐야 밀어보게 된다.
      */}
      <div className="-mx-4 mb-[22px] flex gap-[9px] overflow-x-auto px-4 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((c) => (
          <div key={c.key} className="w-[103px] flex-none">
            <StoreCard item={c} onPick={() => onPick(c.key)} />
          </div>
        ))}
      </div>
    </>
  );
}
