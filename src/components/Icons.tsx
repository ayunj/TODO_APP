type Props = { className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * 공유 표시 — **사람 둘**이다.
 * 뒷사람을 옅게 그려서 작게 줄여도 둘인 게 보인다.
 */
export function PeopleIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="8.6" cy="8" r="3.5" />
      <path d="M1.8 19.6c0-3.6 3-5.9 6.8-5.9s6.8 2.3 6.8 5.9z" />
      <circle cx="17.2" cy="9" r="2.6" opacity=".55" />
      <path d="M17.2 13.2c2.8 0 5 1.9 5 4.6h-3.6c0-1.8-.5-3.3-1.4-4.6z" opacity=".55" />
    </svg>
  );
}

export function GearIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  );
}

export function DayIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-4.9" />
    </svg>
  );
}

export function MonthIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2M14 17.5h2" />
    </svg>
  );
}

/** 시트를 내린다 — 아래에서 올라왔으니 아래로 */
export function DownIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.8}>
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

/** 상위 시트로 돌아간다 */
export function BackIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.8}>
      <path d="M14.5 6l-6 6 6 6" />
    </svg>
  );
}

export function CalendarIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function ShopIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <path d="M5.5 8h13l-1.1 10.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8z" />
      <path d="M9 8V6.2a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

/** 다음 날로 넘긴다 */
export function PostponeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.7}>
      <path d="M4 12h13M12.5 7.5l4.5 4.5-4.5 4.5M20 6v12" />
    </svg>
  );
}

export function SearchIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.7}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L20 20" />
    </svg>
  );
}

export function MemoIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
    </svg>
  );
}

/** 잠긴 것 — 아직 내 것이 아님만 말한다. 그림은 안 죽인다. */
export function LockIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

/** 세트 완성 보상 — 파는 것이 아니라 딸려오는 것 */
export function GiftIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M3.5 6.5h17V10h-17zM12 6.5V20" />
      <path d="M12 6.5S10.8 3.5 9 3.5a1.8 1.8 0 0 0 0 3.6zM12 6.5s1.2-3 3-3a1.8 1.8 0 0 1 0 3.6z" />
    </svg>
  );
}

/** 포인트가 어디서 오는지 — 상점 아래 한 줄에 붙는다 */
export function StarIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 4l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.8 9.6 9z" />
    </svg>
  );
}

/** 홈 — 지붕과 문 하나. 곰돌이가 사는 자리다. */
export function HomeIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <path d="M3.5 10.6 12 3.8l8.5 6.8" />
      <path d="M6 9.6V20h12V9.6" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function LogIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <path d="M5 20V12M12 20V5M19 20v-5" />
    </svg>
  );
}
