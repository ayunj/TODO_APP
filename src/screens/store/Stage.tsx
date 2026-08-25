'use client';

import { useState } from 'react';
import { useGomdori } from '@/lib/gomdori';

/**
 * 곰돌이가 서는 칸 — **방과 곰이 따로 얹힌다.**
 * 합쳐 그리면 옷을 못 갈아입힌다(발주서 1-2절).
 *
 * 그림이 아직 없는 옷이 많다. 못 불러오면 조용히 사라진다 —
 * 깨진 그림이 뜨는 자리를 만들지 않는다.
 *
 * **그림은 상점에서 찾는다.** 앱에 박혀 나온 목록에서 찾으면
 * 나중에 올린 옷이 여기서만 기본 곰돌이로 선다.
 *
 * **방은 아래를 맞춰 자른다**(`object-bottom`). 이 칸이 328×196으로 제일 납작해서
 * 정사각 방 그림의 40%가 잘려 나가는데, 가운데를 기준으로 자르면 위아래 20%씩 없어진다.
 * 바닥선이 아래에서 18~22% 자리라 **그 20%가 바닥을 통째로 먹는다** —
 * 곰돌이가 바닥 없이 벽에 붙어 선다. 아래를 맞추면 잘리는 건 벽과 천장뿐이다.
 */
export default function Stage({
  bear,
  room,
  flag,
}: {
  bear: string;
  room: string;
  flag?: string;
}) {
  const { item } = useGomdori();
  return (
    <div className="relative grid h-[196px] w-full items-end justify-items-center overflow-hidden rounded-2xl bg-sunk">
      <Art src={item(room).img} className="absolute inset-0 h-full w-full object-cover object-bottom" />
      <Art
        src={item(bear).img}
        className="relative z-[1] mb-[6%] block h-auto max-h-[74%] w-auto max-w-[46%]"
      />
      {flag && (
        <span className="absolute left-3 top-3 z-[2] rounded-full bg-card px-3 py-[5px] text-[11.5px] font-medium text-ink2 shadow-card">
          {flag}
        </span>
      )}
    </div>
  );
}

function Art({ src, className }: { src?: string; className: string }) {
  const [gone, setGone] = useState(false);
  if (!src || gone) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setGone(true)}
      className={`select-none ${className}`}
    />
  );
}
