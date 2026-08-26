'use client';

import { useState } from 'react';
import { shopPath } from '@/lib/costumes';
import { shopImageUrl } from '@/lib/supabase';
import type { Costume, ShopFamily } from '@/lib/types';

/**
 * 목록의 작은 그림.
 *
 * **자르는 규칙이 종류마다 다르다** — 곰은 칸 안에 84%로 앉고, 방은 칸을 꽉 채운다
 * (`object-fit: cover`, 아래를 맞춰). 상점에서 그렇게 서니 여기서도 그렇게 보여야
 * 올리고 나서 상점에 들어가 확인하는 왕복이 안 생긴다.
 *
 * 아직 안 올린 것은 **`없음`이라고 적는다.** 빈 칸으로 두면 그림이 없는 건지
 * 안 불러온 건지 구별이 안 된다.
 */
export default function Thumb({
  item,
  families,
  src,
  className = '',
}: {
  item: Costume;
  /** 없으면 물건에 이미 실린 주소를 쓴다 */
  families?: ShopFamily[];
  /** 막 고른 그림을 미리 볼 때 — 이게 있으면 이걸 먼저 쓴다 */
  src?: string;
  className?: string;
}) {
  const [gone, setGone] = useState(false);
  const at = families ? shopPath(item, families) : undefined;
  const url = src ?? item.img ?? (at ? shopImageUrl(at) : undefined);
  const roomly = item.kind === 'room';

  return (
    <span
      className={`grid place-items-center overflow-hidden rounded-[11px] bg-sunk ${className}`}
    >
      {url && !gone ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          aria-hidden="true"
          onError={() => setGone(true)}
          className={
            roomly ? 'h-full w-full object-cover object-bottom' : 'max-h-[84%] max-w-[84%]'
          }
        />
      ) : (
        <em className="text-[9.5px] not-italic text-ink3">없음</em>
      )}
    </span>
  );
}
