'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CATEGORIES, LEGACY_COLOR } from './constants';
import { addDays, todayStr } from './date';
import { stamp, uid } from './id';
import { baseOf, spawnNext } from './repeat';
import { getRepository } from './repo';
import type { Repository } from './repository';
import { toast } from './toast';
import type { Category, DateStr, Preset, Priority, ShopItem, Task } from './types';

export interface TaskInput {
  title: string;
  memo: string;
  categoryId: string;
  priority: Priority;
  date: DateStr;
  repeatDays: number;
  repeatUntil: DateStr | null;
}

export interface PresetInput {
  title: string;
  memo: string;
  categoryId: string;
  priority: Priority;
  repeatDays: number;
  repeatUntil: DateStr | null;
}

interface StoreValue {
  loading: boolean;
  /** 첫 화면을 지났는지. 지나기 전에는 앱 껍데기를 그리지 않는다. */
  onboarded: boolean;
  /** 첫 화면의 `시작하기` — 한 번 누르면 다시 나오지 않는다 */
  finishWelcome: () => void;
  categories: Category[];
  tasks: Task[];
  presets: Preset[];
  categoryOf: (id: string) => Category;

  addTask: (input: TaskInput) => Task;
  updateTask: (id: string, input: TaskInput) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => void;

  addPreset: (input: PresetInput) => void;
  updatePreset: (id: string, input: PresetInput) => void;
  removePreset: (id: string) => void;
  /** 칩을 눌러 그 날 목록에 바로 넣기 */
  applyPreset: (presetId: string, date: DateStr) => void;

  /* ── 장보기 ── */
  shopping: ShopItem[];
  addShopItem: (title: string, extra?: { note?: string; place?: string }) => void;
  updateShopItem: (id: string, input: { title: string; note: string; place: string }) => void;
  toggleShopItem: (id: string) => void;
  removeShopItem: (id: string) => void;
  /** 담은 것을 기록으로 넘긴다. 지우지 않는다 — 언제 샀는지가 남아야 한다. */
  archiveBoughtShopItems: () => void;
  /** 기록에 있는 것을 다시 목록에 올린다 (새 항목으로 — 지난 구매 기록은 그대로 둔다) */
  rebuyShopItem: (id: string) => void;

