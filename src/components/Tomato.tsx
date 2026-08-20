/**
 * 손그림 토마토 — 앱이 지금 어떤 상태인지 그림으로 한 번 더 말한다.
 *
 * 원본은 컷 열 개가 든 시트 한 장(`assets/tomato-sheet.png`)이고,
 * `npm run tomato`가 잘라서 `public/tomato/*.png`로 넣는다.
 *
 * **글자를 대신하지 않는다.** 옆에 늘 같은 뜻의 문장이 있고 이건 거들기만 하므로
 * 읽어주는 기계에는 감춘다(aria-hidden). 그래서 alt도 비운다.
 *
 * 그림이 아직 안 잘렸어도 앱은 그대로 돌아야 한다 — 못 불러오면 조용히 사라진다.
 * (원본은 개인 그림이라 저장소에 없을 수 있다. 그때 깨진 그림이 뜨면 안 된다.)
 */
'use client';

import { useState } from 'react';

export type Pose =
  | 'empty' /* 할 일 없으면 — 엎드려 자는 것 */
  | 'busy' /* 할 일 많으면 — 종이 잔뜩, 땀 */
  | 'one' /* 하나 완료 — 눈 동그랗게 */
  | 'all' /* 전부 완료 — 만세 */
  | 'heart' /* 하트 안은 것 */
  | 'peek' /* 바닥에서 빼꼼 */
  | 'rest' /* 음료수 들고 앉은 것 */
  | 'run' /* 메모 들고 뛰는 것 */
  | 'cycle' /* 주기 도래 — 삽 들고 */
  | 'cheer'; /* 화이팅 */

export default function Tomato({
  pose,
  size = 96,
  className = '',
  fallback = null,
}: {
  pose: Pose;
  /** 긴 변 기준 높이(px). 컷마다 가로세로 비가 달라 높이만 맞추고 가로는 따라가게 둔다. */
  size?: number;
  className?: string;
  /** 못 불러왔을 때 대신 그릴 것. 빈 자리가 생기면 안 되는 곳에만 준다. */
  fallback?: React.ReactNode;
}) {
  const [gone, setGone] = useState(false);
  if (gone) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/tomato/${pose}.png`}
      alt=""
      aria-hidden="true"
      onError={() => setGone(true)}
      style={{ height: size }}
      className={`w-auto select-none object-contain ${className}`}
    />
  );
}
