import { isUuid, uid } from '../id';
import type { Repository, Snapshot } from '../repository';
import type { Category, Memo, Preset, ShopItem, Task } from '../types';
import { drop, pull, push, type Kind } from './remote';

/** updatedAt을 가진 무엇이든 */
type Stamped = { id: string; updatedAt: string };

/**
 * 로컬 저장소를 그대로 쓰면서 서버와 맞춘다.
 *
 * 화면은 늘 로컬만 본다 — 체크하면 즉시 반응하고 지하철에서도 열린다.
 * 서버로 보내는 일은 뒤에서 하고, 실패해도 화면은 멀쩡하다.
 * 못 보낸 것은 다음 sync()가 주워간다. syncedAt이 성공했을 때만 앞으로 가기 때문이다.
 */
export class SyncedRepository implements Repository {
  constructor(
    private local: Repository,
    private owner: string,
  ) {}

  /** 서버로 보내다 실패해도 화면을 막지 않는다. 다음 sync가 다시 가져간다. */
  private async quietly(job: () => Promise<unknown>) {
    try {
      await job();
    } catch {
      /* 다음 sync에서 */
    }
  }

  init() {
    return this.local.init();
  }
  loadAll() {
    return this.local.loadAll();
  }
  loadSettings() {
    return this.local.loadSettings();
  }
  saveSettings(patch: Parameters<Repository['saveSettings']>[0]) {
    return this.local.saveSettings(patch);
  }
  remember(kind: string, ids: string[]) {
    return this.local.remember(kind, ids);
  }
  graves() {
    return this.local.graves();
  }
  forget(ids: string[]) {
    return this.local.forget(ids);
  }

  /* ───────── 쓰기 — 로컬 먼저, 서버는 뒤따라 ───────── */

  private async save(kind: Kind, rows: unknown[], write: Promise<void>) {
    await write;
    void this.quietly(() => push(kind, rows, this.owner));
  }

  private async erase(kind: Kind, ids: string[], write: Promise<void>) {
    await write;
    await this.local.remember(kind, ids);
    void this.quietly(async () => {
      await drop(kind, ids);
      await this.local.forget(ids);
    });
  }

  saveCategory(c: Category) {
    return this.save('categories', [c], this.local.saveCategory(c));
  }
  deleteCategory(id: string) {
    return this.erase('categories', [id], this.local.deleteCategory(id));
  }
  saveTask(t: Task) {
    return this.save('tasks', [t], this.local.saveTask(t));
  }
  saveTasks(ts: Task[]) {
    return this.save('tasks', ts, this.local.saveTasks(ts));
  }
  deleteTask(id: string) {
    return this.erase('tasks', [id], this.local.deleteTask(id));
  }
  deleteTasks(ids: string[]) {
    return this.erase('tasks', ids, this.local.deleteTasks(ids));
  }
  savePreset(p: Preset) {
    return this.save('presets', [p], this.local.savePreset(p));
  }
  deletePreset(id: string) {
    return this.erase('presets', [id], this.local.deletePreset(id));
  }
  saveShopItem(i: ShopItem) {
    return this.save('shopping', [i], this.local.saveShopItem(i));
  }
  deleteShopItems(ids: string[]) {
    return this.erase('shopping', ids, this.local.deleteShopItems(ids));
  }
  saveMemo(m: Memo) {
    return this.save('memos', [m], this.local.saveMemo(m));
  }
  deleteMemo(id: string) {
    return this.erase('memos', [id], this.local.deleteMemo(id));
  }

  async clearAll() {
    const before = await this.local.loadAll();
    await this.local.clearAll();
    // 비운 것도 서버에 알려야 한다. 안 그러면 다음 sync에 도로 내려온다.
    await this.erase('tasks', before.tasks.map((t) => t.id), Promise.resolve());
    await this.erase('presets', before.presets.map((p) => p.id), Promise.resolve());
    await this.erase('shopping', before.shopping.map((i) => i.id), Promise.resolve());
    await this.erase('memos', before.memos.map((m) => m.id), Promise.resolve());
    await this.erase('categories', before.categories.map((c) => c.id), Promise.resolve());
  }

  /* ───────── 맞추기 ───────── */

