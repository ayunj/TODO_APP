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
 */
export default function StoreCard({
  item,
  bear,
  label,
  step,
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
  /** 세트가 셋 중 몇 개 모였나 — 값 대신 이걸 적는다 */
  step?: number;
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
  const verb = roomly || item.kind === 'pose' ? ['적용', '적용 중'] : ['입기', '입는 중'];

  return (
    <button
      type="button"
      onClick={onPick}
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl bg-card px-[7px] pb-2.5 pt-[9px] text-center active:scale-[.97] ${
        trying ? 'shadow-[0_0_0_2px_var(--accent)]' : 'shadow-[0_0_0_1.4px_var(--line)]'
      }`}
    >
      <span className="w-full truncate text-[11.5px] font-medium leading-[1.3] text-ink2">
        {label ?? item.name}
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
        <span
          className={`rounded-full px-3 py-1 text-[10.5px] font-medium ${
            here ? 'bg-accent text-white' : 'bg-card text-accent shadow-[0_0_0_1.3px_var(--accent-soft)]'
          }`}
        >
          {here ? verb[1] : verb[0]}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-card py-1 pl-[5px] pr-2.5 font-mono text-[10.5px] font-medium text-ink2 shadow-[0_0_0_1.2px_var(--line)]">
          <Coin className="!h-[14px] !w-[14px] !text-[8.5px]" />
          {item.price}
        </span>
      )}
    </button>
  );
}
