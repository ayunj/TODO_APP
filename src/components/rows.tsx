'use client';

/**
 * 설정 갈래가 쓰는 줄들.
 *
 * 규칙 하나가 관통한다 — **못 누르는 줄은 흐리게 두지 않고 아예 안 만든다.**
 * 회색으로 눕혀두면 "언젠가 눌리는 것"으로 보여서 계속 눌러보게 된다.
 * 그래서 `onClick`이 없으면 화살표도 안 그린다.
 */

const CARD =
  'flex w-full items-center gap-2.5 rounded-2xl bg-card px-[15px] py-4 text-left text-[14.5px] shadow-card';

/** 줄 묶음. 묶음 위에 작은 이름을 단다. */
export function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <>
      {label && <p className="mb-2 ml-1 mt-[18px] text-[12px] text-ink2 first:mt-0">{label}</p>}
      <div className="flex flex-col gap-[9px]">{children}</div>
    </>
  );
}

interface RowProps {
  children: React.ReactNode;
  /** 오른쪽에 붙는 회색 값 */
  value?: React.ReactNode;
  onClick?: () => void;
  /** 지우거나 끝내는 줄 */
  danger?: boolean;
  /** 안으로 들어가는 줄이 아니라 그 자리에서 끝나는 줄이면 화살표를 끈다 */
  arrow?: boolean;
}

export function Row({ children, value, onClick, danger, arrow = true }: RowProps) {
  const tone = danger ? ' text-high' : '';
  const chevron = Boolean(onClick) && arrow;
  const body = (
    <>
      <span className="min-w-0 truncate">{children}</span>
      {value !== undefined && (
        <span className="ml-auto min-w-0 truncate text-[12px] text-ink3">{value}</span>
      )}
      {chevron && (
        <span className={`text-[15px] text-ink3 ${value === undefined ? 'ml-auto' : ''}`}>›</span>
      )}
    </>
  );

  if (!onClick) return <div className={`${CARD}${tone}`}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={`${CARD}${tone} active:bg-sunk`}>
      {body}
    </button>
  );
}

/**
 * 테두리를 두른 줄 — 목록이 아니라 누르는 것이다.
 * 방이 하나도 없을 때는 이 줄들만 남아서 그때는 이게 화면의 전부가 된다.
 */
export function ActionRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border-[1.6px] border-edge px-[15px] py-4 text-[13.5px] font-medium text-ink active:bg-sunk"
    >
      {children}
    </button>
  );
}

/** 켜고 끄는 줄 */
export function ToggleRow({
  children,
  on,
  onChange,
}: {
  children: React.ReactNode;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`${CARD} active:bg-sunk`}
    >
      <span className="min-w-0 truncate">{children}</span>
      <span
        className={`ml-auto flex h-[26px] w-[44px] flex-none items-center rounded-full p-[3px] transition-colors ${
          on ? 'bg-accent' : 'bg-sunk'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-card shadow-card transition-transform ${
            on ? 'translate-x-[18px]' : ''
          }`}
        />
      </span>
    </button>
  );
}

/** 줄 밑에 붙는 한 줄 설명 */
export function Note({ children }: { children: React.ReactNode }) {
  return <p className="ml-1 mt-2 text-[11.5px] leading-[1.6] text-ink3">{children}</p>;
}
