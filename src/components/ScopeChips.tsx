'use client';

import { PeopleIcon } from './Icons';
import { bandOf } from '@/lib/constants';
import type { Room } from '@/lib/types';

/**
 * 어디 것을 보고 있나 — `all`(전체) · `mine`(나만) · 방 id.
 * 담거나 적을 때도 이 값을 그대로 쓴다. 골라둔 자리에 들어가는 게 놀랍지 않다.
 */
export type Scope = 'all' | 'mine' | (string & {});

/** 고른 자리 — 전체·나만은 방이 아니다 */
export const roomOfScope = (scope: Scope): string | null =>
  scope === 'all' || scope === 'mine' ? null : scope;

/** 지금 고른 칸이 아직 있는지. 방에서 나왔거나 나누기를 끈 참이면 전체로 돌려놓는다. */
export const settleScope = (scope: Scope, rooms: Room[]): Scope =>
  scope === 'all' || scope === 'mine' || rooms.some((r) => r.id === scope) ? scope : 'all';

/**
 * 맨 위 방 칩 줄. 장보기와 메모가 같이 쓴다.
 *
 * **기본은 전체다** — 마트에서는 그냥 훑는다. 집 것 회사 것을 갈라 보는 건
 * 담을 때나 찾을 때고, 보는 동안에는 한 목록이어야 한다.
 * 나눌 방이 없으면 이 줄은 아예 없다.
 */
export default function ScopeChips({
  rooms,
  value,
  onChange,
}: {
  rooms: Room[];
  value: Scope;
  onChange: (s: Scope) => void;
}) {
  if (rooms.length === 0) return null;

  return (
    <div className="-mx-4 mb-3 flex items-center gap-[7px] overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip on={value === 'all'} onClick={() => onChange('all')}>
        전체
      </Chip>
      <Chip on={value === 'mine'} onClick={() => onChange('mine')}>
        나만
      </Chip>
      {/* 나만과 방 사이를 갈라둔다 — 앞의 둘은 자리가 아니라 보는 눈이다 */}
      <span className="h-4 w-px flex-none bg-line" />
      {rooms.map((r) => (
        <Chip key={r.id} on={value === r.id} color={r.color} onClick={() => onChange(r.id)}>
          {r.name}
          <PeopleIcon className="h-[13px] w-[13px]" />
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  children,
  on,
  color,
  onClick,
}: {
  children: React.ReactNode;
  on: boolean;
  color?: string;
  onClick: () => void;
}) {
  const plain = on ? 'bg-accent text-white' : 'bg-card text-ink2 shadow-card';
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[12.5px] font-medium active:scale-95 ${
        color ? '' : plain
      }`}
      style={
        color ? (on ? { background: color, color: '#fff' } : { background: bandOf(color) }) : undefined
      }
    >
      {children}
    </button>
  );
}
