'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { Field, GoButton } from '@/components/form';
import { tintOf } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import type { RoomPeek } from '@/lib/types';

/** 코드를 넣으면 바로 안 들어간다. 어떤 방인지 먼저 보여주고 들어가기를 눌러야 들어간다. */
export default function JoinSheet() {
  const { account } = useAuth();
  const { peekRoom, joinRoom } = useRooms();
  const { openSheet, closeSheet } = useUi();

  const [code, setCode] = useState('');
  const [peek, setPeek] = useState<RoomPeek | null>(null);
  const [myName, setMyName] = useState(account?.email?.split('@')[0] ?? '');
  const [busy, setBusy] = useState(false);

  const back = () => openSheet({ kind: 'share' });

  const look = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const found = await peekRoom(code);
      if (!found) {
        toast('초대 코드가 맞지 않습니다');
        setPeek(null);
      } else {
        setPeek(found);
      }
    } catch {
      toast('연결이 되지 않습니다. 잠시 뒤에 다시 해주세요.');
    } finally {
      setBusy(false);
    }
  };

  const enter = async () => {
    if (!peek) return;
    if (!myName.trim()) {
      document.getElementById('join-name')?.focus();
      toast('이 방에서 불릴 이름을 적어주세요');
      return;
    }
    setBusy(true);
    try {
      const room = await joinRoom(code, myName);
      toast(`${room.name} — 들어왔어요`);
      openSheet({ kind: 'room', id: room.id });
    } catch {
      toast('들어가지 못했습니다. 잠시 뒤에 다시 해주세요.');
      setBusy(false);
    }
  };

  return (
    <Sheet title="초대 코드 넣기" onClose={closeSheet} onBack={back}>
      <Field label="받은 코드" htmlFor="join-code">
        <input
          id="join-code"
          type="text"
          className="field-input font-mono tracking-wide"
          placeholder="예: 8F3K2QMD…"
          autoComplete="off"
          autoCapitalize="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setPeek(null); // 코드가 바뀌면 앞서 본 방은 지운다
          }}
        />
      </Field>
      <p className="-mt-2 mb-4 ml-1 text-[11.5px] text-ink3">대소문자와 하이픈은 안 따져요.</p>

      {!peek ? (
        <GoButton onClick={look} disabled={busy || !code.trim()}>
          {busy ? '찾는 중…' : '방 보기'}
        </GoButton>
      ) : (
        <>
          <div className="mb-4 rounded-card bg-card p-4 shadow-card">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[11px] font-medium"
              style={{ background: tintOf(peek.color), color: peek.color }}
            >
              {peek.name}
            </span>
            <p className="mt-2.5 text-[12px] text-ink2">
              같이 쓰는 사람 {peek.count}
              {peek.members.length > 0 && (
                <span className="text-ink3"> · {peek.members.join(' · ')}</span>
              )}
            </p>
            {peek.owner && <p className="mt-1 text-[11.5px] text-ink3">{peek.owner}이 연 방</p>}
          </div>

          <Field label="이 방에서 부를 이름" htmlFor="join-name">
            <input
              id="join-name"
              type="text"
              className="field-input"
              placeholder="예: 엄마"
              autoComplete="off"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
            />
          </Field>

          <GoButton onClick={enter} disabled={busy}>
            {busy ? '들어가는 중…' : '들어가기'}
          </GoButton>
        </>
      )}
    </Sheet>
  );
}
