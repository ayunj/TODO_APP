'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { todayStr } from './date';
import type { Filter } from './selectors';
import type { DateStr, ViewKind } from './types';

export type Sheet =
  | { kind: 'task'; id: string | null }
  | { kind: 'settings' }
  | { kind: 'presetList' }
  | { kind: 'preset'; id: string | null }
  | { kind: 'categoryList' }
  | { kind: 'category'; id: string | null }
  | { kind: 'shopItem'; id: string }
  | { kind: 'share' };

interface UiValue {
  view: ViewKind;
  setView: (v: ViewKind) => void;
  /** 장보기로 밀고 들어간다 (탭이 아니라 헤더에서) */
  openShop: () => void;
  /** 들어오기 전에 보던 탭으로 되돌아간다 */
  closeShop: () => void;
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
  const [view, setView] = useState<ViewKind>('day');
  const [before, setBefore] = useState<ViewKind>('day');
  const [cursor, setCursor] = useState<DateStr>(() => todayStr());
  const [filter, setFilter] = useState<Filter>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const value = useMemo<UiValue>(
    () => ({
      view,
      setView,
      openShop: () => {
        setBefore(view === 'shop' ? 'day' : view);
        setView('shop');
      },
      closeShop: () => setView(before),
      cursor,
      setCursor,
      filter,
      setFilter,
      sheet,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
    }),
    [view, before, cursor, filter, sheet],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('UiProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
