'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { ColorPicker, Field, GoButton } from '@/components/form';
import { useRooms } from '@/lib/rooms';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';

/**
 * 방 이름·방 색·이 방에서 불릴 내 이름 — **값 하나를 손보는 자리**라 시트다.
 * 화면을 갈아탈 일이 아니고, 뒤에 있던 방 설정이 그대로 남아 있는 게 맞다.
 */
export default function RoomFieldSheet({
  id,
  field,
}: {
  id: string;
  field: 'name' | 'color' | 'myName';
}) {
  const { rooms, myNameIn, renameRoom, recolorRoom, renameMe } = useRooms();
  const { closeSheet } = useUi();
  const room = rooms.find((r) => r.id === id) ?? null;

  const [text, setText] = useState(() => {
    if (!room) return '';
    return field === 'name' ? room.name : field === 'myName' ? myNameIn(room.id) : '';
  });
  const [busy, setBusy] = useState(false);

  if (!room) {
    return (
      <Sheet title="방" onClose={closeSheet}>
        <p className="ml-1 text-[13px] text-ink3">방을 찾을 수 없어요.</p>
      </Sheet>
    );
  }

  const title = field === 'name' ? '방 이름' : field === 'color' ? '방 색' : '내 이름';

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast(field === 'name' ? '방 이름을 적어주세요' : '이름을 적어주세요');
      return;
    }
    setBusy(true);
    try {
      if (field === 'name') await renameRoom(room.id, trimmed);
      else await renameMe(room.id, trimmed);
      toast('바꿨어요');
      closeSheet();
    } catch {
      toast('바꾸지 못했습니다.');
      setBusy(false);
    }
  };

  // 색은 고르는 순간이 곧 정하는 순간이다 — 저장 버튼을 따로 두지 않는다
  if (field === 'color') {
    return (
      <Sheet title={title} onClose={closeSheet}>
        <ColorPicker
          value={room.color}
          onChange={async (c) => {
            try {
              await recolorRoom(room.id, c);
              closeSheet();
            } catch {
              toast('바꾸지 못했습니다.');
            }
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet title={title} onClose={closeSheet}>
      <Field
        label={field === 'myName' ? '이 방에서 이렇게 불려요' : '이름'}
        htmlFor="room-field"
      >
        <input
          id="room-field"
          type="text"
          className="field-input"
          autoComplete="off"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <GoButton onClick={save} disabled={busy}>
        저장
      </GoButton>
    </Sheet>
  );
}
