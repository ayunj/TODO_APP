import type { Repository, Snapshot } from '../repository';
import type { Category, Grave, Memo, Preset, Settings, ShopItem, Task } from '../types';

/** SSR·테스트용. IndexedDB가 없는 곳에서 앱이 죽지 않게 한다. */
export class MemoryRepository implements Repository {
  private categories = new Map<string, Category>();
  private tasks = new Map<string, Task>();
  private presets = new Map<string, Preset>();
  private shopping = new Map<string, ShopItem>();
  private memos = new Map<string, Memo>();
  private graveyard = new Map<string, Grave>();
  private settings: Settings = { onboarded: false, memoSeenAt: '', syncedAt: '', ownerId: '' };

  async init() {}

  async loadAll(): Promise<Snapshot> {
    return {
      categories: [...this.categories.values()].sort((a, b) => a.order - b.order),
      tasks: [...this.tasks.values()],
      presets: [...this.presets.values()],
      shopping: [...this.shopping.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      memos: [...this.memos.values()],
    };
  }

  async saveCategory(c: Category) {
    this.categories.set(c.id, c);
  }
  async deleteCategory(id: string) {
    this.categories.delete(id);
  }
  async saveTask(t: Task) {
    this.tasks.set(t.id, t);
  }
  async saveTasks(ts: Task[]) {
    ts.forEach((t) => this.tasks.set(t.id, t));
  }
  async deleteTask(id: string) {
    this.tasks.delete(id);
  }
  async deleteTasks(ids: string[]) {
    ids.forEach((id) => this.tasks.delete(id));
  }
  async savePreset(p: Preset) {
    this.presets.set(p.id, p);
  }
  async deletePreset(id: string) {
    this.presets.delete(id);
  }
  async saveShopItem(i: ShopItem) {
    this.shopping.set(i.id, i);
  }
  async deleteShopItems(ids: string[]) {
    ids.forEach((id) => this.shopping.delete(id));
  }
  async saveMemo(m: Memo) {
    this.memos.set(m.id, m);
  }
  async deleteMemo(id: string) {
    this.memos.delete(id);
  }
  async remember(kind: string, ids: string[]) {
    const at = new Date().toISOString();
    ids.forEach((id) => this.graveyard.set(id, { id, kind, at }));
  }
  async graves() {
    return [...this.graveyard.values()];
  }
  async forget(ids: string[]) {
    ids.forEach((id) => this.graveyard.delete(id));
  }
  async loadSettings(): Promise<Settings> {
    return { ...this.settings };
  }
  async saveSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
  }
  async clearAll() {
    this.categories.clear();
    this.tasks.clear();
    this.presets.clear();
    this.shopping.clear();
    this.memos.clear();
  }
}
