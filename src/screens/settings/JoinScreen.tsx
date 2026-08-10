'use client';

import { useState } from 'react';
import PageBar from '@/components/PageBar';
import Sheet from '@/components/Sheet';
import { Field, GoButton } from '@/components/form';
import { tintOf } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import type { RoomPeek } from '@/lib/types';

/**
 * 코드를 넣으면 **바로 안 들어간다.** 어떤 방인지 먼저 보여주고 `들어가기`를 눌러야 들어간다.
 * 코드를 잘못 받았거나 옛 초대장일 수 있고, 무엇을 나누는 방인지 모른 채 들어가면
 * 남의 장보기가 갑자기 내 화면에 뜬다.
 */
export default function JoinScreen() {
  const { account } = useAuth();
  const { rooms, peekRoom, joinRoom } = useRooms();
  const { replaceView } = useUi();

  const [code, setCode] = useState('');
  const [peek, setPeek] = useState<RoomPeek | null>(null);
  const [myName, setMyName] = useState(account?.email?.split('@')[0] ?? '');
  const [busy, setBusy] = useState(false);

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
      // 뒤로가기가 코드 넣던 자리로 돌아가지 않게 갈아끼운다
      replaceView({ kind: 'room', id: room.id });
    } catch {
      toast('들어가지 못했습니다. 잠시 뒤에 다시 해주세요.');
      setBusy(false);
    }
  };

  // 안 나누는 것은 한 줄로만 적는다 — 없는 것을 칩으로 그리면 있는 것처럼 읽힌다
  const off = [!peek?.shareShop && '장보기', !peek?.shareMemo && '메모'].filter(Boolean);

  /*
    이미 들어와 있는 방이면 다시 들어갈 일이 없다.
    join_room은 이름을 덮어쓰기까지 해서, 그냥 두면 코드를 두 번 넣었다가
    그 방에서 부르던 이름이 조용히 바뀐다.

    **버튼을 회색으로 눕혀두지 않는다** — 그러면 왜 안 눌리는지 알려주지 못한다.
    할 수 있는 일로 갈아 끼운다.
  */
  const already = peek ? (rooms.find((r) => r.id === peek.id) ?? null) : null;

  return (
    <>
      <PageBar title="초대 코드 넣기" />

      <Field label="받은 코드" htmlFor="join-code">
        <input
          id="join-code"
          type="text"
          className="field-input font-mono text-[17px] tracking-[1px]"
          placeholder="예: 8F3K-2QMD"
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

      <GoButton onClick={look} disabled={busy || !code.trim()}>
        {busy && !peek ? '찾는 중…' : '방 보기'}
      </GoButton>

      {/* 찾으면 아래에서 올라온다. 뒤가 어두워져 앞뒤가 갈린다. */}
      {peek && (
        <Sheet title="이 방이 맞나요" onClose={() => setPeek(null)}>
          <h3 className="font-round text-[19px] leading-[1.3]">
            <span
              className="mr-2 inline-block h-[10px] w-[10px] rounded-full align-[1px]"
              style={{ background: peek.color }}
            />
            {peek.name}
          </h3>
          <p className="mb-4 mt-1 text-[12.5px] text-ink3">{peek.owner ?? '누군가'}이 연 방</p>

          <p className="mb-2 text-[12.5px] font-medium text-ink2">
            같이 쓰는 사람 {peek.count}
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card bg-card px-[15px] py-3.5 text-[13.5px] shadow-card">
            {peek.members.length === 0 ? (
              <span className="text-ink3">아직 아무도 없어요</span>
            ) : (
              peek.members.map((m, i) => (
                <span key={`${m.name}-${i}`} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-faint">·</span>}
                  {m.name || '이름 없음'}
                  {m.owner && <span className="text-[11.5px] text-ink3">방 주인</span>}
                </span>
              ))
            )}
          </div>

          <p className="mb-2 text-[12.5px] font-medium text-ink2">나누는 것</p>
          <div className="mb-4 rounded-card bg-card px-[15px] py-3.5 shadow-card">
            <div className="flex flex-wrap gap-[5px]">
              {peek.shareTasks && peek.cats.length > 0 ? (
                peek.cats.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[11.5px] font-medium"
                    style={{ background: tintOf(c.color), color: c.color }}
                  >
                    {c.name}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-ink3">아직 나누는 것이 없어요</span>
              )}
              {peek.shareShop && (
                <span className="inline-flex items-center rounded-full bg-sunk px-2.5 py-[3px] text-[11.5px] font-medium text-ink2">
                  장보기
                </span>
              )}
              {peek.shareMemo && (
                <span className="inline-flex items-center rounded-full bg-sunk px-2.5 py-[3px] text-[11.5px] font-medium text-ink2">
                  메모
                </span>
              )}
            </div>
            {off.length > 0 && (
              <p className="mt-2 text-[11.5px] text-ink3">{off.join('와 ')}는 안 나눠요</p>
            )}
          </div>

          {already ? (
            <>
              <p className="mb-3 ml-1 text-[12.5px] text-ink2">이미 들어가 있는 방입니다.</p>
              <GoButton onClick={() => replaceView({ kind: 'room', id: already.id })}>
                방 열기
              </GoButton>
            </>
          ) : (
            <>
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
      )}
    </>
  );
}
