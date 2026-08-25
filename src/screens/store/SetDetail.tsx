'use client';

import { useState } from 'react';
import Coin from './Coin';
import { useGomdori } from '@/lib/gomdori';
import { GiftIcon } from '@/components/Icons';
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

      <div className="mb-4 grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[18px] bg-sunk">
        <Art src={set.room.img} cover />
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

function Art({ src, cover }: { src?: string; cover?: boolean }) {
  const [gone, setGone] = useState(false);
  if (!src || gone) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setGone(true)}
      className={
        cover
          ? 'h-full w-full select-none object-cover'
          : 'h-auto max-h-[88%] w-auto max-w-[88%] select-none'
      }
    />
  );
}
