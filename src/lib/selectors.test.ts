import { describe, expect, it } from 'vitest';
import { alive, trashOf } from './selectors';
import type { Memo, ShopItem, Task } from './types';

const task = (over: Partial<Task> & { id: string }): Task => ({
  roomId: null,
  title: '청소',
  memo: '',
  categoryId: 'home',
  priority: 2,
  date: '2026-08-10',
  repeatDays: 0,
  repeatUntil: null,
  cycleSince: null,
  parentId: null,
  done: false,
  doneOn: null,
  doneBy: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  deletedBy: null,
  ...over,
});

const shopItem = (over: Partial<ShopItem> & { id: string }): ShopItem => ({
  roomId: null,
  title: '우유',
  note: '',
  place: '',
  done: false,
  boughtOn: null,
  doneBy: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  deletedBy: null,
  ...over,
});

const memo = (over: Partial<Memo> & { id: string }): Memo => ({
  roomId: null,
  text: '',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  deletedBy: null,
  ...over,
});

/** 30일 자른 자리 */
const SINCE = '2026-07-11T00:00:00.000Z';

describe('alive', () => {
  it('지운 것은 목록에서 빠진다', () => {
    const rows = [task({ id: 'a' }), task({ id: 'b', deletedAt: '2026-08-09T10:00:00.000Z' })];
    expect(alive(rows).map((t) => t.id)).toEqual(['a']);
  });
});

describe('trashOf', () => {
  it('살아 있는 것은 오르지 않는다', () => {
    expect(trashOf([task({ id: 'a' })], [], [], SINCE)).toEqual([]);
  });

  it('30일이 지난 것은 없는 것으로 친다', () => {
    const old = task({ id: 'a', deletedAt: '2026-07-01T00:00:00.000Z' });
    const recent = task({ id: 'b', deletedAt: '2026-08-09T00:00:00.000Z' });
    expect(trashOf([old, recent], [], [], SINCE).map((t) => t.id)).toEqual(['b']);
  });

  it('늦게 지운 것이 위로 온다 — 종류가 섞여 있어도', () => {
    const rows = trashOf(
      [task({ id: 't', deletedAt: '2026-08-01T00:00:00.000Z' })],
      [shopItem({ id: 's', deletedAt: '2026-08-09T00:00:00.000Z' })],
      [memo({ id: 'm', text: '메모', deletedAt: '2026-08-05T00:00:00.000Z' })],
      SINCE,
    );
    expect(rows.map((r) => r.id)).toEqual(['s', 'm', 't']);
    expect(rows.map((r) => r.kind)).toEqual(['shop', 'memo', 'task']);
  });

  it('메모는 첫 줄이 제목 노릇을 한다', () => {
    const rows = trashOf(
      [],
      [],
      [memo({ id: 'm', text: '\n  관리비 계좌\n국민은행', deletedAt: '2026-08-09T00:00:00.000Z' })],
      SINCE,
    );
    expect(rows[0].title).toBe('관리비 계좌');
  });

  it('방 것과 지운 사람이 함께 실린다 — 방 화면이 "남편이 지움"을 적을 수 있게', () => {
    const rows = trashOf(
      [task({ id: 't', roomId: 'r1', deletedAt: '2026-08-09T00:00:00.000Z', deletedBy: 'u2' })],
      [],
      [],
      SINCE,
    );
    expect(rows[0]).toMatchObject({ roomId: 'r1', by: 'u2', categoryId: 'home' });
  });

  it('장보기·메모에는 카테고리가 없다', () => {
    const rows = trashOf(
      [],
      [shopItem({ id: 's', deletedAt: '2026-08-09T00:00:00.000Z' })],
      [],
      SINCE,
    );
    expect(rows[0].categoryId).toBeNull();
  });
});
