import {
  addDays as addDaysFn,
  addMonths as addMonthsFn,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDay,
  getDaysInMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type { DateStr } from './types';

/** 날짜는 앱 전체에서 'YYYY-MM-DD' 문자열로만 다룬다. Date 객체는 이 파일 안에서만 산다. */
export const toKey = (d: Date): DateStr => format(d, 'yyyy-MM-dd');

/** date-fns의 parseISO는 날짜만 있는 문자열을 로컬 자정으로 읽는다 — 시간대 밀림 없음 */
export const parseKey = (s: DateStr): Date => parseISO(s);

export const todayStr = (): DateStr => toKey(new Date());

export const addDays = (s: DateStr, n: number): DateStr => toKey(addDaysFn(parseKey(s), n));

export const addMonths = (s: DateStr, n: number): DateStr => toKey(addMonthsFn(parseKey(s), n));

/** a에서 b까지 며칠 (b가 뒤면 양수) */
export const diffDays = (a: DateStr, b: DateStr): number =>
  differenceInCalendarDays(parseKey(b), parseKey(a));

/** 'YYYY-MM' */
export const monthKey = (s: DateStr): string => s.slice(0, 7);

export const monthStart = (s: DateStr): DateStr => toKey(startOfMonth(parseKey(s)));

export const monthEnd = (s: DateStr): DateStr => toKey(endOfMonth(parseKey(s)));

export const daysInMonth = (s: DateStr): number => getDaysInMonth(parseKey(s));

/** 그 달 1일의 요일 (0=일) */
export const firstDow = (s: DateStr): number => getDay(startOfMonth(parseKey(s)));

export const dowOf = (s: DateStr): number => getDay(parseKey(s));

export const yearOf = (s: DateStr): number => Number(s.slice(0, 4));
export const monthOf = (s: DateStr): number => Number(s.slice(5, 7));
export const dayOf = (s: DateStr): number => Number(s.slice(8, 10));

/** '08-04' → '08.04' */
export const shortDate = (s: DateStr): string => s.slice(5).replace('-', '.');

/** '2026-08-07' → '2026. 08. 07.' — 브라우저 로캘과 상관없이 연·월·일 순으로 */
export const longDate = (s: DateStr): string =>
  `${s.slice(0, 4)}. ${s.slice(5, 7)}. ${s.slice(8, 10)}.`;

/**
 * '언제였나'만 알면 되는 자리 — 지운 것처럼.
 * 가까운 날은 오늘·어제로, 그 뒤로는 `8월 3일`. 해가 바뀌면 `26년 7월 8일`로 해까지 적는다.
 */
export const whenDay = (iso: string): string => {
  const day = iso.slice(0, 10);
  const today = todayStr();
  if (day === today) return '오늘';
  if (day === addDays(today, -1)) return '어제';
  const md = `${monthOf(day)}월 ${dayOf(day)}일`;
  return yearOf(day) === yearOf(today) ? md : `${String(yearOf(day)).slice(2)}년 ${md}`;
};

export const DOW = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * 그 날이 든 주의 첫날.
 * 주가 월요일에 시작할지 일요일에 시작할지는 설정에서 고른다 (0=일, 1=월).
 */
export const weekStartOf = (s: DateStr, weekStart: 0 | 1): DateStr => {
  const back = (dowOf(s) - weekStart + 7) % 7;
  return addDays(s, -back);
};

/** from부터 n일치 날짜 문자열 */
export const daysFrom = (from: DateStr, n: number): DateStr[] =>
  Array.from({ length: n }, (_, i) => addDays(from, i));
