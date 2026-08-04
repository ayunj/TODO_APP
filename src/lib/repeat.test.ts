import { describe, expect, it } from 'vitest';
import { spawnNext } from './repeat';
import { stamp } from './id';
import type { DateStr, Task } from './types';

function task(over: Partial<Task> & { date: DateStr }): Task {
  const now = stamp();
  return {
    id: 't1',
    roomId: null,
    title: '청소',
    memo: '',
    categoryId: 'home',
    priority: 2,
    repeatDays: 0,
    repeatUntil: null,
    cycleSince: null,
    parentId: null,
    done: false,
    doneOn: null,
    doneBy: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('반복 주기', () => {
  it('주기 1일 — 오늘(8/3)짜를 오늘 완료하면 다음은 8/4', () => {
    const t = task({ date: '2026-08-03', repeatDays: 1, done: true, doneOn: '2026-08-03' });
    expect(spawnNext(t, '2026-08-03')?.date).toBe('2026-08-04');
  });

  it('주기 1일 — 오늘이 8/3인데 8/4짜를 미리 체크하면 다음은 8/5 (같은 날 중복 금지)', () => {
    const t = task({ date: '2026-08-04', repeatDays: 1, done: true, doneOn: '2026-08-03' });
    expect(spawnNext(t, '2026-08-03')?.date).toBe('2026-08-05');
  });

  it('주기 8일 — 8/4짜를 8/9에 완료하면 다음은 8/17 (실제 완료일 기준)', () => {
    const t = task({ date: '2026-08-04', repeatDays: 8, done: true, doneOn: '2026-08-09' });
    expect(spawnNext(t, '2026-08-09')?.date).toBe('2026-08-17');
  });

  it('주기 1일 · 종료일 8/5 — 8/4 완료는 8/5를 낳고, 8/5 완료는 아무것도 안 낳는다', () => {
    const a = task({
      date: '2026-08-04',
      repeatDays: 1,
      repeatUntil: '2026-08-05',
      done: true,
      doneOn: '2026-08-04',
    });
    expect(spawnNext(a, '2026-08-04')?.date).toBe('2026-08-05');

    const b = task({
      date: '2026-08-05',
      repeatDays: 1,
      repeatUntil: '2026-08-05',
      done: true,
      doneOn: '2026-08-05',
    });
    expect(spawnNext(b, '2026-08-05')).toBeNull();
  });

  it('반복이 없으면 아무것도 안 낳는다', () => {
    const t = task({ date: '2026-08-03', done: true, doneOn: '2026-08-03' });
    expect(spawnNext(t, '2026-08-03')).toBeNull();
  });

  it('새 회차는 메모를 이어받는다', () => {
    const t = task({
      date: '2026-08-03',
      repeatDays: 3,
      memo: '세제 새로 사기',
      done: true,
      doneOn: '2026-08-03',
    });
    const next = spawnNext(t, '2026-08-03');
    expect(next?.memo).toBe('세제 새로 사기');
    expect(next?.cycleSince).toBe('2026-08-03');
    expect(next?.parentId).toBe('t1');
  });
});
