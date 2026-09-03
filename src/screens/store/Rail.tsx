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
  rank,
  fresh,
  onPick,
  onMore,
}: {
  icon: React.ReactNode;
  title: string;
  list: Costume[];
  /** 등수 딱지를 붙이나 — **랭킹 줄에만.** 줄의 뜻이 차례라는 것을 칸마다 말해준다 */
  rank?: boolean;
  /** `NEW` 딱지를 붙이나 — **새로 들어왔어요 줄에만** */
  fresh?: boolean;
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
        **칸 폭을 세트 격자와 한 자로 맞춘다** — `(100% − 틈 둘) ÷ 3`.

        103px로 박아뒀다가 어긋났다. 폰에서는 마침 그 값이라 맞아 보였는데,
        **화면이 넓어지면 격자 칸만 따라 커지고 가로줄 칸은 103px에 머물렀다** —
        같은 카드가 위아래에서 크기가 달라지고, 이름이 들어갈 자리가 없어서
        `유치원 가는 날`이 `원 가는 날`로 잘렸다.

        `100%`는 미는 칸의 **보이는 폭**이라 격자와 같은 셈이 나온다.
        좌우 여백(`px-4`)이 미는 칸 안에 있어서 **넷째 칸이 살짝 걸친다** —
        셋이 딱 맞게 끝나면 더 있는지 없는지 알 수가 없다.

        **클래스가 아니라 `style`로 준다.** 테일윈드는 괄호가 겹친 임의값
        (`w-[calc((100%-18px)/3)]`)을 훑어 담지 못한다 — 클래스는 적혀 있는데
        **CSS가 안 만들어져서 폭이 조용히 안 잡힌다.** 안 만들어진 것은
        화면을 봐야 알 수 있으니, 만들어질 리 없는 자리는 아예 안 쓴다.
      */}
      <div className="-mx-4 mb-[22px] flex gap-[9px] overflow-x-auto px-4 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((c, i) => (
          <div key={c.key} className="flex-none" style={{ width: 'calc((100% - 18px) / 3)' }}>
            <StoreCard
              item={c}
              rank={rank ? i + 1 : undefined}
              fresh={fresh}
              onPick={() => onPick(c.key)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
