import { describe, expect, it } from 'vitest';
import { alive, handedToMe, myTasksOn, trashOf } from './selectors';
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
  assigneeId: null,
  assignedAt: null,
  assignedBy: null,
  rotate: 'once',
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
  roomIds: [],
  text: '',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  updatedBy: null,
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
    expect(rows[0]).toMatchObject({ rooms: ['r1'], by: 'u2', categoryId: 'home' });
  });

  it('메모는 걸린 방이 여럿이면 그 방들 지운 것에 다 뜬다', () => {
    const rows = trashOf(
      [],
      [],
      [memo({ id: 'm', text: '와이파이', roomIds: ['r1', 'r2'], deletedAt: '2026-08-09T00:00:00.000Z' })],
      SINCE,
    );
    expect(rows[0].rooms).toEqual(['r1', 'r2']);
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

describe('handedToMe — 배정 띠에 오르는 줄', () => {
  const ME = 'me';
  const SEEN = '2026-08-10T00:00:00.000Z';
  /** 남편이 어제 나에게 넘긴 것 */
  const handed = (over: Partial<Task> & { id: string }) =>
    task({ assigneeId: ME, assignedBy: 'u2', assignedAt: '2026-08-11T00:00:00.000Z', ...over });

  it('남이 넘긴 내 차례가 오른다', () => {
    expect(handedToMe([handed({ id: 'a' })], ME, SEEN).map((t) => t.id)).toEqual(['a']);
  });

  it('남의 차례는 안 오른다 — 거드는 게 아니라 감시가 된다', () => {
    expect(handedToMe([handed({ id: 'a', assigneeId: 'u2' })], ME, SEEN)).toEqual([]);
  });

  it('내가 나에게 준 것은 안 오른다 — 방금 적어 넣은 일로 띠가 뜨면 헛말이다', () => {
    expect(handedToMe([handed({ id: 'a', assignedBy: ME })], ME, SEEN)).toEqual([]);
  });

  it('닫기 전에 넘어온 것은 안 오른다', () => {
    const old = handed({ id: 'a', assignedAt: '2026-08-09T00:00:00.000Z' });
    expect(handedToMe([old], ME, SEEN)).toEqual([]);
  });

  it('차례 칸이 없던 시절 것은 안 오른다 — 이미 알고 있는 것이다', () => {
    const legacy = task({ id: 'a', assigneeId: ME, assignedBy: null, assignedAt: null });
    expect(handedToMe([legacy], ME, SEEN)).toEqual([]);
  });

  it('해버리면 셈에서 빠진다 — 띠를 닫는 길이 둘이다', () => {
    expect(handedToMe([handed({ id: 'a', done: true })], ME, SEEN)).toEqual([]);
  });

  it('날짜는 안 본다 — 다음 주 것이 내 차례가 됐어도 알아야 한다', () => {
    const later = handed({ id: 'a', date: '2026-12-25' });
    expect(handedToMe([later], ME, SEEN).map((t) => t.id)).toEqual(['a']);
  });

  it('늦게 넘어온 것이 앞에 온다', () => {
    const rows = [
      handed({ id: 'a', assignedAt: '2026-08-11T00:00:00.000Z' }),
      handed({ id: 'b', assignedAt: '2026-08-12T00:00:00.000Z' }),
    ];
    expect(handedToMe(rows, ME, SEEN).map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('로그인 전에는 아무것도 안 오른다', () => {
    expect(handedToMe([handed({ id: 'a' })], null, SEEN)).toEqual([]);
  });
});

describe('myTasksOn — 알림이 세는 것', () => {
  const ME = 'me';
  const D = '2026-08-14';

  it('남의 차례만 뺀다 — 안 정함은 내 몫이기도 하다', () => {
    const rows = [
      task({ id: 'mine', date: D, assigneeId: ME }),
      task({ id: 'open', date: D }),
      task({ id: 'his', date: D, assigneeId: 'u2' }),
    ];
    expect(myTasksOn(rows, D, ME).map((t) => t.id).sort()).toEqual(['mine', 'open']);
  });

  it('내 차례가 앞에 온다', () => {
    const rows = [task({ id: 'open', date: D }), task({ id: 'mine', date: D, assigneeId: ME })];
    expect(myTasksOn(rows, D, ME).map((t) => t.id)).toEqual(['mine', 'open']);
  });

  it('한 것과 다른 날은 안 센다', () => {
    const rows = [
      task({ id: 'done', date: D, done: true }),
      task({ id: 'other', date: '2026-08-15' }),
    ];
    expect(myTasksOn(rows, D, ME)).toEqual([]);
  });

  it('로그인 전에는 안 정함만 남는다', () => {
    const rows = [task({ id: 'open', date: D }), task({ id: 'his', date: D, assigneeId: 'u2' })];
    expect(myTasksOn(rows, D, null).map((t) => t.id)).toEqual(['open']);
  });
});