  addCategory: (name: string, color: string) => void;
  updateCategory: (id: string, name: string, color: string) => void;
  /** 지운 카테고리의 할 일은 남은 카테고리로 옮긴다. 옮겨진 개수를 돌려준다. */
  removeCategory: (id: string) => number;

  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const FALLBACK_CATEGORY: Category = {
  id: 'home',
  name: '집안일',
  color: '#8EC9B5',
  order: 0,
  updatedAt: '',
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const repoRef = useRef<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [shopping, setShopping] = useState<ShopItem[]>([]);

  /** 쓰기는 화면을 먼저 바꾸고 뒤에서 조용히 저장한다 (낙관적 업데이트) */
  const repo = useCallback(() => {
    if (!repoRef.current) repoRef.current = getRepository();
    return repoRef.current;
  }, []);

  const write = useCallback(
    (job: (r: Repository) => Promise<unknown>) => {
      void job(repo()).catch(() => toast('저장하지 못했습니다. 화면은 그대로 쓸 수 있어요.'));
    },
    [repo],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = repo();
      await r.init();
      const [snap, settings] = await Promise.all([r.loadAll(), r.loadSettings()]);
      if (!alive) return;

      let cats = snap.categories;
      if (cats.length === 0) {
        cats = DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: stamp() }));
        await Promise.all(cats.map((c) => r.saveCategory(c)));
      } else {
        // 예전 팔레트로 저장된 색은 새 파스텔 색으로 한 번만 옮긴다
        const repainted = cats
          .filter((c) => LEGACY_COLOR[c.color])
          .map((c) => ({ ...c, color: LEGACY_COLOR[c.color], updatedAt: stamp() }));
        if (repainted.length) {
          cats = cats.map((c) => repainted.find((x) => x.id === c.id) ?? c);
          await Promise.all(repainted.map((c) => r.saveCategory(c)));
        }
      }

      let seeded = snap.presets;
      if (seeded.length === 0 && snap.tasks.length === 0) {
        seeded = seedPresets();
        await Promise.all(seeded.map((p) => r.savePreset(p)));
      }

      setCategories(cats);
      setTasks(snap.tasks);
      setPresets(seeded);
      // 나중에 생긴 칸들이 없는 옛 항목에는 기본값을 채워준다
      setShopping(
        snap.shopping.map((i) => ({
          ...i,
          note: i.note ?? '',
          place: i.place ?? '',
          archived: i.archived ?? false,
          boughtOn: i.boughtOn ?? null,
        })),
      );
      setOnboarded(settings.onboarded);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [repo]);

  const categoryOf = useCallback(
    (id: string) => categories.find((c) => c.id === id) ?? categories[0] ?? FALLBACK_CATEGORY,
    [categories],
  );

  const finishWelcome = useCallback(() => {
    setOnboarded(true);
    write((r) => r.saveSettings({ onboarded: true }));
  }, [write]);

  /* ───────── 할 일 ───────── */

  const addTask = useCallback(
    (input: TaskInput): Task => {
      const now = stamp();
      const task: Task = {
        id: uid(),
        roomId: null,
        title: input.title.trim(),
        memo: input.memo,
        categoryId: input.categoryId,
        priority: input.priority,
        date: input.date,
        repeatDays: input.repeatDays,
        repeatUntil: input.repeatUntil,
        cycleSince: input.repeatDays > 0 ? addDays(input.date, -input.repeatDays) : null,
        parentId: null,
        done: false,
        doneOn: null,
        doneBy: null,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => [...prev, task]);
      write((r) => r.saveTask(task));
      return task;
    },
    [write],
  );

  const updateTask = useCallback(
    (id: string, input: TaskInput) => {
      const current = tasks.find((t) => t.id === id);
      if (!current) return;
      const today = todayStr();

      const updated: Task = {
        ...current,
        title: input.title.trim(),
        memo: input.memo,
        categoryId: input.categoryId,
        priority: input.priority,
        date: input.date,
        repeatDays: input.repeatDays,
        repeatUntil: input.repeatUntil,
        updatedAt: stamp(),
      };

      // 완료해서 이미 생겨난 다음 회차가 있으면 결을 맞춰준다
      const pending = tasks.find((t) => t.parentId === id && !t.done) ?? null;
      let nextPending: Task | null = null;
      let dropPending = false;

      if (pending) {
        if (input.repeatDays <= 0) {
          dropPending = true; // 주기를 0으로 바꾸면 대기 중인 회차를 지운다
        } else {
          const since = baseOf(updated, today);
          const date = addDays(since, input.repeatDays);
          if (input.repeatUntil && date > input.repeatUntil) {
            dropPending = true; // 종료일을 앞당겼고 대기 회차가 그 날짜를 넘긴다
          } else {
            nextPending = {
              ...pending,
              title: updated.title,
              memo: updated.memo,
              categoryId: updated.categoryId,
              priority: updated.priority,
              repeatDays: input.repeatDays,
              repeatUntil: input.repeatUntil,
              cycleSince: since,
              date,
              updatedAt: stamp(),
            };
          }
        }
      }

      setTasks(
        tasks
          .filter((t) => !(dropPending && pending && t.id === pending.id))
          .map((t) =>
            t.id === id ? updated : nextPending && t.id === nextPending.id ? nextPending : t,
          ),
      );

      write(async (r) => {
        await r.saveTask(updated);
        if (dropPending && pending) await r.deleteTask(pending.id);
        if (nextPending) await r.saveTask(nextPending);
      });
    },
    [tasks, write],
  );

  const removeTask = useCallback(
    (id: string) => {
      const orphans = tasks.filter((t) => t.parentId === id && !t.done).map((t) => t.id);
      setTasks(tasks.filter((t) => t.id !== id && !orphans.includes(t.id)));
      write((r) => r.deleteTasks([id, ...orphans]));
    },
    [tasks, write],
  );

  const toggleTask = useCallback(
    (id: string) => {
      const current = tasks.find((t) => t.id === id);
      if (!current) return;
      const today = todayStr();

      // 완료 취소 — 이 항목이 낳은 미완료 회차를 집어든다
      if (current.done) {
        const undone: Task = {
          ...current,
          done: false,
          doneOn: null,
          doneBy: null,
          updatedAt: stamp(),
        };
        const orphans = tasks.filter((t) => t.parentId === id && !t.done).map((t) => t.id);
        setTasks(tasks.filter((t) => !orphans.includes(t.id)).map((t) => (t.id === id ? undone : t)));
        write(async (r) => {
          await r.saveTask(undone);
          if (orphans.length) await r.deleteTasks(orphans);
        });
        return;
      }

      const done: Task = {
        ...current,
        done: true,
        doneOn: today,
        doneBy: null,
        updatedAt: stamp(),
      };

      // 이미 이 항목을 부모로 하는 미완료 회차가 있으면 만들지 않는다 (중복 방지)
      const hasPending = tasks.some((t) => t.parentId === id && !t.done);
      let next: Task | null = null;
      if (current.repeatDays > 0 && !hasPending) {
        next = spawnNext(done, today);
        if (next) toast(`다음 ${done.title} → ${done.repeatDays}일 뒤`);
        else toast(`${done.title} — 반복이 끝났습니다`);
      }

      const mapped = tasks.map((t) => (t.id === id ? done : t));
      setTasks(next ? [...mapped, next] : mapped);

      write(async (r) => {
        await r.saveTask(done);
        if (next) await r.saveTask(next);
      });
    },
    [tasks, write],
  );

  /* ───────── 자주 쓰는 일 ───────── */

  const addPreset = useCallback(
    (input: PresetInput) => {
      const preset: Preset = { id: uid(), roomId: null, ...input, updatedAt: stamp() };
      setPresets((prev) => [...prev, preset]);
      write((r) => r.savePreset(preset));
    },
    [write],
  );


  const updatePreset = useCallback(
    (id: string, input: PresetInput) => {
      const found = presets.find((p) => p.id === id);
      if (!found) return;
      const updated: Preset = { ...found, ...input, updatedAt: stamp() };
      setPresets(presets.map((p) => (p.id === id ? updated : p)));
      write((r) => r.savePreset(updated));
    },
    [presets, write],
  );

  const removePreset = useCallback(
    (id: string) => {
      setPresets((prev) => prev.filter((p) => p.id !== id));
      write((r) => r.deletePreset(id));
    },
    [write],
  );

  const applyPreset = useCallback(
    (presetId: string, date: DateStr) => {
      const p = presets.find((x) => x.id === presetId);
      if (!p) return;
      addTask({
        title: p.title,
        memo: p.memo,
        categoryId: p.categoryId,
        priority: p.priority,
        date,
        repeatDays: p.repeatDays,
        repeatUntil: p.repeatUntil,
      });
      toast(`${p.title} 추가`);
    },
    [presets, addTask],
  );

  /* ───────── 장보기 ───────── */

  const addShopItem = useCallback(
    (title: string, extra?: { note?: string; place?: string }) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const now = stamp();
      const item: ShopItem = {
        id: uid(),
        roomId: null,
        title: trimmed,
        note: extra?.note ?? '',
        place: extra?.place ?? '',
        done: false,
        boughtOn: null,
        doneBy: null,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      setShopping((prev) => [...prev, item]);
      write((r) => r.saveShopItem(item));
    },
    [write],
  );

  const patchShopItem = useCallback(
    (id: string, patch: Partial<ShopItem>) => {
      const current = shopping.find((i) => i.id === id);
      if (!current) return;
      const updated: ShopItem = { ...current, ...patch, updatedAt: stamp() };
      setShopping(shopping.map((i) => (i.id === id ? updated : i)));
      write((r) => r.saveShopItem(updated));
    },
    [shopping, write],
  );

  const updateShopItem = useCallback(
    (id: string, input: { title: string; note: string; place: string }) => {
      const title = input.title.trim();
      if (!title) return;
      patchShopItem(id, { title, note: input.note.trim(), place: input.place.trim() });
    },
    [patchShopItem],
  );

  const toggleShopItem = useCallback(
    (id: string) => {
      const current = shopping.find((i) => i.id === id);
      if (!current) return;
      const done = !current.done;
      patchShopItem(id, { done, boughtOn: done ? todayStr() : null, doneBy: null });
    },
    [shopping, patchShopItem],
  );

  const removeShopItem = useCallback(
    (id: string) => {
      setShopping((prev) => prev.filter((i) => i.id !== id));
      write((r) => r.deleteShopItems([id]));
    },
    [write],
  );

  const archiveBoughtShopItems = useCallback(() => {
    const moving = shopping.filter((i) => !i.archived && i.done);
    if (moving.length === 0) return;
    const now = stamp();
    const archived = moving.map((i) => ({
      ...i,
      archived: true,
      boughtOn: i.boughtOn ?? todayStr(),
      updatedAt: now,
    }));
    const byId = new Map(archived.map((i) => [i.id, i]));
    setShopping(shopping.map((i) => byId.get(i.id) ?? i));
    write(async (r) => {
      for (const i of archived) await r.saveShopItem(i);
    });
    toast(`${moving.length}개 기록으로 넘겼습니다`);
  }, [shopping, write]);

  /** 기록은 그대로 두고 같은 이름으로 새로 담는다 — 살 때마다 한 줄씩 쌓여야 한다 */
  const rebuyShopItem = useCallback(
    (id: string) => {
      const source = shopping.find((i) => i.id === id);
      if (!source) return;
      if (shopping.some((i) => !i.archived && i.title === source.title)) {
        toast(`${source.title} — 이미 목록에 있어요`);
        return;
      }
      // 메모·구입처도 같이 딸려온다 — 늘 쿠팡에서 저지방 우유를 산다면 매번 다시 적을 일이 없다
      addShopItem(source.title, { note: source.note, place: source.place });
      toast(`${source.title} 담음`);
    },
    [shopping, addShopItem],
  );

  /* ───────── 카테고리 ───────── */

  const addCategory = useCallback(
    (name: string, color: string) => {
      const cat: Category = {
        id: uid(),
        name: name.trim(),
        color,
        order: categories.length,
        updatedAt: stamp(),
      };
      setCategories([...categories, cat]);
      write((r) => r.saveCategory(cat));
    },
    [categories, write],
  );

  const updateCategory = useCallback(
    (id: string, name: string, color: string) => {
      const found = categories.find((c) => c.id === id);
      if (!found) return;
      const updated: Category = { ...found, name: name.trim(), color, updatedAt: stamp() };
      setCategories(categories.map((c) => (c.id === id ? updated : c)));
      write((r) => r.saveCategory(updated));
    },
    [categories, write],
  );

  const removeCategory = useCallback(
    (id: string): number => {
      const fallback = categories.find((c) => c.id !== id);
      if (!fallback) return 0;

      const moved = tasks.filter((t) => t.categoryId === id);
      const movedTasks = moved.map((t) => ({ ...t, categoryId: fallback.id, updatedAt: stamp() }));
      const movedPresets = presets
        .filter((p) => p.categoryId === id)
        .map((p) => ({ ...p, categoryId: fallback.id, updatedAt: stamp() }));

      setTasks((prev) => prev.map((t) => (t.categoryId === id ? { ...t, categoryId: fallback.id } : t)));
      setPresets((prev) =>
        prev.map((p) => (p.categoryId === id ? { ...p, categoryId: fallback.id } : p)),
      );
      setCategories((prev) => prev.filter((c) => c.id !== id));

      write(async (r) => {
        if (movedTasks.length) await r.saveTasks(movedTasks);
        for (const p of movedPresets) await r.savePreset(p);
        await r.deleteCategory(id);
      });

      return moved.length;
    },
    [categories, tasks, presets, write],
  );

  const resetAll = useCallback(() => {
    const cats = DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: stamp() }));
    setTasks([]);
    setPresets([]);
    setShopping([]);
    setCategories(cats);
    write(async (r) => {
      await r.clearAll();
      for (const c of cats) await r.saveCategory(c);
    });
  }, [write]);

  const value = useMemo<StoreValue>(
    () => ({
      loading,
      onboarded,
      finishWelcome,
      categories,
      tasks,
      presets,
      categoryOf,
      addTask,
      updateTask,
      removeTask,
      toggleTask,
      addPreset,
      updatePreset,
      removePreset,
      applyPreset,
      shopping,
      addShopItem,
      updateShopItem,
      toggleShopItem,
      removeShopItem,
      archiveBoughtShopItems,
      rebuyShopItem,
      addCategory,
      updateCategory,
      removeCategory,
      resetAll,
    }),
    [
      loading,
      onboarded,
      finishWelcome,
      categories,
      tasks,
      presets,
      categoryOf,
      addTask,
      updateTask,
      removeTask,
      toggleTask,
      addPreset,
      updatePreset,
      removePreset,
      applyPreset,
      shopping,
      addShopItem,
      updateShopItem,
      toggleShopItem,
      removeShopItem,
      archiveBoughtShopItems,
      rebuyShopItem,
      addCategory,
      updateCategory,
      removeCategory,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('StoreProvider 안에서만 쓸 수 있습니다');
  return ctx;
}

function seedPresets(): Preset[] {
  const base = { roomId: null, memo: '', repeatUntil: null, updatedAt: stamp() };
  return [
    { id: uid(), title: '화장실 청소', categoryId: 'home', priority: 2 as Priority, repeatDays: 8, ...base },
    { id: uid(), title: '빨래', categoryId: 'home', priority: 2 as Priority, repeatDays: 4, ...base },
    { id: uid(), title: '이불 빨래', categoryId: 'home', priority: 1 as Priority, repeatDays: 30, ...base },
    { id: uid(), title: '영양제', categoryId: 'body', priority: 1 as Priority, repeatDays: 1, ...base },
  ];
}
