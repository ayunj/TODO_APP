'use client';

import Sheet from '@/components/Sheet';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 설정·즐겨찾기·카테고리·계정·초기화는 전부 톱니 안에 있다 */
export default function SettingsSheet() {
  const { presets, categories, resetAll } = useStore();
  const { enabled, account } = useAuth();
  const { closeSheet, openSheet } = useUi();

  const item =
    'flex items-center gap-3 rounded-2xl bg-card px-[15px] py-4 text-[15.5px] shadow-card';

  return (
    <Sheet title="설정" onClose={closeSheet}>
      <div className="mb-2 flex flex-col gap-[9px]">
        <button type="button" className={item} onClick={() => openSheet({ kind: 'presetList' })}>
          즐겨찾기
          <span className="ml-auto text-[13px] text-ink3">{presets.length}개</span>
        </button>
        <button type="button" className={item} onClick={() => openSheet({ kind: 'categoryList' })}>
          카테고리
          <span className="ml-auto text-[13px] text-ink3">{categories.length}개</span>
        </button>
        {enabled && account && (
          <button type="button" className={item} onClick={() => openSheet({ kind: 'account' })}>
            계정
            <span className="ml-auto max-w-[55%] truncate text-[13px] text-ink3">
              {account.email ?? '초대로 들어옴'}
            </span>
          </button>
        )}
        <button
          type="button"
          className={`${item} text-high`}
          onClick={() => {
            if (!confirm('모든 할 일과 즐겨찾기를 지웁니다. 되돌릴 수 없어요.')) return;
            resetAll();
            closeSheet();
            toast('초기화했습니다');
          }}
        >
          전체 초기화
        </button>
      </div>
    </Sheet>
  );
}
