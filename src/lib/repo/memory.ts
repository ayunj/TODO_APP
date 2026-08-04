import type { Repository, Snapshot } from '../repository';
import type { Category, Preset, Settings, Task } from '../types';

/** SSR·테스트용. IndexedDB가 없는 곳에서 앱이 죽지 않게 한다. */
export class MemoryRepository implements Repository {
  private categories = new Map<string, Category>();
  private tasks = new Map<string, Task>();
  private presets = new Map<string, Preset>();
  private settings: Settings = { onboarded: false };

  async init() {}

  async loadAll(): Promise<Snapshot> {
    return {
      categories: [...this.categories.values()].sort((a, b) => a.order - b.order),
      tasks: [...this.tasks.values()],
      presets: [...this.presets.values()],
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
  }
}
