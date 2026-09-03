'use client';

import Art from './Art';
import Coin from './Coin';
import { useGomdori } from '@/lib/gomdori';
import { GiftIcon, LockIcon } from '@/components/Icons';
import { BEAR_ART, BEAR_CARD, ROOM_ART } from '@/lib/stage';
import type { Costume } from '@/lib/types';

/**
 * 카드는 **고르는 자리**다. 아래 알약은 상태를 말할 뿐 그 자체로 눌리지 않는다 —
 * 103px 안에 누를 곳이 둘이면 잘못 눌러 포인트가 날아간다.
 *
 * **못 사는 것도 그림은 그대로 보여준다.** 무엇인지 가려두면 뭘 모으는지
 * 모르는 채로 모으게 된다. 자물쇠 하나만 얹는다.
 *
 * **알약이 칸마다 다르다.** 상점에서는 `보유중` 아니면 가격이고,
 * 내 옷장에서만 `입기`가 뜬다 — 입어보는 것은 옷장에서만 하기 때문이다
 * ([BuySheet](../../sheets/BuySheet.tsx)).
 */
/**
 * 메달이 붙는 카드 바탕 — **1·2·3만 다르게 칠한다.**
 *
 * 메달 그림만 얹으면 셋이 다 흰 카드라, 눈이 먼저 닿는 것이 카드고 메달은
 * 그 위의 작은 표로 읽힌다. **바탕까지 금·은·동이면 카드째로 등수**가 된다.
 *
 * 그림은 [`npm run medals`](../../../scripts/medals.mjs)가 한 장에서 잘라 담는다.
 * 파일 이름이 곧 등수라 여기 표를 또 만들지 않는다 — `medal-1.png`.
 */
const TINT: Record<number, string> = {
  1: 'bg-[#fdf6e4]',
  2: 'bg-[#f2f4f6]',
  3: 'bg-[#fbeee5]',
};

