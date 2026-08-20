'use client';

import { tintOf } from '@/lib/constants';
import type { Category } from '@/lib/types';

export interface Shares {
  tasks: boolean;
  shop: boolean;
  memo: boolean;
  /** 콕 찌르기를 주고받는 방인지. 집에서 오는 콕은 귀엽지만 회사방에서 오는 건 재촉이다. */
  nudge: boolean;
  /**
   * 할 일에 딸린 것 — 나누기로 고른 카테고리.
   *
   * **한 방에 하나다.** 배열로 남겨둔 건 지난 데이터가 여럿을 들고 있을 수 있어서고,
   * 여기서 새로 고를 때는 늘 한 칸이다.
   */
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
 *
 * **카테고리는 한 방에 하나만 고른다.** 방 하나가 곧 카테고리 하나라
 * 필터 줄에서도 칩 하나로 서고, 어디까지가 그 방 것인지를 따로 말할 필요가 없다.
 * 두 가지를 나누려면 방을 둘 만든다 — 나누는 상대가 같아도 그렇다.
 */
export default function ShareBox({ value, onChange, categories, label, busy }: Props) {
  const set = (patch: Partial<Shares>) => onChange({ ...value, ...patch });
  const picked = new Set(value.categoryIds);

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
          <p className="mb-2 text-[11.5px] text-ink3">
            어느 카테고리를 나눌까요 <span className="text-ink3">· 하나만 고를 수 있어요</span>
          </p>
          {categories.length === 0 ? (
            <p className="text-[12px] text-ink3">나눌 카테고리가 없어요.</p>
          ) : (
            <div className="flex flex-wrap gap-[6px]">
              {/*
                하나만 고른다. 여럿을 올릴 수 있던 때는 `전체` 칩이 있었는데,
                한 번 누르면 그때 있던 것이 다 올라가서 개인 카테고리가 조용히 새어 들어갔다.
                고를 것이 하나뿐이면 그 칩도 있을 자리가 없다.
              */}
              {categories.map((c) => {
                const on = picked.has(c.id);
                return (
                  <Chip
                    key={c.id}
                    on={on}
                    color={c.color}
                    // 다시 누르면 내려놓는다 — 고른 것을 무를 길이 있어야 한다
                    onClick={() => set({ categoryIds: on ? [] : [c.id] })}
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

      {/*
        나누는 것 셋과 줄을 갈랐다. 앞의 셋은 **무엇이 오가는지**고
        이건 **어떻게 부르는지**라 성격이 다르다 — 같은 줄에 두면 넷 다 같은 것으로 읽힌다.
      */}
      <div className="mt-[9px]">
        <Check on={value.nudge} onClick={() => set({ nudge: !value.nudge })}>
          👋 콕 찌르기
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
