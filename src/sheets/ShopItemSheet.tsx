'use client';

import { useMemo, useState } from 'react';
import Sheet from '@/components/Sheet';
import { PeopleIcon } from '@/components/Icons';
import { DangerButton, Field, GoButton } from '@/components/form';
import { bandOf } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

/** 이름·메모·구입처·어디에. 빠르게 담는 건 위 입력 줄이 맡고, 여기는 자세히 적는 자리다. */
export default function ShopItemSheet({ id }: { id: string }) {
  const { shopping, updateShopItem, removeShopItem } = useStore();
  const { rooms } = useRooms();
  const { closeSheet } = useUi();

  const item = shopping.find((i) => i.id === id) ?? null;
  const [title, setTitle] = useState(item?.title ?? '');
  const [note, setNote] = useState(item?.note ?? '');
  const [place, setPlace] = useState(item?.place ?? '');
  const [roomId, setRoomId] = useState<string | null>(item?.roomId ?? null);
  /*
    공유는 접어둔다 — 담는 대부분이 개인 것이라 아무것도 안 묻는 게 맞다.
    이미 방에 있는 것은 펴서 보여준다. 접어두면 어디 것인지를 눌러봐야 안다.
  */
  const [opened, setOpened] = useState(Boolean(item?.roomId));

  // 장보기를 나누는 방만 고를 수 있다. 껐으면 여기 아예 안 뜬다 — 잘못 누를 길이 없다.
  const sharing = rooms.filter((r) => r.shareShop);

  /** 전에 적어둔 곳들을 골라 쓸 수 있게 — 매번 '쿠팡'을 다시 치지 않도록 */
  const places = useMemo(
    () => [...new Set(shopping.map((i) => i.place).filter(Boolean))].sort(),
    [shopping],
  );

  if (!item) return null;

  const submit = () => {
    if (!title.trim()) {
      document.getElementById('s-title')?.focus();
      toast('이름을 적어주세요');
      return;
    }
    updateShopItem(item.id, { title, note, place, roomId });
    closeSheet();
    const room = sharing.find((r) => r.id === roomId);
    // 자리를 옮겼으면 어디로 갔는지 말해준다 — 목록에서 사라진 것처럼 보이지 않게
    toast(
      roomId === (item.roomId ?? null)
        ? '수정했습니다'
        : room
          ? `${room.name} 목록으로 옮겼어요`
          : '나만 보는 목록으로 옮겼어요',
    );
  };

  return (
    <Sheet title="장보기 항목" onClose={closeSheet}>
      <Field label="이름" htmlFor="s-title">
        <input
          id="s-title"
          type="text"
          className="field-input"
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field label="어디서" htmlFor="s-place">
        <input
          id="s-place"
          type="text"
          className="field-input"
          list="shop-places"
          placeholder="예: 쿠팡, 이마트"
          autoComplete="off"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
        />
        <datalist id="shop-places">
          {places.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>

      <Field label="메모" htmlFor="s-note">
        <textarea
          id="s-note"
          rows={2}
          className="field-input resize-y leading-[1.6]"
          placeholder="예: 저지방으로, 2개"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      {/*
        장보기는 **한 곳만** 고른다. 두 곳에 필요하면 두 번 적는다 —
        어차피 따로 사야 하고, 하나를 담았다고 저쪽이 지워지면 안 된다.
      */}
      {sharing.length > 0 &&
        (opened ? (
          <div className="mb-4 border-t border-line2 pt-4">
            <p className="mb-2 text-[12.5px] font-medium text-ink2">
              어디에 <span className="font-normal text-ink3">· 한 곳만 고를 수 있어요</span>
            </p>
            <div className="flex flex-wrap gap-[7px]">
              <RoomChip on={roomId === null} onClick={() => setRoomId(null)}>
                나만
              </RoomChip>
              {sharing.map((r) => (
                <RoomChip
                  key={r.id}
                  on={roomId === r.id}
                  color={r.color}
                  onClick={() => setRoomId(r.id)}
                >
                  {r.name}
                </RoomChip>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="mb-4 flex w-full items-center gap-2.5 border-t border-line2 pt-4 text-left text-[12.5px] text-ink3"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-edge px-3 py-[5px] font-medium text-ink2">
              <PeopleIcon className="h-[13px] w-[13px]" />＋ 공유
            </span>
            나만 보고 있어요
          </button>
        ))}

      <GoButton onClick={submit}>저장</GoButton>
      <DangerButton
        onClick={() => {
          removeShopItem(item.id);
          closeSheet();
          toast(`${item.title} — 목록에서 뺐습니다`);
        }}
      >
        이 항목 삭제
      </DangerButton>
    </Sheet>
  );
}

/** 고른 것은 방 색으로 채우고, 안 고른 것은 옅게 — 어디로 가는지가 색으로 먼저 읽힌다 */
function RoomChip({
  children,
  on,
  color,
  onClick,
}: {
  children: React.ReactNode;
  on: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-[15px] py-2.5 text-[13px] font-medium shadow-card active:scale-95 ${
        color ? '' : on ? 'bg-accent text-white' : 'bg-card text-ink2'
      }`}
      style={color ? (on ? { background: color, color: '#fff' } : { background: bandOf(color) }) : undefined}
    >
      {children}
      {on && <span className="text-[10px]">✓</span>}
    </button>
  );
}
