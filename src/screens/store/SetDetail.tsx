'use client';

import { useState } from 'react';
import Coin from './Coin';
import { useGomdori } from '@/lib/gomdori';
import { GiftIcon } from '@/components/Icons';
import { BEAR_ART, ROOM_ART, ROOM_BOX } from '@/lib/stage';
import type { Costume, CostumeSet } from '@/lib/types';

/**
 * 세트 상세 — **곰과 방을 각각 산다.** 묶어 팔지 않는다.
 *
 * 묶어 팔면 낱개 값과 묶음 값 둘을 관리해야 하고,
 * 크리스마스 방만 갖고 싶은 사람이 곰까지 사게 된다.
 * **깎아주는 대신 하나 더 준다** — 둘을 다 모으면 포즈가 딸려온다.
 * 깎아주기는 산 다음에 남는 것이 없고 포즈는 남는다.
 */
export default function SetDetail({
  set,
  busy,
  onBuy,
  onWear,
}: {
  set: CostumeSet;
  busy: boolean;
  onBuy: (key: string) => Promise<void>;
  onWear: (key: string) => Promise<void>;
}) {
  const { has, wornBear } = useGomdori();
  const full = has(set.bear.key) && has(set.room.key);

  return (
    <>
      <div className="mb-3.5 mt-1.5 text-center">
        <b className="block font-round text-[22px] font-normal">{set.name}</b>
        <span className="mt-1 block text-[12.5px] text-ink3">{set.note}</span>
      </div>

      {/*
        홈과 같은 정사각 — 4:3이면 위 25%가 잘려 전등이 썰린다.

        **방만 세우지 않는다.** 세트는 곰과 방이 한 벌이라 방 한 장만 보여주면
        무엇을 사는 것인지가 안 보인다 — 홈 칸을 그대로 옮겨 곰돌이를 세운다.

        다 모았으면 **딸려온 포즈가 선다.** 받은 것이 어딘가 목록 안이 아니라
        제일 큰 칸에서 바로 보여야 다 모은 값이 난다.
      */}
      <div className={`${ROOM_BOX} mb-4 rounded-[18px] bg-sunk`}>
        <Art src={set.room.img} className={ROOM_ART} />
        <Art src={(full && set.pose.img) || set.bear.img} className={BEAR_ART} />
      </div>

      <p className="mb-2.5 text-center text-[12.5px] text-ink2">곰과 방을 따로 살 수 있어요</p>

      <div className="mb-2.5 grid grid-cols-2 gap-[9px]">
        <Half item={set.bear} kind="곰 스타일" busy={busy} onBuy={onBuy} onWear={onWear} />
        <Half item={set.room} kind="방 테마" busy={busy} onBuy={onBuy} onWear={onWear} />
      </div>

      {/*
        보상은 포즈다. 옷 위에 얹는 조각이 아니라 그 옷을 입고 소품까지 든 한 장이라
        적용하면 자세가 통째로 바뀐다.
      */}
      <div
        className={`mb-4 flex items-center gap-3 rounded-2xl p-3 ${
          full ? 'bg-accent-tint' : 'bg-sunk'
        }`}
      >
        <span className="grid h-[52px] w-[52px] flex-none place-items-center overflow-hidden rounded-[13px] bg-card text-cycle">
          {full && set.pose.img ? <Art src={set.pose.img} /> : <GiftIcon className="h-6 w-6" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cycle">
            <GiftIcon className="h-[11px] w-[11px]" />
            세트 완성 보상
          </span>
          <b className="my-px block text-[13px] font-medium">{set.pose.name}</b>
          <span className="block text-[10.5px] leading-[1.45] text-ink3">
            {set.name}를 모두 {full ? '모아서 받았어요' : '모으면 받을 수 있어요'}
          </span>
        </span>
        {full &&
          (wornBear === set.pose.key ? (
            <span className="flex-none rounded-full bg-accent-tint px-3 py-1.5 text-[11.5px] font-medium text-accent">
              적용 중
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void onWear(set.pose.key)}
              className="flex-none rounded-full bg-accent px-3 py-1.5 text-[11.5px] font-medium text-white"
            >
              적용
            </button>
          ))}
      </div>
    </>
  );
}

function Half({
  item,
  kind,
  busy,
  onBuy,
  onWear,
}: {
  item: Costume;
  kind: string;
  busy: boolean;
  onBuy: (key: string) => Promise<void>;
  onWear: (key: string) => Promise<void>;
}) {
  const { points, has, wornBear, wornRoom } = useGomdori();
  const own = has(item.key);
  const roomly = item.kind === 'room';
  const here = item.key === (roomly ? wornRoom : wornBear);
  const verb = roomly ? ['적용', '적용 중'] : ['입기', '입는 중'];
  const short = item.price - points;

  return (
    <div className="flex flex-col gap-[7px] rounded-2xl bg-card p-[9px] pb-2.5 text-center shadow-[0_0_0_1.4px_var(--line)]">
      <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-sunk">
        <Art src={item.img} cover={roomly} />
      </span>
      <span className="text-[9.5px] text-ink3">{kind}</span>
      <b className="text-[12.5px] font-medium">{item.name}</b>

      {here ? (
        <span className="mt-auto rounded-[11px] bg-accent-tint py-[9px] text-[12.5px] font-medium text-accent">
          {verb[1]}
        </span>
      ) : own ? (
        <button
          type="button"
          onClick={() => void onWear(item.key)}
          className="mt-auto rounded-[11px] bg-card py-[9px] text-[12.5px] font-medium text-accent shadow-[0_0_0_1.4px_var(--accent)]"
        >
          {verb[0]}
        </button>
      ) : short <= 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onBuy(item.key)}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-[11px] bg-accent py-[9px] text-[12.5px] font-medium text-white disabled:opacity-60"
        >
          <Coin className="!h-4 !w-4 !bg-white/35 !text-[9px]" />
          {item.price}
        </button>
      ) : (
        <span className="mt-auto rounded-[11px] bg-sunk py-[9px] text-[11px] text-ink3">
          {short}P 더 모으면
        </span>
      )}
    </div>
  );
}

/** `className`을 주면 그것을 쓴다 — 방 위에 곰돌이를 세우는 자리가 자를 따로 쥔다 */
function Art({ src, cover, className }: { src?: string; cover?: boolean; className?: string }) {
  const [gone, setGone] = useState(false);
  if (!src || gone) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setGone(true)}
      className={`select-none ${
        className ??
        (cover
          ? 'h-full w-full object-cover object-bottom'
          : 'h-auto max-h-full w-auto max-w-full')
      }`}
    />
  );
}
