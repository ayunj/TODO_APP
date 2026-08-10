'use client';

import PageBar from '@/components/PageBar';
import { GoButton } from '@/components/form';
import { Group, Row } from '@/components/rows';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 목록은 **들어가는 줄만** 늘어놓는다.
 * 고치기·지우기 버튼을 줄마다 달면 한 줄에 누를 곳이 셋이 된다 —
 * 손보는 일은 한 겹 안(카테고리 설정)에서 한다.
 */
export default function CategoryListScreen() {
  const { categories, tasks } = useStore();
  const { pushView } = useUi();

  return (
    <>
      <PageBar title="카테고리" />

      <div className="mb-4">
        <Group>
          {categories.map((c) => (
            <Row
              key={c.id}
              value={`${tasks.filter((t) => t.categoryId === c.id).length}개`}
              onClick={() => pushView({ kind: 'category', id: c.id })}
            >
              <span className="flex min-w-0 items-center gap-[9px]">
                <span
                  className="h-[11px] w-[11px] flex-none rounded-full"
                  style={{ background: c.color }}
                />
                <span className="min-w-0 truncate">{c.name}</span>
              </span>
            </Row>
          ))}
        </Group>
      </div>

      <GoButton onClick={() => pushView({ kind: 'category', id: null })}>새 카테고리</GoButton>
    </>
  );
}