  async sync(): Promise<Snapshot> {
    const settings = await this.local.loadSettings();
    const since = (await this.handOver(settings.ownerId)) ? '' : (settings.syncedAt ?? '');

    await this.uuidify();
    await this.flushGraves();

    const theirs = await pull(this.owner);
    await this.alignCategories(theirs.categories);
    const mine = await this.local.loadAll();

    const merged: Snapshot = {
      categories: await this.settle('categories', mine.categories, theirs.categories, since),
      tasks: await this.settle('tasks', mine.tasks, theirs.tasks, since),
      presets: await this.settle('presets', mine.presets, theirs.presets, since),
      shopping: await this.settle('shopping', mine.shopping, theirs.shopping, since),
      memos: await this.settle('memos', mine.memos, theirs.memos, since),
    };

    await this.local.saveSettings({ syncedAt: new Date().toISOString(), ownerId: this.owner });
    return merged;
  }

  /**
   * 이 기기에 남아 있던 게 다른 사람 목록이면 비우고 시작한다.
   *
   * 저장소는 계정별이 아니라 브라우저별이다. 앞사람 목록을 그대로 두면
   * 그게 '아직 안 올린 것'으로 보여서 뒷사람 계정으로 올라간다.
   * 앞사람 것은 이미 서버에 있으니, 여기서 비워도 잃는 게 아니다.
   */
  private async handOver(previous: string): Promise<boolean> {
    if (!previous || previous === this.owner) return false;
    const graves = await this.local.graves();
    await this.local.clearAll(); // 로컬만 비운다 — 앞사람 서버 목록은 그대로 둔다
    await this.local.forget(graves.map((g) => g.id));
    await this.local.saveSettings({ syncedAt: '', ownerId: this.owner });
    return true;
  }

  /**
   * 한 종류를 맞춘다.
   * - 양쪽에 있으면 updatedAt이 늦은 쪽이 이긴다
   * - 서버에만 있으면 받아온다
   * - 로컬에만 있는데 지난 동기화 뒤에 고친 것이면 아직 안 올린 것 → 올린다
   * - 로컬에만 있는데 그전 것이면 남이 지운 것 → 여기서도 지운다
   */
  private async settle<T extends Stamped>(
    kind: Kind,
    mine: T[],
    theirs: T[],
    since: string,
  ): Promise<T[]> {
    const remote = new Map(theirs.map((r) => [r.id, r]));
    const keep: T[] = [];
    const toPush: T[] = [];
    const toDrop: string[] = [];

    for (const row of mine) {
      const other = remote.get(row.id);
      if (!other) {
        if (row.updatedAt > since) {
          keep.push(row);
          toPush.push(row);
        } else {
          toDrop.push(row.id);
        }
        continue;
      }
      remote.delete(row.id);
      if (row.updatedAt > other.updatedAt) {
        keep.push(row);
        toPush.push(row);
      } else {
        keep.push(other);
      }
    }

    const arrived = [...remote.values()];
    keep.push(...arrived);

    if (toPush.length) await push(kind, toPush, this.owner);
    if (toDrop.length) await this.dropLocal(kind, toDrop);
    if (arrived.length) await this.saveLocal(kind, arrived);

    return keep;
  }

  /**
   * 이름이 같은 카테고리는 서버 것으로 몰아준다.
   *
   * 기기마다 처음 켤 때 기본 카테고리 다섯 개를 각자 만들어서 id가 다르다.
   * 그대로 합치면 필터 줄에 '집안일'이 두 개 뜨고, 할 일마다 다른 쪽을 가리켜 색이 갈린다.
   * 카테고리는 "이름이 같으면 같은 것"이 거의 확실해서 이 정도는 봐줘도 된다.
   */
  private async alignCategories(theirs: Category[]) {
    if (theirs.length === 0) return;

    const mine = await this.local.loadAll();
    const onServer = new Set(theirs.map((c) => c.id));
    const byName = new Map(theirs.map((c) => [c.name, c.id]));

    const moved = new Map<string, string>();
    for (const c of mine.categories) {
      const same = byName.get(c.name);
      if (same && !onServer.has(c.id)) moved.set(c.id, same);
    }
    if (moved.size === 0) return;

    const point = (id: string) => moved.get(id) ?? id;

    const tasks = mine.tasks
      .filter((t) => moved.has(t.categoryId))
      .map((t) => ({ ...t, categoryId: point(t.categoryId) }));
    const presets = mine.presets
      .filter((p) => moved.has(p.categoryId))
      .map((p) => ({ ...p, categoryId: point(p.categoryId) }));

    if (tasks.length) await this.local.saveTasks(tasks);
    for (const p of presets) await this.local.savePreset(p);

    // 로컬 것만 치운다. 서버에 알리면 안 된다 — 서버 쪽은 살아 있어야 하는 그 카테고리다.
    for (const id of moved.keys()) await this.local.deleteCategory(id);
  }

