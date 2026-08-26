'use client';

/**
 * 파는 중인지 아닌지 — **올리자마자 팔지 않는다.** 여기서 켜야 상점에 뜬다.
 * 시안의 알약 스위치 그대로(38 × 22, 손잡이 16).
 */
export default function Switch({
  on,
  busy,
  onFlip,
}: {
  on: boolean;
  busy: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="파는 중"
      disabled={busy}
      onClick={onFlip}
      className={`relative h-[22px] w-[38px] flex-none rounded-full transition-colors disabled:opacity-50 ${
        on ? 'bg-accent' : 'bg-track'
      }`}
    >
      <i
        className={`absolute top-[3px] block h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(97,89,83,.2)] transition-[left] ${
          on ? 'left-[19px]' : 'left-[3px]'
        }`}
      />
    </button>
  );
}
