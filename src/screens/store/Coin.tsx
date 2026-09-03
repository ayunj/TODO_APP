/**
 * 포인트 동전 — **그려둔 것을 그대로 쓴다**(`assets/gomdori/coin.png`).
 *
 * 한때 글자 하나로 대신했다. 노란 동그라미에 `P` 한 자를 얹어서
 * `그림을 안 그려도 되는 자리`라고 적어뒀는데 — **동전은 이미 그려져 있었다**
 * (`design/g/ic-coin.png`). 시안에는 그 동전이 서 있고 앱에만 글자가 서 있었으니,
 * 같은 것을 두 모양으로 들고 있던 셈이다.
 *
 * **앱이 들고 나간다.** 로그인 전에도, 서버를 못 읽어도 떠야 하는 것이고
 * 4KB짜리라 통을 부르러 갈 까닭이 없다 — 기본 곰돌이·기본 룸과 같은 갈래다.
 *
 * 크기는 **부르는 쪽이 정한다.** 제목 줄 지갑은 19dp, 카드 알약은 14dp다.
 * 넘겨주는 `!h-`·`!w-`가 아래 기본값을 눌러 이긴다.
 */
export default function Coin({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/gomdori/coin.png"
      alt=""
      aria-hidden="true"
      className={`h-[19px] w-[19px] flex-none select-none object-contain ${className}`}
    />
  );
}
