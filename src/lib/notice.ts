import { todayStr } from './date';
import type { Notice } from './types';

/**
 * 공지를 **언제까지 안 띄울까** — 폰에 담아 두고 셈한다.
 *
 * 서버에 안 담는 까닭은 [SQL](../../sql/2026-08-26_공지.sql)에 적어뒀다.
 * 짧게는 — 사람 × 공지마다 한 줄이 쌓이는데 **공지는 로그인 전에도 떠야 해서**
 * 담을 자리가 없다.
 *
 * ─── 닫는 길이 둘이다 ──────────────────────────────────────────
 *
 * | | 언제까지 | 어디에 담나 |
 * |---|---|---|
 * | **닫기** | 이번에만 | 아무 데도 — 앱을 다시 켜면 또 뜬다 |
 * | **오늘 다시 열지 않기** | 그 날이 끝날 때까지 | 폰(`localStorage`) |
 *
 * 둘을 다 두는 까닭은 **읽었는지 안 읽었는지가 다르기** 때문이다.
 * `닫기`는 지금 볼 겨를이 없다는 뜻이고, `오늘 다시`는 읽었다는 뜻이다.
 * 하나만 두면 급할 때 누른 것이 읽은 것으로 셈된다.
 *
 * ─── 고친 공지는 새 공지다 ─────────────────────────────────────
 *
 * 담아둘 때 **고친 때(`updated_at`)를 같이 담는다.** 그 값이 바뀌면 눌러둔 것을
 * 무른다 — 글을 고쳐 올렸는데 안 뜨면 고친 뜻이 없다.
 */
const KEY = 'notice-hushed';

interface Hush {
  /** 어느 판을 닫았나 — 공지를 고치면 이 값이 달라진다 */
  v: string;
  /** 그 날까지 안 띄운다 (`YYYY-MM-DD`) */
  until: string;
}

/**
 * 폰에 담아둔 것을 읽는다.
 *
 * **되읽기가 던질 수 있다.** 시크릿 창, 사이트 데이터를 지운 브라우저,
 * 저장을 막아둔 설정에서는 `localStorage`를 만지는 것만으로 던진다 —
 * 그때는 담아둔 것이 없는 것으로 치고 **공지를 띄운다.** 한 번 더 뜨는 것은
 * 잘못이 아니고, 안 뜨는 것이 잘못이다.
 */
function read(): Record<string, Hush> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Hush>) : {};
  } catch {
    return {};
  }
}

/** 지금 이 공지를 띄워야 하나 */
export function shouldShow(notice: Notice, today = todayStr()): boolean {
  const hush = read()[notice.id];
  if (!hush) return true;
  // 고쳐 올렸으면 눌러둔 것을 무른다 — 고친 공지는 새 공지다
  if (hush.v !== notice.version) return true;
  return hush.until < today;
}

/** `오늘 다시 열지 않기` — 그 날이 끝날 때까지 안 띄운다 */
export function hushToday(notice: Notice, today = todayStr()): void {
  try {
    const all = read();
    all[notice.id] = { v: notice.version, until: today };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 못 담으면 다음에 또 뜬다. 막을 것이 아니다 — 공지는 뜨는 쪽이 맞다. */
  }
}

/**
 * 순수한 셈만 떼어둔 것 — 시험에서 쓴다.
 * `shouldShow`는 폰을 읽어서 시험에서 못 부른다.
 */
export function stillHushed(hush: Hush | undefined, version: string, today: string): boolean {
  if (!hush) return false;
  if (hush.v !== version) return false;
  return hush.until >= today;
}
