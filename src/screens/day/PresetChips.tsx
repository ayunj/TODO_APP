'use client';

import ScrollRow from '@/components/ScrollRow';
import { presetsFor } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 누르면 그날 목록에 바로 추가. 필터가 켜져 있으면 그 카테고리 것만 보인다. */
export default function PresetChips() {
  const { presets, categoryOf, applyPreset } = useStore();
  const { cursor, filter } = useUi();
  const list = presetsFor(presets, filter);

  return (
    <ScrollRow className="mb-[14px]">
      {list.length > 0 ? (
        list.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id, cursor)}
            className="inline-flex flex-none items-center gap-1.5 rounded-full bg-card px-[15px] py-[9px] text-[13.5px] font-medium text-ink2 shadow-card active:scale-95"
          >
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: categoryOf(p.categoryId).color }}
            />
            {p.title}
            {p.repeatDays > 0 && (
              <span className="font-mono text-[11px] font-medium text-cycle">
                {p.repeatDays}d
              </span>
            )}
          </button>
        ))
      ) : (
        <span className="inline-flex flex-none items-center rounded-full border border-dashed border-line px-[15px] py-[9px] text-[13.5px] text-ink3">
          {filter
            ? `${categoryOf(filter).name}에 저장해둔 일이 없습니다`
            : '즐겨찾기가 아직 없습니다'}
        </span>
      )}
    </ScrollRow>
  );
}
