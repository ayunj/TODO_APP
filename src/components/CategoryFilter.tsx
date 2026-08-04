'use client';

import { CATEGORY_TINT } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 팔레트 색에는 정해둔 틴트를, 직접 고른 색에는 섞어 만든 틴트를 쓴다 */
const tintOf = (color: string) =>
  CATEGORY_TINT[color.toUpperCase()] ?? `color-mix(in srgb, ${color} 14%, #fff)`;

/** 헤더 아래 가로 스크롤 한 줄. 세 화면 모두에 적용된다. */
export default function CategoryFilter() {
  const { categories } = useStore();
  const { filter, setFilter } = useUi();

  const chip =
    'flex-none inline-flex items-center rounded-full px-[15px] py-[7px] text-[12.5px] font-medium transition-colors';

  return (
    <div
      className="no-scrollbar -mx-4 flex gap-[7px] overflow-x-auto px-4 pb-[14px]"
      role="group"
      aria-label="카테고리 필터"
    >
      <button
        type="button"
        aria-pressed={!filter}
        onClick={() => setFilter(null)}
        className={chip}
        style={
          !filter
            ? { background: 'var(--accent)', color: '#fff' }
            : { background: 'var(--accent-tint)', color: 'var(--accent)' }
        }
      >
        전체
      </button>
      {categories.map((c) => {
        const on = filter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => setFilter(c.id)}
            className={chip}
            style={
              on
                ? { background: c.color, color: '#fff' }
                : { background: tintOf(c.color), color: c.color }
            }
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
