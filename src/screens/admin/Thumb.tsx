'use client';

import { useState } from 'react';
import { BEAR_CARD } from '@/lib/stage';
import type { Costume } from '@/lib/types';

/**
 * 목록의 작은 그림.
 *
 * **자르는 규칙이 종류마다 다르다** — 곰은 위 여백을 잘라 칸을 채우고(`BEAR_CARD`),
 * 방은 칸을 꽉 채운다(`object-fit: cover`, 아래를 맞춰). 상점 격자와 **같은 것을 본다** —
 * 여기서 본 칸이 상점에서 그대로 서야 올리고 나서 확인하러 가는 왕복이 안 생긴다.
 *
 * 아직 안 올린 것은 **`없음`이라고 적는다.** 빈 칸으로 두면 그림이 없는 건지
 * 안 불러온 건지 구별이 안 된다.
 */
export default function Thumb({
  item,
  src,
  className = '',
}: {
  item: Costume;
  /** 막 고른 그림을 미리 볼 때 — 이게 있으면 이걸 먼저 쓴다 */
  src?: string;
  className?: string;
}) {
  const [gone, setGone] = useState(false);
  /*
    **자리를 여기서 짓지 않는다.** `pullShop`이 지어 넣어준 것을 쓴다 —
    거기서는 주소 끝에 `?v=<고친 때>`를 붙이는데, 여기서 다시 지으면 그 판이 빠져서
    다시 올린 그림이 이 칸에서만 옛것으로 뜬다.
  */
  const url = src ?? item.img;
  const roomly = item.kind === 'room';

  return (
    <span
      className={`relative grid place-items-center overflow-hidden rounded-[11px] bg-sunk ${className}`}
    >
      {url && !gone ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          aria-hidden="true"
          onError={() => setGone(true)}
          className={roomly ? 'h-full w-full object-cover object-bottom' : BEAR_CARD}
        />
      ) : (
        <em className="text-[9.5px] not-italic text-ink3">없음</em>
      )}
    </span>
  );
}
