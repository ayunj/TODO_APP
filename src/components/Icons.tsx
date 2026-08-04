type Props = { className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

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

export function MemoIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={1.5}>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
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
