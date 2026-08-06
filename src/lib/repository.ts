import type { Category, Grave, Memo, Preset, Settings, ShopItem, Task } from './types';

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

  saveMemo(memo: Memo): Promise<void>;
  deleteMemo(id: string): Promise<void>;

  loadSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<void>;

  /** 지운 것을 적어둔다. 서버에도 알려주기 전까지는 기억해야 한다. */
  remember(kind: string, ids: string[]): Promise<void>;
  graves(): Promise<Grave[]>;
  forget(ids: string[]): Promise<void>;

  /** 할 일·즐겨찾기·카테고리만 지운다. 설정은 남는다. */
  clearAll(): Promise<void>;

  /**
   * 서버와 맞추고 새 스냅샷을 돌려준다.
   * 로그인 전에는 맞출 서버가 없으므로 없는 게 정상이다.
   */
  sync?(): Promise<Snapshot>;
}

export interface Snapshot {
  categories: Category[];
  tasks: Task[];
  presets: Preset[];
  shopping: ShopItem[];
  memos: Memo[];
}
