'use client';

import PresetSheet from './PresetSheet';
import RoomFieldSheet from './RoomFieldSheet';
import ShopItemSheet from './ShopItemSheet';
import TaskSheet from './TaskSheet';
import { useUi } from '@/lib/ui';

/**
 * 시트는 한 번에 하나만, 그리고 **항목 하나를 손보는 자리**만 남는다.
 * 목록·설정처럼 안으로 더 들어가는 것은 밀고 들어가는 화면이다 — 시트를 쌓지 않는다.
 */
export default function SheetHost() {
  const { sheet } = useUi();
  if (!sheet) return null;

  switch (sheet.kind) {
    case 'task':
      return <TaskSheet key={sheet.id ?? 'new'} id={sheet.id} />;
    case 'preset':
      return <PresetSheet key={sheet.id ?? 'new'} id={sheet.id} />;
    case 'shopItem':
      return <ShopItemSheet key={sheet.id} id={sheet.id} />;
    case 'roomField':
      return <RoomFieldSheet key={`${sheet.id}-${sheet.field}`} id={sheet.id} field={sheet.field} />;
  }
}
