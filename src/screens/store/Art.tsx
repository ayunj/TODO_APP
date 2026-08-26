'use client';

import { useState } from 'react';
import { builtinImg } from '@/lib/costumes';

/**
 * 상점 그림 한 장 — **올린 것이 먼저, 안 되면 앱이 가진 것.**
 *
 * 값표의 `img`가 채워지면 앱은 Storage에 올린 그림을 본다. 그런데 그 둘이
 * **어긋나 있는 동안**이 있다 —
 *
 *   * SQL을 먼저 돌리고 파일을 아직 안 올렸을 때
 *   * 통 정책을 손보다 잠깐 막아뒀을 때
 *   * 관리자가 값표에는 넣고 그림은 내일 올릴 때
 *
 * 그 사이에 상점을 열면 **칸이 통째로 빈다.** 그게 `아직 안 올렸어요`로 안 읽히고
 * 고장으로 읽힌다 — 우리가 스물아홉 줄을 걷어낸 것과 같은 까닭이다.
 *
 * 그래서 **한 번 더 물러선다.** 올린 그림이 안 뜨면 앱이 갖고 나온 그림을 세우고,
 * 그것도 없으면 그때 조용히 사라진다. 깨진 그림 아이콘이 뜨는 자리는 안 만든다.
 *
 * 열쇠로 찾는 것이라 **`item.img`가 아니라 `item.key`를 받는다** —
 * 물러설 곳이 어디인지는 주소가 아니라 열쇠가 안다.
 */
export default function Art({
  item,
  className,
}: {
  item: { key: string; img?: string };
  className: string;
}) {
  /** 몇 번째 그림을 보고 있나 — 안 뜰 때마다 하나씩 물러선다 */
  const [step, setStep] = useState(0);

  /*
    **같은 주소를 두 번 안 넣는다.** 올린 것과 앱이 가진 것이 같은 주소면
    물러설 데가 없는데, 그대로 두면 안 뜰 때마다 같은 것을 다시 불러 무한히 돈다.
  */
  const tries = [item.img, builtinImg(item.key)].filter(
    (src, i, all): src is string => Boolean(src) && all.indexOf(src) === i,
  );

  const src = tries[step];
  // 다 물러섰으면 조용히 사라진다 — 깨진 그림 아이콘이 뜨는 자리는 안 만든다
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setStep((s) => s + 1)}
      className={`select-none ${className}`}
    />
  );
}
