'use client';

import { useState } from 'react';
import PageBar from '@/components/PageBar';
import ShareBox, { type Shares } from '@/components/ShareBox';
import { Group, Note, Row } from '@/components/rows';
import { ColorPicker, Field, GoButton, Hint } from '@/components/form';
import { PALETTE, tintOf } from '@/lib/constants';
import { ask } from '@/lib/ask';
import { useAuth } from '@/lib/auth';
import { formatCode, useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
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
  const { rooms, createRoom, setShares, shareCategory } = useRooms();
  const { categories, resync } = useStore();
  const { replaceView } = useUi();

  const [name, setName] = useState('');
  // 이메일 앞부분을 이름 자리에 먼저 채워둔다 — 대개 그대로 쓴다
  const [myName, setMyName] = useState(account?.email?.split('@')[0] ?? '');
  const [color, setColor] = useState<string>(PALETTE[rooms.length % PALETTE.length]);
  // 기본은 할 일만 켜둔다. 잘못 눌러 새는 걸 막자는 게 이 장치의 목적이라 기본값도 그쪽이다.
  const [shares, setSharesValue] = useState<Shares>({
    tasks: true,
    shop: false,
    memo: false,
    categoryIds: [],
  });
  const [busy, setBusy] = useState(false);

  const mine = categories.filter((c) => c.roomId === null);

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
      // 방을 연 다음에 무엇을 나눌지 얹는다. 여기서 걸려도 방은 이미 만들어져 있다.
      await setShares(room.id, { tasks: shares.tasks, shop: shares.shop, memo: shares.memo });
      if (shares.tasks) {
        for (const cid of shares.categoryIds) await shareCategory(cid, room.id);
        if (shares.categoryIds.length) await resync();
      }
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

      {/*
        방 만들 때 고르는 게 제일 좋은 안전장치다 —
        나중에 실수를 막는 게 아니라 길을 아예 안 내는 방식이라서 그렇다.
      */}
      <div className="mb-4 mt-5 border-t border-line2 pt-5">
        <ShareBox value={shares} onChange={setSharesValue} categories={mine} />
      </div>

      <Hint>지금 있는 것은 그대로 있어요. 나중에 하나씩 올릴 수 있습니다.</Hint>

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
  const { rooms, membersOf, resetCode, leaveRoom, closeRoom } = useRooms();
  const { categories, tasks, trash, resync } = useStore();
  const { pushView, popView, openSheet } = useUi();

  const room = rooms.find((r) => r.id === id) ?? null;

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
  const ownerName = owner?.displayName ?? '방 주인';
  const shared = categories.filter((c) => c.roomId === room.id);
  // 이 방에 걸린 것 몇 개가 내 폰에서 없어지는지 — 묻는 말에 쓴다
  const countHere = tasks.filter((t) => t.roomId === room.id).length;
  /*
    방 것은 한자리에 모은다 — 공유 카테고리의 할 일도, 방 장보기도, 방 메모도.
    카테고리마다 흩어놓으면 남이 지운 걸 찾으러 세 군데를 돌아야 한다.
  */
  const buried = trash.filter((t) => t.rooms.includes(room.id));

  // 손님 화면은 셋만 보이고 나머지는 숫자로 접는다
  const shown = room.mine ? people : people.slice(0, 3);
  const rest = people.length - shown.length;

  const onResetCode = async () => {
    const yes = await ask({
      title: '코드를 새로 만들까요?',
      loses: '그전 코드로는 아무도 못 들어와요.',
      keeps: '이미 들어와 있는 사람은 그대로 있어요.',
      go: '새로 만들기',
    });
    if (!yes) return;
    try {
      await resetCode(room.id);
      toast('코드를 새로 만들었어요');
    } catch {
      toast('바꾸지 못했습니다.');
    }
  };

  /** 손님만 나간다. 이 폰에서만 사라지고 다시 코드로 들어오면 돌아온다. */
  const onLeave = async () => {
    const yes = await ask({
      title: `${room.name}에서 나갈까요?`,
      loses: countHere ? `${countHere}개가 이 폰에서 없어져요.` : '이 방 것이 이 폰에서 없어져요.',
      keeps: '코드가 있으면 언제든 다시 들어올 수 있어요.',
      go: '나가기',
      danger: true,
    });
    if (!yes) return;
    try {
      await leaveRoom(room.id);
      await resync();
      toast(`${room.name} — 나왔어요`);
      popView();
    } catch {
      toast('나가지 못했습니다.');
    }
  };

  /**
   * 주인은 나가는 게 아니라 **닫는다.** 내가 연 창문을 내가 닫는 것이라
   * 내 화면에서는 아무것도 안 움직인다 — 나눈 것이 도로 내 것이 될 뿐이다.
   */
  const onClose = async () => {
    const yes = await ask({
      title: `${room.name} 나누기를 그만둘까요?`,
      loses: '다른 사람 화면에서 사라져요.',
      keeps: shared.length
        ? `카테고리 ${shared.length}개는 도로 내 것이 돼요. 내 목록에서는 아무것도 안 없어집니다.`
        : '내 목록에서는 아무것도 안 없어집니다.',
      go: '그만 나누기',
      danger: true,
    });
    if (!yes) return;
    try {
      await closeRoom(room.id);
      await resync(); // 거둬온 것들이 화면에 돌아와야 한다
      toast(`${room.name} — 그만 나눠요`);
      popView();
    } catch {
      toast('끝내지 못했습니다.');
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
            {room.mine ? '내가 연 방' : `${ownerName}가 연 방`}
          </span>
        }
      />

      <Group label={`같이 쓰는 사람 ${people.length}`}>
        {shown.map((m) => {
          const isMe = m.userId === account?.id;
          return (
            <Row
              key={m.userId}
              // 이 방에서 불릴 내 이름은 내 줄에서 고친다. 줄을 하나 더 만들 일이 아니다.
              onClick={
                isMe
                  ? () => openSheet({ kind: 'roomField', id: room.id, field: 'myName' })
                  : undefined
              }
              value={
                isMe
                  ? m.role === 'owner'
                    ? '나 · 방 주인'
                    : '나'
                  : m.role === 'owner'
                    ? '방 주인'
                    : `${joinedOn(m.joinedAt)} 들어옴`
              }
            >
              {m.displayName}
            </Row>
          );
        })}
        {rest > 0 && <Row>{`그 밖에 ${rest}명`}</Row>}

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

      <div className="mt-[18px]">
        <p className="mb-2 ml-1 text-[12px] text-ink2">나누는 것</p>
        {/*
          손님에게는 칩만 보인다. 나눌 것을 고르는 건 방 안에서 하는 일이 아니라
          방을 여는 일이라서, 연 사람만 한다.
        */}
        <SharedThings
          cats={room.shareTasks ? shared : []}
          shop={room.shareShop}
          memo={room.shareMemo}
          onClick={room.mine ? () => pushView({ kind: 'shares', id: room.id }) : undefined}
        />
        {!room.mine && <Note>{ownerName}가 정합니다.</Note>}
      </div>

      {/*
        손님에게는 방 자체를 다루는 줄이 아예 없다.
        `지운 것`만 빼고 — **그건 손님도 본다.** 되돌리기는 누구나 할 수 있어야 한다.
        막는 대신 되돌린다. 가족끼리 권한을 나누기 시작하면 그때부터 앱이 회사가 된다.
      */}
      <div className="mt-[18px]">
        <Group label="방">
          {room.mine && (
            <>
              <Row
                value={room.name}
                onClick={() => openSheet({ kind: 'roomField', id: room.id, field: 'name' })}
              >
                방 이름
              </Row>
              <Row
                value={
                  <span
                    className="inline-block h-[15px] w-[15px] rounded-full align-[-2px]"
                    style={{ background: room.color }}
                  />
                }
                onClick={() => openSheet({ kind: 'roomField', id: room.id, field: 'color' })}
              >
                방 색
              </Row>
              <Row value={formatCode(room.code)} onClick={onResetCode}>
                코드 새로 만들기
              </Row>
            </>
          )}
          {/* 비어 있어도 둔다 — 없어진 걸 찾을 때 처음 보이는 줄로는 늦다 */}
          <Row
            value={`${buried.length}개`}
            onClick={() => pushView({ kind: 'trash', scope: 'room', id: room.id })}
          >
            지운 것
          </Row>
        </Group>
      </div>

      <div className="mt-[18px]">
        <Group label="끝내기">
          {/*
            주인에게는 나가기가 없다 — 내가 연 창문을 내가 닫는 것이라 나가는 게 아니다.
            혼자 쓰는 방에는 맡길 사람이 없으니 `그만 나누기`만 뜬다.
          */}
          {room.mine ? (
            <>
              {people.length > 1 && (
                <Row onClick={() => pushView({ kind: 'handover', id: room.id })}>맡기고 나가기</Row>
              )}
              <Row danger arrow={false} onClick={onClose}>
                그만 나누기
              </Row>
            </>
          ) : (
            <Row danger arrow={false} onClick={onLeave}>
              나가기
            </Row>
          )}
        </Group>
      </div>
      <Note>
        {room.mine
          ? '그만 나누면 방이 끝나요. 나눈 것은 도로 내 것이 되고, 내 목록에서는 아무것도 사라지지 않습니다.'
          : '이 폰에서만 사라져요. 다시 코드로 들어오면 돌아옵니다.'}
      </Note>
    </>
  );
}

