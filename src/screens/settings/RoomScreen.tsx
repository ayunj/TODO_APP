'use client';

import { useState } from 'react';
import PageBar from '@/components/PageBar';
import { Group, Note, Row } from '@/components/rows';
import { ColorPicker, Field, GoButton, Hint } from '@/components/form';
import { PALETTE, tintOf } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { useRooms } from '@/lib/rooms';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';

/** id가 null이면 새 방 만들기, 있으면 그 방 설정 */
export default function RoomScreen({ id }: { id: string | null }) {
  if (id === null) return <CreateRoom />;
  return <RoomSettings id={id} />;
}

/* ───────── 방 만들기 ───────── */

function CreateRoom() {
  const { account } = useAuth();
  const { rooms, createRoom } = useRooms();
  const { replaceView } = useUi();

  const [name, setName] = useState('');
  // 이메일 앞부분을 이름 자리에 먼저 채워둔다 — 대개 그대로 쓴다
  const [myName, setMyName] = useState(account?.email?.split('@')[0] ?? '');
  const [color, setColor] = useState<string>(PALETTE[rooms.length % PALETTE.length]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      document.getElementById('room-name')?.focus();
      toast('방 이름을 적어주세요');
      return;
    }
    if (!myName.trim()) {
      document.getElementById('room-myname')?.focus();
      toast('이 방에서 불릴 이름을 적어주세요');
      return;
    }
    setBusy(true);
    try {
      const room = await createRoom(name, myName, color);
      toast(`${room.name} — 방을 만들었어요`);
      // 갈아끼운다 — 뒤로가기가 방금 지나온 `방 만들기`로 돌아가면 안 된다
      replaceView({ kind: 'room', id: room.id });
    } catch {
      toast('방을 만들지 못했습니다. 잠시 뒤에 다시 해주세요.');
      setBusy(false);
    }
  };

  return (
    <>
      <PageBar title="방 만들기" />

      <Field label="방 이름" htmlFor="room-name">
        <input
          id="room-name"
          type="text"
          className="field-input"
          placeholder="예: 우리집"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="내 이름 · 이 방에서 이렇게 불려요" htmlFor="room-myname">
        <input
          id="room-myname"
          type="text"
          className="field-input"
          placeholder="예: 윤정"
          autoComplete="off"
          value={myName}
          onChange={(e) => setMyName(e.target.value)}
        />
      </Field>

      <Field label="방 색">
        <ColorPicker value={color} onChange={setColor} />
      </Field>

      <Hint>지금 있는 것은 그대로 있어요. 만든 뒤에 초대 코드로 사람을 부를 수 있습니다.</Hint>

      <GoButton onClick={submit} disabled={busy}>
        {busy ? '만드는 중…' : '만들기'}
      </GoButton>
    </>
  );
}

/* ───────── 방 설정 ───────── */

/**
 * 주인과 손님이 보는 것이 다르다.
 * **못 누르는 줄을 흐리게 두지 않고 아예 안 만든다** — 손님 화면에는 화살표도 없다.
 */
function RoomSettings({ id }: { id: string }) {
  const { account } = useAuth();
  const { rooms, membersOf, renameRoom, recolorRoom, resetCode, leaveRoom } = useRooms();
  const { pushView, popView } = useUi();

  const room = rooms.find((r) => r.id === id) ?? null;
  const [name, setName] = useState(room?.name ?? '');

  // 방을 나갔거나 아직 못 받아온 참이면 빈 화면 대신 한 줄을 보여준다
  if (!room) {
    return (
      <>
        <PageBar title="방" />
        <p className="ml-1 text-[13px] text-ink3">방을 찾을 수 없어요.</p>
      </>
    );
  }

  const people = membersOf(room.id);
  const owner = people.find((m) => m.role === 'owner');

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === room.name) return;
    try {
      await renameRoom(room.id, trimmed);
      toast('방 이름을 바꿨어요');
    } catch {
      toast('바꾸지 못했습니다.');
    }
  };

  const onColor = async (c: string) => {
    try {
      await recolorRoom(room.id, c);
    } catch {
      toast('바꾸지 못했습니다.');
    }
  };

  const onResetCode = async () => {
    if (!confirm('코드를 새로 만들면 그전 코드로는 못 들어와요. 계속할까요?')) return;
    try {
      await resetCode(room.id);
      toast('코드를 새로 만들었어요');
    } catch {
      toast('바꾸지 못했습니다.');
    }
  };

  const onLeave = async () => {
    const msg = room.mine
      ? '이 방에서 나갑니다. 방과 그 안의 것은 다른 사람에게 남아요.'
      : '이 방에서 나갑니다. 다시 코드로 들어올 수 있어요.';
    if (!confirm(msg)) return;
    try {
      await leaveRoom(room.id);
      toast(`${room.name} — 나왔어요`);
      popView();
    } catch {
      toast('나가지 못했습니다.');
    }
  };

  return (
    <>
      <PageBar
        title={room.name}
        right={
          <span
            className="inline-flex flex-none items-center rounded-full px-2.5 py-[3px] text-[11px] font-medium"
            style={{ background: tintOf(room.color), color: room.color }}
          >
            {room.mine ? '내가 연 방' : `${owner?.displayName ?? '누군가'}가 연 방`}
          </span>
        }
      />

      <Group label={`같이 쓰는 사람 ${people.length}`}>
        {people.map((m) => (
          <Row
            key={m.userId}
            value={[
              m.userId === account?.id ? '나' : null,
              m.role === 'owner' ? '방 주인' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          >
            {m.displayName}
          </Row>
        ))}
        {/* 초대는 주인만 한다 */}
        {room.mine && (
          <button
            type="button"
            onClick={() => pushView({ kind: 'invite', id: room.id })}
            className="rounded-2xl bg-accent px-[15px] py-4 text-center text-[14px] font-medium text-white shadow-fab active:scale-[.99]"
          >
            초대하기
          </button>
        )}
      </Group>

      {room.mine && (
        <div className="mt-[18px]">
          <p className="mb-2 ml-1 text-[12px] text-ink2">방</p>
          <Field label="방 이름" htmlFor="room-rename">
            <div className="flex gap-2">
              <input
                id="room-rename"
                type="text"
                className="field-input flex-1"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {name.trim() && name.trim() !== room.name && (
                <button
                  type="button"
                  onClick={save}
                  className="flex-none rounded-[14px] bg-accent px-4 text-[13.5px] font-medium text-white"
                >
                  저장
                </button>
              )}
            </div>
          </Field>

          <Field label="방 색">
            <ColorPicker value={room.color} onChange={onColor} />
          </Field>

          <Group>
            <Row value={shortCode(room.code)} onClick={onResetCode}>
              코드 새로 만들기
            </Row>
          </Group>
        </div>
      )}

      <div className="mt-[18px]">
        <Group label="끝내기">
          <Row danger arrow={false} onClick={onLeave}>
            나가기
          </Row>
        </Group>
      </div>
      <Note>
        {room.mine
          ? '방과 그 안의 것은 남은 사람에게 그대로 있어요.'
          : '이 폰에서만 사라져요. 다시 코드로 들어오면 돌아옵니다.'}
      </Note>
    </>
  );
}

/** 32자리 코드는 다 보여주지 않는다 — 앞 4·뒤 4만 */
function shortCode(code: string): string {
  if (code.length <= 9) return code.toUpperCase();
  return `${code.slice(0, 4)}…${code.slice(-4)}`.toUpperCase();
}
