'use client';

import { MemoIcon } from '@/components/Icons';
import { todayStr } from '@/lib/date';
import { onShopList } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 두 칸 다 세 줄까지. 더 볼 사람은 눌러 들어간다. */
const CAP = 3;

/**
 * 메모와 장바구니 맛보기 — 홈에서 **있다는 것만** 알린다.
 *
 * 두 곳 다 헤더 아이콘으로 들어가는 자리인데, 아이콘은 눌러봐야 안에 뭐가 있는지 안다.
 * 여기 세 줄이면 **들어갈지 말지를 안 들어가고 정한다.**
 */
export default function MiniPair() {
  const { memos, shopping } = useStore();
  const { pushView } = useUi();
  const today = todayStr();

  const notes = [...memos]
    .filter((m) => m.text.trim())
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, CAP);
  const cart = shopping.filter((i) => onShopList(i, today)).slice(0, CAP);

  return (
    <div className="mb-[11px] grid grid-cols-2 gap-[9px]">
      <Box title="메모" onAll={() => pushView({ kind: 'memo' })} empty="적어둔 것이 없어요">
        {notes.map((m) => (
          <li key={m.id} className="flex items-center gap-[7px] border-t border-line2 py-[7px] text-[12px] first:border-t-0">
            <MemoIcon className="h-3.5 w-3.5 flex-none text-ink3" />
            <span className="min-w-0 flex-1 truncate">{m.text.trim().split('\n')[0]}</span>
          </li>
        ))}
      </Box>

      <Box title="장바구니" onAll={() => pushView({ kind: 'shop' })} empty="담아둔 것이 없어요">
        {cart.map((i) => (
          <li key={i.id} className="flex items-center gap-[7px] border-t border-line2 py-[7px] text-[12px] first:border-t-0">
            <i
              className={`grid h-[15px] w-[15px] flex-none place-items-center rounded-[5px] border-[1.6px] text-[9px] not-italic ${
                i.done ? 'border-ok bg-ok text-white' : 'border-edge text-transparent'
              }`}
            >
              ✓
            </i>
            <span className={`min-w-0 flex-1 truncate ${i.done ? 'text-done line-through' : ''}`}>
              {i.title}
            </span>
          </li>
        ))}
      </Box>
    </div>
  );
}

function Box({
  title,
  onAll,
  empty,
  children,
}: {
  title: string;
  onAll: () => void;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="flex flex-col rounded-card bg-card shadow-card">
      <div className="px-[13px] pb-2 pt-[13px]">
        <h2 className="text-[13px] font-bold">{title}</h2>
      </div>
      {children.length > 0 ? (
        <ul className="m-0 flex-1 list-none px-[13px]">{children}</ul>
      ) : (
        <p className="flex-1 px-[13px] pb-1 pt-1.5 text-[11.5px] leading-[1.6] text-ink3">{empty}</p>
      )}
      <button
        type="button"
        onClick={onAll}
        className="rounded-b-card px-0 pb-[13px] pt-2.5 text-[11.5px] text-accent active:bg-accent-tint"
      >
        모두 보기 ›
      </button>
    </section>
  );
}
