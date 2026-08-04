'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

/**
 * 종이 한 장. 계좌번호·관리비처럼 한 번 적어두고 계속 보는 것들을 놓는 자리.
 * 저장 버튼을 두지 않는다 — 적다가 나가도 남아 있어야 한다.
 */
export default function MemoScreen() {
  const { memo, saveMemo } = useStore();
  const [text, setText] = useState(memo);

  // 타이핑이 잠깐 멈추면 조용히 저장한다
  useEffect(() => {
    if (text === memo) return;
    const timer = setTimeout(() => saveMemo(text), 600);
    return () => clearTimeout(timer);
  }, [text, memo, saveMemo]);

  return (
    <>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'예)\n관리비 계좌 000-00-000000 국민\n와이파이 비밀번호\n분리수거 화요일 밤'}
        className="field-input min-h-[52vh] resize-y rounded-card px-[18px] py-4 text-[15px] leading-[1.75] placeholder:leading-[1.9]"
      />
      <p className="mt-2.5 px-1 text-[11.5px] leading-[1.6] text-ink3">
        적는 대로 저장됩니다. 따로 누를 것 없어요.
      </p>
    </>
  );
}
