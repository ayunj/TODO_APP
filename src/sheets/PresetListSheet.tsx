'use client';

import Sheet from '@/components/Sheet';
import EmptyBox from '@/components/EmptyBox';
import { GoButton } from '@/components/form';
import { PRIORITY_LABEL } from '@/lib/constants';
import { shortDate } from '@/lib/date';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function PresetListSheet() {
  const { presets, categoryOf, removePreset } = useStore();
  const { closeSheet, openSheet } = useUi();

  return (
    <Sheet
      title="자주 쓰는 일"
      onClose={closeSheet}
      onBack={() => openSheet({ kind: 'settings' })}
    >
      <div className="mb-4 flex flex-col gap-[9px]">
        {presets.length === 0 ? (
          <EmptyBox title="비어 있습니다">
            자주 반복하는 일을 넣어두면 한 번 눌러 추가할 수 있어요.
          </EmptyBox>
        ) : (
          presets.map((p) => {
            const c = categoryOf(p.categoryId);
            return (
              <div
                key={p.id}
                className="flex items-center gap-[11px] rounded-2xl bg-card px-3.5 py-[13px] shadow-card"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[14.5px]">{p.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink3">
                    <span
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ background: c.color }}
                    />
                    {c.name}
                    <span>{PRIORITY_LABEL[p.priority]}</span>
                    {p.repeatDays > 0 && (
                      <span className="font-mono text-cycle">{p.repeatDays}일 주기</span>
                    )}
                    {p.repeatDays > 0 && p.repeatUntil && (
                      <span className="font-mono">~{shortDate(p.repeatUntil)}</span>
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => openSheet({ kind: 'preset', id: p.id })}
                  className="flex-none rounded-[11px] bg-sunk px-3 py-2 text-[12px] text-ink2"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removePreset(p.id);
                    toast(`${p.title} — 목록에서 뺐습니다`);
                  }}
                  className="flex-none rounded-[11px] bg-danger-soft px-3 py-2 text-[12px] text-high"
                >
                  삭제
                </button>
              </div>
            );
          })
        )}
      </div>

      <GoButton onClick={() => openSheet({ kind: 'preset', id: null })}>새로 추가</GoButton>
    </Sheet>
  );
}
