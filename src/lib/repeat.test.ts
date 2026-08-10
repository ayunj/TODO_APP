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
    deletedAt: null,
    deletedBy: null,
    ...over,
  };
}

describe('반복 주기', () => {
  it('주기 1일 — 오늘(8/3)짜를 오늘 완료하면 다음은 8/4', () => {
    const t = task({ date: '2026-08-03', repeatDays: 1, done: true, doneOn: '2026-08-03' });
    expect(spawnNext(t)?.date).toBe('2026-08-04');
  });

  it('주기 1일 — 오늘이 8/3인데 8/4짜를 미리 체크하면 다음은 8/5 (같은 날 중복 금지)', () => {
    const t = task({ date: '2026-08-04', repeatDays: 1, done: true, doneOn: '2026-08-03' });
    expect(spawnNext(t)?.date).toBe('2026-08-05');
  });

  it('주기 1일 — 어제(8/5)짜를 오늘(8/6) 체크하면 다음은 오늘이다 (오늘 칸이 비면 안 된다)', () => {
    const t = task({ date: '2026-08-05', repeatDays: 1, done: true, doneOn: '2026-08-05' });
    expect(spawnNext(t)?.date).toBe('2026-08-06');
  });

  it('주기 8일 — 밀린 8/4짜를 8/9로 옮겨서 완료하면 다음은 8/17', () => {
    // 8/9에 실제로 했으면 날짜를 8/9로 옮기고 체크한다. date가 곧 한 날이다.
    const t = task({ date: '2026-08-09', repeatDays: 8, done: true, doneOn: '2026-08-09' });
    expect(spawnNext(t)?.date).toBe('2026-08-17');
  });

  it('주기 8일 — 8/4짜를 옮기지 않고 체크하면 8/4에 한 것이라 다음은 8/12', () => {
    const t = task({ date: '2026-08-04', repeatDays: 8, done: true, doneOn: '2026-08-04' });
    expect(spawnNext(t)?.date).toBe('2026-08-12');
  });

  it('주기 1일 · 종료일 8/5 — 8/4 완료는 8/5를 낳고, 8/5 완료는 아무것도 안 낳는다', () => {
    const a = task({
      date: '2026-08-04',
      repeatDays: 1,
      repeatUntil: '2026-08-05',
      done: true,
      doneOn: '2026-08-04',
    });
    expect(spawnNext(a)?.date).toBe('2026-08-05');

    const b = task({
      date: '2026-08-05',
      repeatDays: 1,
      repeatUntil: '2026-08-05',
      done: true,
      doneOn: '2026-08-05',
    });
    expect(spawnNext(b)).toBeNull();
  });

  it('반복이 없으면 아무것도 안 낳는다', () => {
    const t = task({ date: '2026-08-03', done: true, doneOn: '2026-08-03' });
    expect(spawnNext(t)).toBeNull();
  });

  it('새 회차는 메모를 이어받는다', () => {
    const t = task({
      date: '2026-08-03',
      repeatDays: 3,
      memo: '세제 새로 사기',
      done: true,
      doneOn: '2026-08-03',
    });
    const next = spawnNext(t);
    expect(next?.memo).toBe('세제 새로 사기');
    expect(next?.cycleSince).toBe('2026-08-03');
    expect(next?.parentId).toBe('t1');
  });
});