export default function StoreCard({
  item,
  bear,
  label,
  step,
  mine,
  rank,
  fresh,
  trying,
  onPick,
}: {
  item: Costume;
  /**
   * 세트 카드는 **방 위에 곰돌이가 선다.** 이것이 오면 장면 한 칸으로 그린다 —
   * 세트는 곰과 방이 한 벌이라 방만 세우면 무엇을 사는 것인지가 안 보인다.
   */
  bear?: Costume;
  /** 세트 카드는 방 그림에 세트 이름을 단다 */
  label?: string;
  /** 세트가 셋 중 몇 개 모였나 — 가격 대신 이걸 적는다 */
  step?: number;
  /**
   * 내 옷장 칸인가. **입기는 여기서만 뜬다** — 상점 칸은 `보유중`이나 가격을 적는다.
   * 상점에서 입히면 안 산 옷을 걸쳐보다 사게 되고, 그러면 상점이
   * 사는 자리인지 입어보는 자리인지가 흐려진다.
   */
  mine?: boolean;
  /**
   * 몇 등인가 — **랭킹 격자에서만 붙는다.**
   * 가격이 서던 자리가 아니라 **왼쪽 위 딱지**로 얹는다. 알약을 등수로 갈아치우면
   * 가격이 안 보여서, 1등이 얼만지 보려고 눌러 열어봐야 한다.
   */
  rank?: number;
  /**
   * 새로 들어온 것인가 — **`새로 들어왔어요` 줄에서만 붙는다.**
   * 등수와 **같은 자리를 나눠 쓴다.** 둘이 한 카드에 같이 뜰 일이 없어서
   * (줄이 다르다) 자리를 둘로 벌리지 않는다.
   */
  fresh?: boolean;
  trying?: boolean;
  onPick: () => void;
}) {
  const { points, has, wornBear, wornRoom } = useGomdori();
  /** 방 위에 곰돌이가 선 한 칸 — 세트 카드다 */
  const scene = Boolean(bear);
  const own = has(item.key);
  const roomly = item.kind === 'room';
  const here = item.key === (roomly ? wornRoom : wornBear);
  const lock = step === undefined && !own && item.price > points;
  /**
   * 1·2·3만 메달이다. **넷째부터는 숫자만 붙는다** —
   * 금·은·동은 셋뿐이라 넷째에 칠할 색이 없고, 억지로 칠하면 그게 몇 등인지가
   * 색으로 안 읽힌다. 시상대에는 셋만 서고, 나머지는 `전체보기` 격자에 선다.
   */
  const tint = rank === undefined ? undefined : TINT[rank];
  const verb = roomly || item.kind === 'pose' ? ['적용', '적용 중'] : ['입기', '입는 중'];

  return (
    <button
      type="button"
      onClick={onPick}
      /*
        **`w-full`이 있어야 한다.** `<button>`은 폭을 안 주면 **속에 든 글자만큼만**
        벌어진다(shrink-to-fit). 격자에서는 칸이 늘려줘서 여태 티가 안 났는데,
        가로줄에 세우자마자 **이름이 긴 카드가 넓고 짧은 카드가 좁아졌다** —
        칸이 정사각이라 폭이 다르면 높이도 달라져서 한 줄이 들쭉날쭉해진다.
      */
      className={`relative flex w-full flex-col items-center gap-1.5 rounded-2xl px-[7px] pb-2.5 pt-[9px] text-center active:scale-[.97] ${
        tint ?? 'bg-card'
      } ${trying ? 'shadow-[0_0_0_2px_var(--accent)]' : 'shadow-[0_0_0_1.4px_var(--line)]'}`}
    >
      {/*
        메달은 **카드 모서리에 걸린다.** 안에 넣으면 이름이나 그림 중 하나를
        밀어내는데, 셋뿐인 자리라 밖으로 반쯤 내미는 편이 덜 다친다.
      */}
      {rank !== undefined &&
        (tint ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/gomdori/medal-${rank}.png`}
            alt=""
            aria-hidden="true"
            className="absolute -left-2 -top-2.5 z-[3] h-[38px] w-auto select-none drop-shadow-[0_2px_4px_rgba(97,89,83,.25)]"
          />
        ) : (
          /* 넷째부터는 숫자만 — 금·은·동은 셋뿐이라 넷째에 칠할 색이 없다 */
          <span className="absolute -left-1.5 -top-1.5 z-[3] grid h-[24px] w-[24px] place-items-center rounded-full bg-card font-mono text-[11px] font-bold leading-none text-ink3 shadow-[0_0_0_1.5px_var(--line)]">
            {rank}
          </span>
        ))}
      {/*
        **딱지는 이름 옆에 선다.** 이름 위에 절대 자리로 띄웠더니
        `유치원 가는 날`이 `원 가는 날`이 됐다 — 겹치는 대신 **밀어낸다.**
        밀려난 만큼 이름이 줄지만, 줄어든 이름은 `…`으로 줄었다고 말이라도 한다.
      */}
      <span className="flex w-full items-center justify-center gap-1">
        {fresh && rank === undefined && (
          <b className="flex-none rounded-full bg-accent px-[6px] py-px font-mono text-[8.5px] font-bold tracking-[.04em] text-white">
            NEW
          </b>
        )}
        <span className="min-w-0 truncate text-[11.5px] font-medium leading-[1.3] text-ink2">
          {label ?? item.name}
        </span>
      </span>

      {/*
        세트는 **홈 칸을 그대로 줄인 것**이라 곰돌이를 세로 아래에 맞춰 세운다.
        가운데에 두면 곰돌이가 바닥에서 뜬 채로 방 한가운데 붕 뜬다.
      */}
      <span
        className={`relative grid aspect-square w-full overflow-hidden rounded-xl bg-sunk ${
          scene ? 'items-end justify-items-center' : 'place-items-center'
        }`}
      >
        {/* 방과 세트는 칸을 꽉 채운다 — 장면 전체가 그 물건이다 */}
        <Art item={item} className={roomly || scene ? ROOM_ART : BEAR_CARD} />

        {/*
          **여기서는 안 자른다.** 곰돌이 한 마리만 있는 칸은 위 여백을 잘라 키우지만
          (`BEAR_CARD`), 세트는 방에 견준 크기가 그 자체로 볼 것이라
          홈·걸쳐보는 칸과 같은 자를 쓴다.
        */}
        {bear && <Art item={bear} className={BEAR_ART} />}
        {/* 세트 보상 표 — **딱지가 붙는 줄에는 포즈가 안 선다**(살 수 있는 것만 세운다) */}
        {item.kind === 'pose' && (
          <span className="absolute left-[3px] top-[3px] grid h-[19px] w-[19px] place-items-center rounded-full bg-white/90 text-cycle">
            <GiftIcon className="h-3 w-3" />
          </span>
        )}
        {lock && (
          <span className="absolute right-[3px] top-[3px] grid h-[19px] w-[19px] place-items-center rounded-full bg-white/90 text-ink3">
            <LockIcon className="h-3 w-3" />
          </span>
        )}
      </span>

      {step !== undefined ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium ${
            step === 3 ? 'bg-accent text-white' : 'bg-sunk text-ink2'
          }`}
        >
          <GiftIcon className="h-[11px] w-[11px]" />
          {step}/3
        </span>
      ) : own ? (
        mine ? (
          <span
            className={`rounded-full px-3 py-1 text-[10.5px] font-medium ${
              here
                ? 'bg-accent text-white'
                : 'bg-card text-accent shadow-[0_0_0_1.3px_var(--accent-soft)]'
            }`}
          >
            {here ? verb[1] : verb[0]}
          </span>
        ) : (
          /* 가격이 섰던 자리에 가격 대신 이 한 마디가 선다 — 눌러도 다시 안 산다는 뜻이다 */
          <span className="rounded-full bg-sunk px-3 py-1 text-[10.5px] font-medium text-ink3">
            보유중
          </span>
        )
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-card py-1 pl-[5px] pr-2.5 font-mono text-[10.5px] font-medium text-ink2 shadow-[0_0_0_1.2px_var(--line)]">
          <Coin className="!h-[14px] !w-[14px]" />
          {item.price}
        </span>
      )}
    </button>
  );
}