  /** 지웠다고 적어둔 것들을 서버에도 알린다 */
  private async flushGraves() {
    const graves = await this.local.graves();
    if (graves.length === 0) return;
    const byKind = new Map<string, string[]>();
    for (const g of graves) byKind.set(g.kind, [...(byKind.get(g.kind) ?? []), g.id]);
    for (const [kind, ids] of byKind) await drop(kind as Kind, ids);
    await this.local.forget(graves.map((g) => g.id));
  }

  /**
   * 옛날 방식으로 만든 id는 uuid가 아니라 서버가 안 받는다.
   * 새 번호를 매기면서 카테고리·회차 연결도 같이 옮긴다. 한 번 지나가면 다시 걸릴 일이 없다.
   */
  private async uuidify() {
    const snap = await this.local.loadAll();
    const renamed = new Map<string, string>();
    const mark = (id: string) => {
      if (id && !isUuid(id) && !renamed.has(id)) renamed.set(id, uid());
    };

    snap.categories.forEach((c) => mark(c.id));
    snap.tasks.forEach((t) => mark(t.id));
    snap.presets.forEach((p) => mark(p.id));
    snap.shopping.forEach((i) => mark(i.id));
    snap.memos.forEach((m) => mark(m.id));
    if (renamed.size === 0) return;

    const now = (id: string) => renamed.get(id) ?? id;

    const categories = snap.categories.map((c) => ({ ...c, id: now(c.id) }));
    const tasks = snap.tasks.map((t) => ({
      ...t,
      id: now(t.id),
      categoryId: now(t.categoryId),
      parentId: t.parentId ? now(t.parentId) : null,
    }));
    const presets = snap.presets.map((p) => ({ ...p, id: now(p.id), categoryId: now(p.categoryId) }));
    const shopping = snap.shopping.map((i) => ({ ...i, id: now(i.id) }));
    const memos = snap.memos.map((m) => ({ ...m, id: now(m.id) }));

    // 옛 번호를 지우고 새 번호로 다시 넣는다. 서버에는 아직 없던 것들이라 알릴 것도 없다.
    const old = [...renamed.keys()];
    await this.local.deleteTasks(old);
    for (const id of old) {
      await this.local.deleteCategory(id);
      await this.local.deletePreset(id);
      await this.local.deleteMemo(id);
    }
    await this.local.deleteShopItems(old);
    await this.local.forget(old);

    for (const c of categories) await this.local.saveCategory(c);
    await this.local.saveTasks(tasks);
    for (const p of presets) await this.local.savePreset(p);
    for (const i of shopping) await this.local.saveShopItem(i);
    for (const m of memos) await this.local.saveMemo(m);
  }

  private async saveLocal(kind: Kind, rows: unknown[]) {
    if (kind === 'tasks') return this.local.saveTasks(rows as Task[]);
    for (const row of rows) {
      if (kind === 'categories') await this.local.saveCategory(row as Category);
      else if (kind === 'presets') await this.local.savePreset(row as Preset);
      else if (kind === 'shopping') await this.local.saveShopItem(row as ShopItem);
      else if (kind === 'memos') await this.local.saveMemo(row as Memo);
    }
  }

  private async dropLocal(kind: Kind, ids: string[]) {
    if (kind === 'tasks') return this.local.deleteTasks(ids);
    if (kind === 'shopping') return this.local.deleteShopItems(ids);
    for (const id of ids) {
      if (kind === 'categories') await this.local.deleteCategory(id);
      else if (kind === 'presets') await this.local.deletePreset(id);
      else if (kind === 'memos') await this.local.deleteMemo(id);
    }
  }
}
