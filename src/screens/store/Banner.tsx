'use client';

import { useState } from 'react';
import type { CostumeSet } from '@/lib/types';

/**
 * 상점 맨 위 한 장 — **관리자가 올린 사진이 통째로 깔린다.**
 *
 * **앱은 그 위에 아무것도 안 얹는다.** 제목도 부제도 이미 그림 안에 그려져
 * 있어서(시안 `design/상점-메인.html`), 앱이 또 얹으면 같은 말이 두 번 적힌다.
 * 세트 이름이 가격표와 그림 두 군데에 있게 되는 것도 같은 이야기다 —
 * 홈의 상점 띠가 그림에 `Dodo`를 구워두고 앱은 `곰돌이`라고 부르던 그 자리다.
 *
 * **가로 2:1이다.** 328dp 폭에서 164dp로 서고, 원본은 1080 × 540을 권한다 —
 * 그보다 크게 그리면 폰에서 잉크가 남고, 그림 속 글씨가 5px로 줄어 안 읽힌다.
 *
 * 누르면 그 세트 상세로 들어간다. **갈 곳이 그것 하나뿐이라** 어디로 갈지를
 * 가격표에 물어볼 것이 없다.
 *
 * **못 뜨면 통째로 사라진다.** 가격표에는 올린 때가 찍혔는데 통이 아직 빈
 * 그 사이가 있고(올리는 길이 두 걸음이다), 그때 깨진 그림이 뜨면
 * `안 올렸어요`가 아니라 고장으로 읽힌다.
 */
export default function Banner({ set, onOpen }: { set: CostumeSet; onOpen: () => void }) {
  const [gone, setGone] = useState(false);
  if (!set.banner || gone) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-5 block aspect-[2/1] w-full overflow-hidden rounded-[20px] bg-sunk shadow-card active:scale-[.99]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={set.banner}
        alt={set.name}
        onError={() => setGone(true)}
        className="h-full w-full select-none object-cover"
      />
    </button>
  );
}
