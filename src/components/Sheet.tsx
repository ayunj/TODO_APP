'use client';

import { useEffect, useState } from 'react';
import { BackIcon, DownIcon } from './Icons';

interface Props {
  title: string;
  /** 시트를 완전히 내린다 — 덮개를 누르거나 Esc를 눌러도 이걸 탄다 */
  onClose: () => void;
  /** 하위 시트일 때 상위로 돌아가는 길. 주면 왼쪽 위 화살표가 이걸 탄다. */
  onBack?: () => void;
  children: React.ReactNode;
}

/** 아래에서 올라오는 시트. 설정·즐겨찾기·카테고리·함께 쓰기가 전부 이걸 탄다. */
export default function Sheet({ title, onClose, onBack, children }: Props) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOn(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-[rgba(62,58,77,.35)] transition-opacity duration-200 ${
          on ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div className={`sheet ${on ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {/* 나가는 길은 위 왼쪽 화살표 하나. 아래에 닫기 버튼을 또 두지 않는다. */}
        <div className="relative mb-[18px] flex h-9 items-center justify-center">
          <button
            type="button"
            onClick={onBack ?? onClose}
            aria-label={onBack ? '돌아가기' : '닫기'}
            className="absolute left-0 grid h-9 w-9 place-items-center rounded-full text-ink2 active:bg-sunk"
          >
            {onBack ? <BackIcon className="h-5 w-5" /> : <DownIcon className="h-5 w-5" />}
          </button>
          <h2 className="font-round text-[17.5px] font-normal">{title}</h2>
        </div>
        {children}
      </div>
    </>
  );
}
