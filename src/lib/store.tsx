'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';
import { DEFAULT_CATEGORIES, LEGACY_COLOR } from './constants';
import { addDays, shortDate, todayStr } from './date';
import { stamp, uid } from './id';
import { baseOf, spawnNext } from './repeat';
import { getRepository } from './repo';
import type { Repository, Snapshot } from './repository';
import { onShopList } from './selectors';
import { toast } from './toast';
import type { Category, DateStr, Memo, Preset, Priority, ShopItem, Task } from './types';

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
  /** 못 끝낸 일을 다른 날로 옮긴다. 주기 계산은 건드리지 않는다. */
  postponeTasks: (ids: string[], date: DateStr) => void;

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
  /** 기록에 있는 것을 다시 목록에 올린다 (새 항목으로 — 지난 구매 기록은 그대로 둔다) */
  rebuyShopItem: (id: string) => void;

  /* ── 메모 ── */
  memos: Memo[];
  /** 빈 메모를 만들고 돌려준다 (바로 펼쳐서 적게) */
  addMemo: () => Memo;
  updateMemo: (id: string, text: string) => void;
  removeMemo: (id: string) => void;
  /** 이 시각 뒤에 고쳐진 메모가 있으면 아직 안 본 것이다 */
  memoSeenAt: string;
  markMemosSeen: () => void;

  /* ── 앱 설정 — 이 기기에만 걸린다 ── */
  /** 0=일요일, 1=월요일 */
  weekStart: 0 | 1;
  setWeekStart: (d: 0 | 1) => void;
  notify: boolean;
  setNotify: (on: boolean) => void;
  /** 'HH:MM' */
  notifyTodo: string;
  notifyLeft: string;
  setNotifyTime: (which: 'todo' | 'left', at: string) => void;

  addCategory: (name: string, color: string) => void;
  updateCategory: (id: string, name: string, color: string) => void;
  /** 지운 카테고리의 할 일은 남은 카테고리로 옮긴다. 옮겨진 개수를 돌려준다. */
  removeCategory: (id: string) => number;

  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const FALLBACK_CATEGORY: Category = {
  id: 'home',
  roomId: null,
  name: '집안일',
  color: '#8EC9B5',
  order: 0,
  updatedAt: '',
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const repoRef = useRef<{ repo: Repository; owner: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [memoSeenAt, setMemoSeenAt] = useState('');
  const [weekStart, setWeekStartState] = useState<0 | 1>(0);
  const [notify, setNotifyState] = useState(false);
  const [notifyTodo, setNotifyTodo] = useState('08:00');
  const [notifyLeft, setNotifyLeft] = useState('19:00');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [shopping, setShopping] = useState<ShopItem[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  /** 메모는 글자마다 저장하지 않고 잠깐 멈출 때 쓴다 — 화면은 이미 바뀌어 있다 */
  const memoTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /** 로그인하면 같은 저장소를 감싼 '서버와 맞추는 것'으로 바뀐다 */
  const { account } = useAuth();
  const owner = account?.id ?? null;

  /** 쓰기는 화면을 먼저 바꾸고 뒤에서 조용히 저장한다 (낙관적 업데이트) */
  const repo = useCallback(() => {
    if (repoRef.current?.owner !== owner) {
      repoRef.current = { repo: getRepository(owner), owner };
    }
    return repoRef.current.repo;
  }, [owner]);

  const write = useCallback(
    (job: (r: Repository) => Promise<unknown>) => {
      void job(repo()).catch(() => toast('저장하지 못했습니다. 화면은 그대로 쓸 수 있어요.'));
    },
    [repo],
  );

  /** 스냅샷 하나를 화면 상태로 펼친다 */
  const spread = useCallback((snap: Snapshot) => {
    // 방 칸이 없던 시절 카테고리에는 roomId를 채워준다 (전부 개인 것이었다)
    setCategories(snap.categories.map((c) => ({ ...c, roomId: c.roomId ?? null })));
    setTasks(snap.tasks);
    setPresets(snap.presets);
    // 나중에 생긴 칸들이 없는 옛 항목에는 기본값을 채워준다
    setShopping(
      snap.shopping.map((i) => ({
        ...i,
        note: i.note ?? '',
        place: i.place ?? '',
        boughtOn: i.boughtOn ?? null,
      })),
    );
    // 한 장짜리로 쓰던 시절의 메모에는 createdAt이 없다 — 첫 번째 메모로 그대로 넘긴다
    setMemos(snap.memos.map((m) => ({ ...m, createdAt: m.createdAt ?? m.updatedAt })));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = repo();
      await r.init();
      const [snap, settings] = await Promise.all([r.loadAll(), r.loadSettings()]);
      if (!alive) return;
      setOnboarded(settings.onboarded);
      setMemoSeenAt(settings.memoSeenAt ?? '');
      setWeekStartState(settings.weekStart === 1 ? 1 : 0);
      setNotifyState(Boolean(settings.notify));
      setNotifyTodo(settings.notifyTodo || '08:00');
      setNotifyLeft(settings.notifyLeft || '19:00');

      let current = snap;

      // 서버와 맞출 참이면 기본값을 먼저 심지 않는다.
      // 기기마다 같은 이름의 카테고리를 따로 만들어 올리면 두 벌이 되기 때문이다.
      if (r.sync) {
        spread(current); // 서버를 기다리는 동안에도 화면은 이미 있다
        setLoading(false);
        try {
          current = await r.sync();
        } catch {
          toast('아직 맞추지 못했습니다. 연결되면 다시 시도해요.');
        }
        if (!alive) return;
      }

      current = await furnish(r, current);
      if (!alive) return;
      spread(current);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [repo, spread]);

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
          const since = baseOf(updated);
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

  /**
   * 지우는 건 이 한 건뿐이다.
   * 완료해서 이미 잡혀 있는 다음 회차는 그대로 둔다 — 기록을 지운 것이지 반복을 그만둔 게 아니다.
   * 반복을 그만두려면 앞으로 잡힌 그 회차를 지우면 된다.
   */
  const removeTask = useCallback(
    (id: string) => {
      // 지워진 항목을 부모로 가리키고 있으면 끊어준다 (없는 줄을 가리키지 않게)
      const freed = tasks
        .filter((t) => t.parentId === id)
        .map((t) => ({ ...t, parentId: null, updatedAt: stamp() }));

      setTasks(
        tasks.filter((t) => t.id !== id).map((t) => freed.find((f) => f.id === t.id) ?? t),
      );

      write(async (r) => {
        await r.deleteTask(id);
        if (freed.length) await r.saveTasks(freed);
      });
    },
    [tasks, write],
  );

  /**
   * 날짜만 옮긴다. cycleSince는 그대로 둔다 — 이번 주기가 시작된 날이 바뀐 건 아니니까.
   * 다음 회차 기준일이 date라, 미룬 만큼 다음 회차도 밀린다. 8/5에 하겠다고 옮긴 거니 그게 맞다.
   */
  const postponeTasks = useCallback(
    (ids: string[], date: DateStr) => {
      const target = new Set(ids);
      const moved = tasks
        .filter((t) => target.has(t.id) && t.date !== date)
        .map((t) => ({ ...t, date, updatedAt: stamp() }));
      if (moved.length === 0) return;

      const byId = new Map(moved.map((t) => [t.id, t]));
      setTasks(tasks.map((t) => byId.get(t.id) ?? t));
      write((r) => r.saveTasks(moved));
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
        // 그 날 한 걸로 적는다. 앞날짜를 미리 체크한 것만 오늘로 —  하지도 않은 날을 적을 수는 없다.
        doneOn: current.date < today ? current.date : today,
        doneBy: null,
        updatedAt: stamp(),
      };

      // 이미 이 항목을 부모로 하는 미완료 회차가 있으면 만들지 않는다 (중복 방지)
      const hasPending = tasks.some((t) => t.parentId === id && !t.done);
      let next: Task | null = null;
      if (current.repeatDays > 0 && !hasPending) {
        next = spawnNext(done);
        // '8일 뒤'가 아니라 날짜를 적는다 — 지난 날짜를 체크하면 그 날 기준이라 뒤가 아닐 수 있다
        if (next) toast(`다음 ${done.title} → ${shortDate(next.date)}`);
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

  /* ───────── 즐겨찾기 ───────── */

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

  /** 기록은 그대로 두고 같은 이름으로 새로 담는다 — 살 때마다 한 줄씩 쌓여야 한다 */
  const rebuyShopItem = useCallback(
    (id: string) => {
      const source = shopping.find((i) => i.id === id);
      if (!source) return;
      const today = todayStr();
      if (shopping.some((i) => onShopList(i, today) && i.title === source.title)) {
        toast(`${source.title} — 이미 목록에 있어요`);
        return;
      }
      // 메모·구입처도 같이 딸려온다 — 늘 쿠팡에서 저지방 우유를 산다면 매번 다시 적을 일이 없다
      addShopItem(source.title, { note: source.note, place: source.place });
      toast(`${source.title} 담음`);
    },
    [shopping, addShopItem],
  );

  /* ───────── 메모 ───────── */

  const addMemo = useCallback((): Memo => {
    const now = stamp();
    const memo: Memo = { id: uid(), roomId: null, text: '', createdAt: now, updatedAt: now };
    setMemos((prev) => [...prev, memo]);
    write((r) => r.saveMemo(memo));
    return memo;
  }, [write]);

  const updateMemo = useCallback(
    (id: string, text: string) => {
      const found = memos.find((m) => m.id === id);
      if (!found || found.text === text) return;
      const updated: Memo = { ...found, text, updatedAt: stamp() };
      setMemos(memos.map((m) => (m.id === id ? updated : m)));

      const timers = memoTimers.current;
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(() => write((r) => r.saveMemo(updated)), 600),
      );
    },
    [memos, write],
  );

  /** 메모 화면에 들어올 때와 나갈 때 찍는다 — 내가 쓴 글이 나한테 점으로 뜨지 않게 */
  const markMemosSeen = useCallback(() => {
    const now = stamp();
    setMemoSeenAt(now);
    write((r) => r.saveSettings({ memoSeenAt: now }));
  }, [write]);

  /* ───────── 앱 설정 ───────── */

  const setWeekStart = useCallback(
    (d: 0 | 1) => {
      setWeekStartState(d);
      write((r) => r.saveSettings({ weekStart: d }));
    },
    [write],
  );

  const setNotify = useCallback(
    (on: boolean) => {
      setNotifyState(on);
      write((r) => r.saveSettings({ notify: on }));
    },
    [write],
  );

  const setNotifyTime = useCallback(
    (which: 'todo' | 'left', at: string) => {
      if (which === 'todo') setNotifyTodo(at);
      else setNotifyLeft(at);
      write((r) => r.saveSettings(which === 'todo' ? { notifyTodo: at } : { notifyLeft: at }));
    },
    [write],
  );

  const removeMemo = useCallback(
    (id: string) => {
      clearTimeout(memoTimers.current.get(id)); // 지운 뒤에 저장이 되살아나지 않게
      memoTimers.current.delete(id);
      setMemos((prev) => prev.filter((m) => m.id !== id));
      write((r) => r.deleteMemo(id));
    },
    [write],
  );

  /* ───────── 카테고리 ───────── */

  const addCategory = useCallback(
    (name: string, color: string) => {
      const cat: Category = {
        id: uid(),
        roomId: null,
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
    const cats = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid(), updatedAt: stamp() }));
    setTasks([]);
    setPresets([]);
    setShopping([]);
    setMemos([]);
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
      postponeTasks,
      addPreset,
      updatePreset,
      removePreset,
      applyPreset,
      shopping,
      addShopItem,
      updateShopItem,
      toggleShopItem,
      removeShopItem,
      rebuyShopItem,
      memos,
      addMemo,
      updateMemo,
      removeMemo,
      memoSeenAt,
      markMemosSeen,
      weekStart,
      setWeekStart,
      notify,
      setNotify,
      notifyTodo,
      notifyLeft,
      setNotifyTime,
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
      postponeTasks,
      addPreset,
      updatePreset,
      removePreset,
      applyPreset,
      shopping,
      addShopItem,
      updateShopItem,
      toggleShopItem,
      removeShopItem,
      rebuyShopItem,
      memos,
      addMemo,
      updateMemo,
      removeMemo,
      memoSeenAt,
      markMemosSeen,
      weekStart,
      setWeekStart,
      notify,
      setNotify,
      notifyTodo,
      notifyLeft,
      setNotifyTime,
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

/**
 * 카테고리가 하나도 없을 때만 기본 둘을 깔아준다. 그 외에는 손대지 않는다.
 *
 * 즐겨찾기는 심지 않는다 — 비워두고 직접 채우는 게 맞다.
 * 예전에는 비어 있으면 채워 넣었는데, 그러면 전체 초기화하고 새로고침할 때마다
 * 지운 것이 도로 살아났다.
 *
 * 서버와 맞춘 뒤에 부른다. 맞추기 전에 심으면 기기마다 같은 걸 만들어 두 벌이 된다.
 */
async function furnish(r: Repository, snap: Snapshot): Promise<Snapshot> {
  let categories = snap.categories;

  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid(), updatedAt: stamp() }));
    await Promise.all(categories.map((c) => r.saveCategory(c)));
    return { ...snap, categories };
  }

  // 예전 팔레트로 저장된 색은 새 파스텔 색으로 한 번만 옮긴다
  const repainted = categories
    .filter((c) => LEGACY_COLOR[c.color])
    .map((c) => ({ ...c, color: LEGACY_COLOR[c.color], updatedAt: stamp() }));
  if (repainted.length) {
    categories = categories.map((c) => repainted.find((x) => x.id === c.id) ?? c);
    await Promise.all(repainted.map((c) => r.saveCategory(c)));
  }

  return { ...snap, categories };
}
