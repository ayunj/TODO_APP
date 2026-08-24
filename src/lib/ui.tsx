'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { todayStr } from './date';
import type { DateStr, TrashScope, ViewKind } from './types';

/**
 * 탭 다섯. 밀고 들어간 화면을 다 빠져나오면 여기로 돌아온다.
 *
 * **가운데가 홈이다.** 곰돌이가 사는 자리이고 앱을 켜면 여기가 먼저 뜬다.
 * 설정은 예전에 헤더 톱니였는데, 탭이 다섯이 되면서 그 한 자리를 가져갔다.
 */
export type Tab = 'day' | 'month' | 'home' | 'log' | 'settings';

/**
 * 카테고리 줄이 보고 있는 **나눈 자리**.
 * `all` 안 가림 · `stray` 아직 못 받아온 방 것 · 그 밖엔 방 id.
 *
 * 내 카테고리는 여기 없다 — 접지 않고 칩 그대로 펴두니 `filter` 하나로 족하다.
 */
export type Scope = 'all' | 'stray' | (string & {});

/**
 * 기록 탭이 보는 폭.
 * 한 달치는 칸이 작아 하루하루가 안 보이고, 한 주치는 칸이 커서 요일이 들어간다.
 */
export type LogSpan = 'week' | 'month';

/**
 * 밀고 들어가는 화면. 층층이 쌓이고 뒤로가기 하나로 한 겹씩 벗는다.
 * 설정 갈래(설정·앱 설정·같이 쓰기·방)가 여기 다 들어와 있다 — 시트를 쌓지 않기로 했다.
 */
export type Route =
  | { kind: 'shop' }
  | { kind: 'memo' }
  | { kind: 'settings' }
  | { kind: 'prefs' }
  | { kind: 'presetList' }
  | { kind: 'categoryList' }
  /** id가 null이면 새 카테고리, 있으면 그 카테고리 설정 */
  | { kind: 'category'; id: string | null }
  /**
   * 지운 것 — 어디 것을 보는지가 딸려온다.
   * 한데 모아 보는 화면은 없다. 찾는 사람은 어디 것인지를 이미 알고 찾는다.
   */
  | { kind: 'trash'; scope: TrashScope; id: string }
  | { kind: 'account' }
  | { kind: 'share' }
  /** id가 null이면 새 방 만들기, 있으면 그 방 설정 */
  | { kind: 'room'; id: string | null }
  | { kind: 'invite'; id: string }
  /** 그 방이 무엇을 나눌지 고르기 (주인만) */
  | { kind: 'shares'; id: string }
  /** 누구에게 맡길까요 — 주인이 빠지되 방은 살려둘 때 */
  | { kind: 'handover'; id: string }
  | { kind: 'join' };

/**
 * 시트는 **항목 하나를 손보는 자리**만 남는다.
 * 목록·설정처럼 안으로 더 들어가는 것은 전부 Route다.
 */
export type Sheet =
  | { kind: 'task'; id: string | null }
  | { kind: 'preset'; id: string | null }
  | { kind: 'shopItem'; id: string }
  /** 같이 보기 — 이 메모를 어느 방들에 둘까 (메모만 여럿이다) */
  | { kind: 'memoRooms'; id: string }
  /** 누가 했나 — 이름만 갈아 끼운다 */
  | { kind: 'doneBy'; id: string }
  /** 콕 찌를까요 — 고를 게 없어서 확인 한 장이다 */
  | { kind: 'nudge'; id: string }
  /** 방 이름·방 색·이 방에서 불릴 내 이름 — 값 하나를 손보는 자리 */
  | { kind: 'roomField'; id: string; field: 'name' | 'color' | 'myName' };

interface UiValue {
  /** 지금 그리는 화면 — 쌓인 게 있으면 맨 위, 없으면 보던 탭 */
  view: ViewKind;
  /** 밀고 들어간 것을 다 벗으면 돌아올 탭. 뒤로 제스처가 본다. */
  tab: Tab;
  /** 쌓인 화면의 맨 위 (id 같은 딸린 값이 필요할 때). 탭에 있으면 null */
  route: Route | null;
  /** 몇 겹 들어와 있는지 */
  depth: number;
  /** 탭을 옮긴다. 밀고 들어간 화면은 다 벗는다. */
  setTab: (t: Tab) => void;
  /** 한 겹 밀고 들어간다 */
  pushView: (r: Route) => void;
  /** 한 겹 벗는다 */
  popView: () => void;
  /** 이 겹을 다음 것으로 갈아끼운다 — 뒤로가기가 방금 지나온 자리로 돌아가지 않게 */
  replaceView: (r: Route) => void;
  /** 지금 보고 있는 날 (월·기록 탭에서는 그 달의 아무 날) */
  cursor: DateStr;
  setCursor: (d: DateStr) => void;
  /**
   * 지금 들어와 있는 묶음. 새로고침하면 전체로 돌아간다 — 그래서 저장하지 않는다.
   * 묶음을 옮기면 그 안에서 고른 것과 `내 차례`가 같이 풀린다.
   */
  scope: Scope;
  setScope: (s: Scope) => void;
  /**
   * 묶음 안에서 카테고리 하나를 더 고른 것. null이면 그 묶음 전체.
   *
   * 거르는 값은 이 둘(`scope`·`filter`)뿐이다. 차례로 거르는 값은 두지 않는다 —
   * 누가 할 일인지는 할 일 줄이 이미 말하고 있다.
   */
  filter: string | null;
  setFilter: (f: string | null) => void;
  /** 기록 탭이 한 주치를 보는지 한 달치를 보는지 */
  logSpan: LogSpan;
  setLogSpan: (s: LogSpan) => void;
  sheet: Sheet | null;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<Tab>('home');
  const [stack, setStack] = useState<Route[]>([]);
  const [cursor, setCursor] = useState<DateStr>(() => todayStr());
  const [scope, setScopeState] = useState<Scope>('all');
  const [filter, setFilterState] = useState<string | null>(null);
  const [logSpan, setLogSpan] = useState<LogSpan>('month');
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const route = stack.length ? stack[stack.length - 1] : null;

  const value = useMemo<UiValue>(
    () => ({
      view: (route?.kind ?? tab) as ViewKind,
      tab,
      route,
      depth: stack.length,
      setTab: (t) => {
        setStack([]);
        setTabState(t);
      },
      pushView: (r) => setStack((s) => [...s, r]),
      popView: () => setStack((s) => s.slice(0, -1)),
      replaceView: (r) => setStack((s) => [...s.slice(0, -1), r]),
      cursor,
      setCursor,
      scope,
      // 묶음을 옮기면 그 안에서 고른 것이 없는 것이 된다 — 방마다 카테고리가 다르다
      setScope: (s) => {
        setFilterState(null);
        setScopeState(s);
      },
      filter,
      setFilter: setFilterState,
      logSpan,
      setLogSpan,
      sheet,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
    }),
    [tab, stack, route, cursor, scope, filter, logSpan, sheet],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('UiProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
