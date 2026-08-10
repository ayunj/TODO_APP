'use client';

import { tintOf } from '@/lib/constants';
import type { Category } from '@/lib/types';

export interface Shares {
  tasks: boolean;
  shop: boolean;
  memo: boolean;
  /** 할 일에 딸린 것 — 나누기로 고른 카테고리 */
  categoryIds: string[];
}

interface Props {
  value: Shares;
  onChange: (next: Shares) => void;
  /** 고를 수 있는 카테고리 (내 것과 이 방 것) */
  categories: Category[];
  /** 무엇을 고르는 자리인지 — 방 만들 때와 방 설정에서 말이 다르다 */
  label?: string;
  busy?: boolean;
}

/**
 * 무엇을 나눌까요 — 할 일 · 장보기 · 메모.
 *
 * **방 만들 때 고르는 게 제일 좋은 안전장치다.** 나중에 실수를 막는 게 아니라
 * 길을 아예 안 내는 방식이라서 그렇다. 회사방에서 장보기를 끄면 담을 때 뜨는
 * 목록에 회사방이 아예 안 나온다 — 고를 수 없으니 잘못 누를 수 없다.
 *
 * **할 일만 밑에 목록이 하나 더 달린다.** 나머지 둘은 딸린 게 없어 체크뿐이다.
 * 왼쪽에 세로선을 그어 `할 일에 딸린 것`으로 보이게 한다.
 */
export default function ShareBox({ value, onChange, categories, label, busy }: Props) {
  const set = (patch: Partial<Shares>) => onChange({ ...value, ...patch });
  const picked = new Set(value.categoryIds);
  const allOn = categories.length > 0 && categories.every((c) => picked.has(c.id));

  return (
    <div className={busy ? 'pointer-events-none opacity-60' : undefined}>
      <p className="mb-2 ml-1 text-[12px] text-ink2">{label ?? '무엇을 나눌까요'}</p>

      <Check
        on={value.tasks}
        onClick={() =>
          // 할 일을 끄면 딸린 카테고리도 같이 내려놓는다 — 접힌 채로 남아 있으면 무엇이 새는지 모른다
          set(value.tasks ? { tasks: false, categoryIds: [] } : { tasks: true })
        }
      >
        할 일
      </Check>

      {value.tasks && (
        <div className="ml-[9px] mt-2 border-l-[1.5px] border-line2 pl-3">
          <p className="mb-2 text-[11.5px] text-ink3">어느 카테고리를 나눌까요</p>
          {categories.length === 0 ? (
            <p className="text-[12px] text-ink3">나눌 카테고리가 없어요.</p>
          ) : (
            <div className="flex flex-wrap gap-[6px]">
              {/*
                `전체`는 앞으로 만드는 카테고리까지 따라 올라가는 게 아니라
                지금 있는 것을 전부 고른 것과 같다. 새 카테고리는 만들 때 다시 고른다 —
                안 그러면 회사방에 개인 카테고리가 조용히 새어 들어간다.
              */}
              <Chip
                on={allOn}
                color="var(--accent)"
                onClick={() => set({ categoryIds: allOn ? [] : categories.map((c) => c.id) })}
              >
                전체
              </Chip>
              {categories.map((c) => {
                const on = picked.has(c.id);
                return (
                  <Chip
                    key={c.id}
                    on={on}
                    color={c.color}
                    onClick={() =>
                      set({
                        categoryIds: on
                          ? value.categoryIds.filter((x) => x !== c.id)
                          : [...value.categoryIds, c.id],
                      })
                    }
                  >
                    {c.name}
                  </Chip>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-[9px] flex gap-2">
        <Check on={value.shop} onClick={() => set({ shop: !value.shop })} grow>
          장보기
        </Check>
        <Check on={value.memo} onClick={() => set({ memo: !value.memo })} grow>
          메모
        </Check>
      </div>
    </div>
  );
}

function Check({
  children,
  on,
  onClick,
  grow,
}: {
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
  grow?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-2xl px-[15px] py-[13px] text-[14px] shadow-card active:bg-sunk ${
        grow ? 'flex-1' : 'w-full'
      } ${on ? 'bg-accent-tint text-accent' : 'bg-card text-ink2'}`}
    >
      <span
        className={`grid h-[19px] w-[19px] flex-none place-items-center rounded-[6px] text-[11px] font-bold ${
          on ? 'bg-accent text-white' : 'border-[1.5px] border-edge text-transparent'
        }`}
      >
        ✓
      </span>
      {children}
    </button>
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
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-3 py-[5px] text-[12px] font-medium active:opacity-80"
      style={
        on
          ? { background: color, color: '#fff' }
          : { background: tintOf(color), color }
      }
    >
      {children}
      {on && <span className="text-[10px]">✓</span>}
    </button>
  );
}
