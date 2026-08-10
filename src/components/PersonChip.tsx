'use client';

/**
 * 사람 칩 — `누가 하나요`와 `누가 했나요`가 같은 모양을 쓴다.
 *
 * **담당자 칩만 코랄이다.** 카테고리에는 색이 있지만 사람에게는 없다.
 * 앞에 작은 배지로 누구인지 한 글자 — 나면 `나`, 아니면 이름 첫 글자다.
 */
export default function PersonChip({
  name,
  me,
  on,
  onClick,
}: {
  name: string;
  /** 나인지 — 배지에 이름 대신 `나`가 찍힌다 */
  me?: boolean;
  on: boolean;
  onClick: () => void;
}) {
  const mark = me ? '나' : (name.trim()[0] ?? '?');

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-[7px] rounded-full py-[7px] pl-[7px] pr-3.5 text-[12.5px] font-medium transition-colors ${
        on ? 'bg-accent text-white' : 'bg-accent-tint text-accent'
      }`}
    >
      <span
        className={`grid h-[19px] w-[19px] flex-none place-items-center rounded-full text-[10.5px] font-semibold ${
          on ? 'bg-white/25 text-white' : 'bg-accent-soft text-accent'
        }`}
      >
        {mark}
      </span>
      {name}
    </button>
  );
}
