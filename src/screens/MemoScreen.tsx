'use client';

import { useEffect, useMemo, useState } from 'react';
import MemoCard from './memo/MemoCard';
import EmptyBox from '@/components/EmptyBox';
import { SearchIcon } from '@/components/Icons';
import { useStore } from '@/lib/store';

/**
 * 메모 여러 장. 대화창이 아니라 종이 뭉치다 —
 * 계좌번호·관리비처럼 한 번 적어두고 계속 보는 것들을 놓는 자리.
 * 한 번에 한 장만 펼쳐진다. 새 메모를 누르면 쓰던 건 접히고 빈 칸이 올라온다.
 */
export default function MemoScreen() {
  const { memos, addMemo, updateMemo, removeMemo, markMemosSeen } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // 들어올 때와 나갈 때 '봤다'고 찍는다. 나갈 때도 찍어야 방금 내가 쓴 글에 점이 안 뜬다.
  useEffect(() => {
    markMemosSeen();
    return () => markMemosSeen();
  }, [markMemosSeen]);

  const list = useMemo(() => {
    const sorted = [...memos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((m) => m.text.toLowerCase().includes(q)) : sorted;
  }, [memos, query]);

  /** 빈 채로 접힌 메모는 버린다 — 빈 카드가 쌓이지 않게 */
  const dropIfEmpty = (id: string | null) => {
    if (!id) return;
    const found = memos.find((m) => m.id === id);
    if (found && !found.text.trim()) removeMemo(id);
  };

  const open = (id: string) => {
    if (id === openId) return;
    dropIfEmpty(openId);
    setOpenId(id);
  };

  const create = () => {
    dropIfEmpty(openId);
    setQuery('');
    setOpenId(addMemo().id);
  };

  return (
    <>
      {/* 찾기는 평소엔 돋보기로 접어둔다 — 늘 열어두면 자리만 먹는다 */}
      <div className="mb-3 mt-0.5 flex items-stretch gap-2">
        {searching ? (
          <>
            <input
              type="search"
              autoFocus
              className="field-input flex-1"
              placeholder="메모 안에서 찾기"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              aria-label="찾기 닫기"
              onClick={() => {
                setSearching(false);
                setQuery('');
              }}
              className="w-[52px] flex-none rounded-[14px] text-[19px] text-ink3 active:bg-sunk"
            >
              ×
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={create}
              className="flex-1 rounded-card border-[1.5px] border-dashed border-edge p-[15px] text-[14.5px] font-medium text-accent active:bg-accent-soft"
            >
              + 새 메모
            </button>
            {memos.length > 1 && (
              <button
                type="button"
                aria-label="메모 찾기"
                onClick={() => setSearching(true)}
                className="grid w-[52px] flex-none place-items-center rounded-card bg-card text-ink2 shadow-card active:bg-sunk"
              >
                <SearchIcon className="h-[19px] w-[19px]" />
              </button>
            )}
          </>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyBox title={query ? '찾는 말이 없습니다' : '아직 적어둔 것이 없습니다'}>
          {query ? (
            '다른 말로 찾아보세요.'
          ) : (
            <>
              계좌번호, 관리비, 와이파이 비밀번호처럼
              <br />
              흘려보내면 안 되는 것들을 적어두세요.
            </>
          )}
        </EmptyBox>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {list.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              open={memo.id === openId}
              onOpen={() => open(memo.id)}
              onChange={(text) => updateMemo(memo.id, text)}
              onRemove={() => {
                removeMemo(memo.id);
                setOpenId(null);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
