'use client';

import { useEffect, useMemo, useState } from 'react';
import MemoCard from './memo/MemoCard';
import EmptyBox from '@/components/EmptyBox';
import ScopeChips, { roomOfScope, settleScope, type Scope } from '@/components/ScopeChips';
import TrashLine from '@/components/TrashLine';
import { SearchIcon } from '@/components/Icons';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/**
 * 메모 여러 장. 대화창이 아니라 종이 뭉치다 —
 * 계좌번호·관리비처럼 한 번 적어두고 계속 보는 것들을 놓는 자리.
 * 한 번에 한 장만 펼쳐진다. 새 메모를 누르면 쓰던 건 접히고 빈 칸이 올라온다.
 *
 * 메모만 **여러 방에 동시에** 걸린다. 위 칩 줄은 어디 것을 볼지 고르는 자리고,
 * 한 장이 어느 방들에 걸렸는지는 카드가 이름표로 말한다.
 */
export default function MemoScreen() {
  const { memos, addMemo, updateMemo, removeMemo, memoSeenAt, markMemosSeen } = useStore();
  const { rooms, membersOf } = useRooms();
  const { account } = useAuth();
  const { openSheet } = useUi();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [scope, setScope] = useState<Scope>('all');

  // 메모를 나누는 방만 나온다. 껐으면 고를 길이 아예 없다.
  const sharing = useMemo(() => rooms.filter((r) => r.shareMemo), [rooms]);
  const picked = settleScope(scope, sharing);
  const here = roomOfScope(picked);

  // 들어올 때와 나갈 때 '봤다'고 찍는다. 나갈 때도 찍어야 방금 내가 쓴 글에 점이 안 뜬다.
  useEffect(() => {
    markMemosSeen();
    return () => markMemosSeen();
  }, [markMemosSeen]);

  // 처음 그릴 때의 값을 붙잡아둔다 — 위에서 방금 찍은 시각으로 덮이면 점이 뜰 새가 없다
  const [seenAt] = useState(memoSeenAt);

  const list = useMemo(() => {
    const mine = memos.filter((m) =>
      // 펼쳐 든 장은 어느 칸을 보고 있든 남는다.
      // `나만`을 보다가 방에 걸면 그 칸의 조건에서 벗어나는데, 손에 든 종이가
      // 그 자리에서 사라지면 지운 것처럼 보인다 — 접으면 그때 제 칸으로 간다.
      m.id === openId ||
      (picked === 'all' ? true : picked === 'mine' ? m.roomIds.length === 0 : m.roomIds.includes(picked)),
    );
    const sorted = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((m) => m.text.toLowerCase().includes(q)) : sorted;
  }, [memos, picked, query, openId]);

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
    // 방을 보고 있었으면 그 방에 걸고 시작한다 — 적고 나서 또 고르게 하지 않는다
    setOpenId(addMemo(here ? [here] : []).id);
  };

  /** 남이 고쳤을 때만 이름이 뜬다. 내가 고친 것은 말할 것이 없다. */
  const editor = (updatedBy: string | null, roomIds: string[]): string | null => {
    if (!updatedBy || updatedBy === account?.id) return null;
    for (const id of roomIds) {
      const found = membersOf(id).find((m) => m.userId === updatedBy);
      if (found) return found.displayName;
    }
    return '누군가';
  };

  return (
    <>
      <ScopeChips rooms={sharing} value={picked} onChange={setScope} />

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
              className="w-[52px] flex-none rounded-[14px] text-[18px] text-ink3 active:bg-sunk"
            >
              ×
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={create}
              className="flex-1 rounded-card border-[1.5px] border-dashed border-edge p-[15px] text-[13.5px] font-medium text-accent active:bg-accent-soft"
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
          {list.map((memo) => {
            const by = editor(memo.updatedBy, memo.roomIds);
            return (
              <MemoCard
                key={memo.id}
                memo={memo}
                open={memo.id === openId}
                // 걸린 순서대로 — 방 목록 순서가 아니라 그 메모가 든 순서다
                rooms={memo.roomIds
                  .map((id) => rooms.find((r) => r.id === id))
                  .filter((r): r is NonNullable<typeof r> => Boolean(r))}
                unread={Boolean(by) && memo.updatedAt > seenAt}
                by={by}
                onOpen={() => open(memo.id)}
                onChange={(text) => updateMemo(memo.id, text)}
                onShare={() => openSheet({ kind: 'memoRooms', id: memo.id })}
                onRemove={() => {
                  removeMemo(memo.id);
                  setOpenId(null);
                }}
              />
            );
          })}
        </div>
      )}

      {/*
        메모에는 카테고리가 없다 — 여기가 그 지운 것으로 들어가는 자리다.
        방을 보고 있을 때는 안 그린다. 여기 오르는 건 개인 것뿐이고
        방 메모를 되돌리는 자리는 방 설정이다.
      */}
      {!here && <TrashLine scope="memo" />}
    </>
  );
}