/** '2026-08-02T…' → '8월 2일' */
function joinedOn(at: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(at);
  if (!m) return '언젠가';
  return `${Number(m[1])}월 ${Number(m[2])}일`;
}

/**
 * 나누는 것 한 줄 — 카테고리 칩에 장보기·메모가 같은 줄에 붙는다.
 * 손님에게는 화살표가 없다.
 */
function SharedThings({
  cats,
  shop,
  memo,
  onClick,
}: {
  cats: { id: string; name: string; color: string }[];
  shop: boolean;
  memo: boolean;
  onClick?: () => void;
}) {
  const chip = 'inline-flex items-center rounded-full px-2.5 py-[3px] text-[11.5px] font-medium';
  const empty = cats.length === 0 && !shop && !memo;

  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-wrap gap-[5px]">
        {empty ? (
          <span className="text-[13px] text-ink3">아직 나누는 것이 없어요</span>
        ) : (
          <>
            {cats.map((c) => (
              <span
                key={c.id}
                className={chip}
                style={{ background: tintOf(c.color), color: c.color }}
              >
                {c.name}
              </span>
            ))}
            {shop && <span className={`${chip} bg-sunk text-ink2`}>장보기</span>}
            {memo && <span className={`${chip} bg-sunk text-ink2`}>메모</span>}
          </>
        )}
      </span>
      {onClick && <span className="flex-none text-[15px] text-ink3">›</span>}
    </>
  );

  const shell = 'flex w-full items-center gap-2.5 rounded-2xl bg-card px-[15px] py-4 shadow-card';
  if (!onClick) return <div className={shell}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={`${shell} text-left active:bg-sunk`}>
      {body}
    </button>
  );
}
