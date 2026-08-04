import type { Category, Preset, Settings, ShopItem, Task } from './types';

/**
 * 데이터 접근은 반드시 이 한 겹을 지난다.
 * 1단계 = IndexedDB 구현체, 2단계 = Supabase 구현체로 갈아끼운다.
 * 컴포넌트가 저장소를 직접 부르는 일이 없게 한다.
 */
export interface Repository {
  init(): Promise<void>;

  loadAll(): Promise<Snapshot>;

  saveCategory(category: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  saveTask(task: Task): Promise<void>;
  saveTasks(tasks: Task[]): Promise<void>;
  deleteTask(id: string): Promise<void>;
  deleteTasks(ids: string[]): Promise<void>;

  savePreset(preset: Preset): Promise<void>;
  deletePreset(id: string): Promise<void>;

  saveShopItem(item: ShopItem): Promise<void>;
  deleteShopItems(ids: string[]): Promise<void>;

  loadSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<void>;

  /** 할 일·자주 쓰는 일·카테고리만 지운다. 설정은 남는다. */
  clearAll(): Promise<void>;
}

export interface Snapshot {
  categories: Category[];
  tasks: Task[];
  presets: Preset[];
  shopping: ShopItem[];
}
