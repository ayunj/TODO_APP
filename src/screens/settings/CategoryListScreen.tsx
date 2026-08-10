'use client';

import PageBar from '@/components/PageBar';
import { GoButton } from '@/components/form';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function CategoryListScreen() {
  const { categories, tasks, removeCategory } = useStore();
  const { filter, setFilter, openSheet } = useUi();

  const kill = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    if (categories.length <= 1) {
      toast('마지막 카테고리는 지울 수 없습니다');
      return;
    }
    const used = tasks.filter((t) => t.categoryId === id).length;
    const fallback = categories.find((c) => c.id !== id)!;

    // 지우기 전에 몇 개가 옮겨지는지 알려준다 — 함께 사라지게 하지 않는다
    const message = used
      ? `${target.name}을(를) 지웁니다. 여기 있는 ${used}개는 ${fallback.name}(으)로 옮겨집니다.`
      : `${target.name}을(를) 지웁니다.`;
    if (!confirm(message)) return;

    const moved = removeCategory(id);
    if (filter === id) setFilter(null);
    toast(moved ? `${target.name} 삭제 — ${moved}개 옮김` : `${target.name} 삭제`);
  };

  return (
    <>
      <PageBar title="카테고리" />

      <div className="mb-4 flex flex-col gap-[9px]">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-[11px] rounded-2xl bg-card px-3.5 py-[13px] shadow-card"
          >
            <span className="h-3 w-3 flex-none rounded-full" style={{ background: c.color }} />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-[14.5px]">{c.name}</span>
              <span className="text-[11.5px] text-ink3">
                {tasks.filter((t) => t.categoryId === c.id).length}개 사용 중
              </span>
            </span>
            <button
              type="button"
              onClick={() => openSheet({ kind: 'category', id: c.id })}
              className="flex-none rounded-[11px] bg-sunk px-3 py-2 text-[12px] text-ink2"
            >
              수정
            </button>
            {categories.length > 1 && (
              <button
                type="button"
                onClick={() => kill(c.id)}
                className="flex-none rounded-[11px] bg-danger-soft px-3 py-2 text-[12px] text-high"
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </div>

      <GoButton onClick={() => openSheet({ kind: 'category', id: null })}>새 카테고리</GoButton>
    </>
  );
}
