'use client';

import Art from './Art';
import Coin from './Coin';
import { useGomdori } from '@/lib/gomdori';
import { GiftIcon, LockIcon } from '@/components/Icons';
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
  label,
  step,
  trying,
  onPick,
}: {
  item: Costume;
  /** 세트 카드는 방 그림에 세트 이름을 단다 */
  label?: string;
  /** 세트가 셋 중 몇 개 모였나 — 값 대신 이걸 적는다 */
  step?: number;
  trying?: boolean;
  onPick: () => void;
}) {
  const { points, has, wornBear, wornRoom } = useGomdori();
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

      <span className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-sunk">
        {/* 방과 세트는 칸을 꽉 채운다 — 장면 전체가 그 물건이다 */}
        <Art
          item={item}
          className={
            roomly
              ? 'h-full w-full object-cover object-bottom'
              : 'h-auto max-h-[88%] w-auto max-w-[88%]'
          }
        />
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
