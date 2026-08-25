'use client';

import { useState } from 'react';
import { costumeOf } from '@/lib/costumes';

/**
 * 곰돌이가 서는 칸 — **방과 곰이 따로 얹힌다.**
 * 합쳐 그리면 옷을 못 갈아입힌다(발주서 1-2절).
 *
 * 그림이 아직 없는 옷이 많다. 못 불러오면 조용히 사라진다 —
 * 깨진 그림이 뜨는 자리를 만들지 않는다.
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
  return (
    <div className="relative grid h-[196px] w-full items-end justify-items-center overflow-hidden rounded-2xl bg-sunk">
      <Art src={costumeOf(room).img} className="absolute inset-0 h-full w-full object-cover" />
      <Art
        src={costumeOf(bear).img}
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
