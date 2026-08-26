'use client';

import Art from './Art';
import { useGomdori } from '@/lib/gomdori';

/**
 * 곰돌이가 서는 칸 — **방과 곰이 따로 얹힌다.**
 * 합쳐 그리면 옷을 못 갈아입힌다(발주서 1-2절).
 *
 * 그림은 [Art](Art.tsx)가 세운다 — **올린 것이 먼저, 안 되면 앱이 가진 것.**
 * 둘 다 안 되면 조용히 사라진다. 깨진 그림이 뜨는 자리를 만들지 않는다.
 *
 * **그림은 상점에서 찾는다.** 앱에 박혀 나온 목록에서 찾으면
 * 나중에 올린 옷이 여기서만 기본 곰돌이로 선다.
 *
 * **칸이 정사각이다 — 방 그림을 안 자른다.**
 *
 * 전에는 328×196으로 납작해서 정사각 방 그림의 40%가 잘려 나갔다. 아래를 맞춰 잘라
 * 바닥은 살렸지만, 방 그림은 **위쪽에 전등과 선반이 있다.** 무엇을 자르든 뭔가가
 * 반쯤 썰려서 잘린 게 아니라 고장 난 것으로 읽혔다.
 *
 * **홈과 같은 비율로 뒀다** — 카드 폭을 통째로 쓰는 정사각(360 폰에서 328×328).
 * 걸쳐보는 자리와 실제로 서는 자리가 **같은 칸**이어야 걸쳐본 대로 홈에 선다.
 * 칸이 132px 높아지는 대신 아무것도 안 잘리고, 곰돌이도 커진다(74%가 145 → 243px).
 * 그림 규격도 `정사각 한 장` 한 줄로 끝난다.
 *
 * `object-bottom`은 그대로 둔다 — 관리자가 정사각이 아닌 그림을 올렸을 때
 * 잘리는 쪽이 바닥이 아니라 천장이어야 한다.
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
    <div className="relative grid aspect-square w-full items-end justify-items-center overflow-hidden rounded-2xl bg-sunk">
      <Art item={item(room)} className="absolute inset-0 h-full w-full object-cover object-bottom" />
      <Art
        item={item(bear)}
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
