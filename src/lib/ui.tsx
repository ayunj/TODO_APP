'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { todayStr } from './date';
import type { Filter } from './selectors';
import type { DateStr, ViewKind } from './types';

/** 탭 셋. 밀고 들어간 화면을 다 빠져나오면 여기로 돌아온다. */
export type Tab = 'day' | 'month' | 'log';

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
  | { kind: 'account' }
  | { kind: 'share' }
  /** id가 null이면 새 방 만들기, 있으면 그 방 설정 */
  | { kind: 'room'; id: string | null }
  | { kind: 'invite'; id: string }
  | { kind: 'join' };

/**
 * 시트는 **항목 하나를 손보는 자리**만 남는다.
 * 목록·설정처럼 안으로 더 들어가는 것은 전부 Route다.
 */
export type Sheet =
  | { kind: 'task'; id: string | null }
  | { kind: 'preset'; id: string | null }
  | { kind: 'category'; id: string | null }
  | { kind: 'shopItem'; id: string };

interface UiValue {
  /** 지금 그리는 화면 — 쌓인 게 있으면 맨 위, 없으면 보던 탭 */
  view: ViewKind;
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
  /** 새로고침하면 전체로 돌아간다 — 그래서 저장하지 않는다 */
  filter: Filter;
  setFilter: (f: Filter) => void;
  sheet: Sheet | null;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTabState] = useState<Tab>('day');
  const [stack, setStack] = useState<Route[]>([]);
  const [cursor, setCursor] = useState<DateStr>(() => todayStr());
  const [filter, setFilter] = useState<Filter>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const route = stack.length ? stack[stack.length - 1] : null;

  const value = useMemo<UiValue>(
    () => ({
      view: (route?.kind ?? tab) as ViewKind,
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
      filter,
      setFilter,
      sheet,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
    }),
    [tab, stack, route, cursor, filter, sheet],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('UiProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
