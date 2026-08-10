'use client';

import ScrollRow from '@/components/ScrollRow';
import { presetsFor } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 누르면 그날 목록에 바로 추가. 필터가 켜져 있으면 그 카테고리 것만 보인다. */
export default function PresetChips() {
  const { presets, categoryOf, applyPreset } = useStore();
  const { cursor, filter, openSheet } = useUi();
  const list = presetsFor(presets, filter);

  return (
    <ScrollRow className="mb-[14px]">
      {list.length > 0 ? (
        list.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id, cursor)}
            className="inline-flex flex-none items-center gap-1.5 rounded-full bg-card px-[15px] py-[9px] text-[13px] font-medium text-ink2 shadow-card active:scale-95"
          >
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: categoryOf(p.categoryId).color }}
            />
            {p.title}
            {p.repeatDays > 0 && (
              <span className="font-mono text-[10.5px] font-medium text-cycle">
                {p.repeatDays}d
              </span>
            )}
          </button>
        ))
      ) : (
        /*
          비었다고 문장을 적지 않는다 — 없다는 말을 읽는 데 한 줄이 다 들어간다.
          **누를 것을 둔다.** 이 줄의 일은 한 번 눌러 담는 것이고,
          담을 게 없으면 만드는 것이 그 다음 일이다.
          줄째로 없애지 않는 건 즐겨찾기로 가는 길이 여기 말고 설정 안뿐이라서다.
          (켜둔 필터가 새 즐겨찾기의 카테고리로 그대로 이어진다)
        */
        <button
          type="button"
          onClick={() => openSheet({ kind: 'preset', id: null })}
          className="inline-flex flex-none items-center gap-1 rounded-full border border-dashed border-edge px-[15px] py-[9px] text-[13px] font-medium text-accent active:bg-accent-soft"
        >
          ＋ 즐겨찾기
        </button>
      )}
    </ScrollRow>
  );
}
