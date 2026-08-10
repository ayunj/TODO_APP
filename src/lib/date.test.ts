import { describe, expect, it } from 'vitest';
import { daysFrom, dowOf, weekStartOf } from './date';

/** 2026-08-10은 월요일이다 (0=일 … 6=토) */
describe('weekStartOf', () => {
  it('월요일 시작 — 그 주 월요일로 간다', () => {
    expect(weekStartOf('2026-08-10', 1)).toBe('2026-08-10'); // 월
    expect(weekStartOf('2026-08-12', 1)).toBe('2026-08-10'); // 수
    expect(weekStartOf('2026-08-16', 1)).toBe('2026-08-10'); // 일 — 앞주가 아니라 이 주
  });

  it('일요일 시작 — 그 주 일요일로 간다', () => {
    expect(weekStartOf('2026-08-10', 0)).toBe('2026-08-09'); // 월 → 하루 앞 일요일
    expect(weekStartOf('2026-08-09', 0)).toBe('2026-08-09'); // 일
    expect(weekStartOf('2026-08-15', 0)).toBe('2026-08-09'); // 토
  });

  it('달을 넘어가도 이어진다', () => {
    // 2026-09-01은 화요일 — 월요일 시작이면 8월로 넘어간다
    expect(weekStartOf('2026-09-01', 1)).toBe('2026-08-31');
  });

  it('첫날의 요일이 곧 고른 시작 요일이다', () => {
    for (const d of ['2026-08-10', '2026-08-13', '2026-02-28', '2026-12-31']) {
      expect(dowOf(weekStartOf(d, 1))).toBe(1);
      expect(dowOf(weekStartOf(d, 0))).toBe(0);
    }
  });
});

describe('daysFrom', () => {
  it('그 날부터 이어지는 날짜를 준다', () => {
    expect(daysFrom('2026-08-10', 3)).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
  });

  it('달 끝을 넘어간다', () => {
    expect(daysFrom('2026-08-30', 3)).toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
  });
});
