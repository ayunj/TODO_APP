/** 포인트 동전 — 글자 하나가 그림 노릇을 한다. 그림을 안 그려도 되는 자리다. */
export default function Coin({ className = '' }: { className?: string }) {
  return (
    <i
      className={`grid h-[19px] w-[19px] flex-none place-items-center rounded-full bg-star text-[11px] font-bold not-italic leading-none text-white ${className}`}
    >
      P
    </i>
  );
}
