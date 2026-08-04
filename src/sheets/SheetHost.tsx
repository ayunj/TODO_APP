'use client';

import CategoryListSheet from './CategoryListSheet';
import CategorySheet from './CategorySheet';
import PresetListSheet from './PresetListSheet';
import PresetSheet from './PresetSheet';
import SettingsSheet from './SettingsSheet';
import ShareSheet from './ShareSheet';
import ShopItemSheet from './ShopItemSheet';
import TaskSheet from './TaskSheet';
import { useUi } from '@/lib/ui';

/** 시트는 한 번에 하나만. 하위 시트에는 상위로 돌아가는 버튼을 둔다. */
export default function SheetHost() {
  const { sheet } = useUi();
  if (!sheet) return null;

  switch (sheet.kind) {
    case 'task':
      return <TaskSheet key={sheet.id ?? 'new'} id={sheet.id} />;
    case 'settings':
      return <SettingsSheet />;
    case 'presetList':
      return <PresetListSheet />;
    case 'preset':
      return <PresetSheet key={sheet.id ?? 'new'} id={sheet.id} />;
    case 'categoryList':
      return <CategoryListSheet />;
    case 'category':
      return <CategorySheet key={sheet.id ?? 'new'} id={sheet.id} />;
    case 'shopItem':
      return <ShopItemSheet key={sheet.id} id={sheet.id} />;
    case 'share':
      return <ShareSheet />;
  }
}
