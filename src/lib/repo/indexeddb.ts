import type { Repository, Snapshot } from '../repository';
import type { Category, Preset, Settings, ShopItem, Task } from '../types';

const DB_NAME = 'todolist';
const DB_VERSION = 3;
/** 초기화가 비우는 것들 */
const DATA_STORES = ['categories', 'tasks', 'presets', 'shopping'] as const;
const STORES = [...DATA_STORES, 'settings'] as const;
type StoreName = (typeof STORES)[number];

const SETTINGS_ID = 'app';
const DEFAULT_SETTINGS: Settings = { onboarded: false };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** 1단계 저장소. 로그인·서버 없이 이 기기 안에서만 산다. */
export class IndexedDbRepository implements Repository {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!this.db) this.db = await open();
  }

  private async use(): Promise<IDBDatabase> {
    await this.init();
    return this.db!;
  }

  private async readAll<T>(name: StoreName): Promise<T[]> {
    const db = await this.use();
    return new Promise((resolve, reject) => {
      const req = db.transaction(name, 'readonly').objectStore(name).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  private async put(name: StoreName, values: unknown[]): Promise<void> {
    const db = await this.use();
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    for (const v of values) store.put(v);
    return done(tx);
  }

  private async del(name: StoreName, ids: string[]): Promise<void> {
    const db = await this.use();
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    for (const id of ids) store.delete(id);
    return done(tx);
  }

  async loadAll(): Promise<Snapshot> {
    const [categories, tasks, presets, shopping] = await Promise.all([
      this.readAll<Category>('categories'),
      this.readAll<Task>('tasks'),
      this.readAll<Preset>('presets'),
      this.readAll<ShopItem>('shopping'),
    ]);
    return {
      categories: categories.sort((a, b) => a.order - b.order),
      tasks,
      presets,
      shopping: shopping.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  }

  saveCategory(category: Category) {
    return this.put('categories', [category]);
  }
  deleteCategory(id: string) {
    return this.del('categories', [id]);
  }

  saveTask(task: Task) {
    return this.put('tasks', [task]);
  }
  saveTasks(tasks: Task[]) {
    return this.put('tasks', tasks);
  }
  deleteTask(id: string) {
    return this.del('tasks', [id]);
  }
  deleteTasks(ids: string[]) {
    return this.del('tasks', ids);
  }

  savePreset(preset: Preset) {
    return this.put('presets', [preset]);
  }
  deletePreset(id: string) {
    return this.del('presets', [id]);
  }

  saveShopItem(item: ShopItem) {
    return this.put('shopping', [item]);
  }
  deleteShopItems(ids: string[]) {
    return this.del('shopping', ids);
  }

  async loadSettings(): Promise<Settings> {
    const rows = await this.readAll<Settings & { id: string }>('settings');
    return { ...DEFAULT_SETTINGS, ...rows.find((r) => r.id === SETTINGS_ID) };
  }

  async saveSettings(patch: Partial<Settings>): Promise<void> {
    const current = await this.loadSettings();
    return this.put('settings', [{ ...current, ...patch, id: SETTINGS_ID }]);
  }

  async clearAll(): Promise<void> {
    const db = await this.use();
    const tx = db.transaction(DATA_STORES as unknown as string[], 'readwrite');
    for (const name of DATA_STORES) tx.objectStore(name).clear();
    return done(tx);
  }
}
