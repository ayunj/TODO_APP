import { describe, expect, it } from 'vitest';
import { notifyText } from './notify';
import type { Task } from './types';

const ME = 'me';
const task = (over: Partial<Task> & { id: string }): Task => ({
  roomId: null,
  title: '청소',
  memo: '',
  categoryId: 'home',
  priority: 2,
  date: '2026-08-14',
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
    doneById: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  deletedBy: null,
  ...over,
});

describe('notifyText — 알림 글씨', () => {
  it('셀 것이 없으면 안 건다', () => {
    expect(notifyText([], 'todo', ME)).toBeNull();
    expect(notifyText([], 'left', ME)).toBeNull();
  });

  it('혼자 쓰면 개수만 적는다', () => {
    const t = notifyText([task({ id: 'a' }), task({ id: 'b' })], 'todo', ME);
    expect(t?.title).toBe('오늘 2개');
  });

  it('다 내 차례면 차례로 적는다', () => {
    const rows = [task({ id: 'a', assigneeId: ME }), task({ id: 'b', assigneeId: ME })];
    expect(notifyText(rows, 'todo', ME)?.title).toBe('오늘 내 차례 2개');
  });

  it('안 정함이 섞여 있으면 둘 다 적는다 — 제목과 본문이 어긋나면 안 된다', () => {
    const rows = [task({ id: 'a', assigneeId: ME }), task({ id: 'b' })];
    expect(notifyText(rows, 'todo', ME)?.title).toBe('오늘 2개 — 내 차례 1개');
  });

  it('저녁은 남은 것을 센다', () => {
    const rows = [task({ id: 'a', assigneeId: ME })];
    expect(notifyText(rows, 'left', ME)?.title).toBe('내 차례 1개 남았어요');
    expect(notifyText([task({ id: 'a' })], 'left', ME)?.title).toBe('1개 남았어요');
  });

  it('본문은 첫 줄을 앞세운다 — 개수만 적으면 열 까닭이 없다', () => {
    expect(notifyText([task({ id: 'a', title: '분리수거' })], 'todo', ME)?.body).toBe('분리수거');
    const many = [
      task({ id: 'a', title: '분리수거' }),
      task({ id: 'b' }),
      task({ id: 'c' }),
    ];
    expect(notifyText(many, 'todo', ME)?.body).toBe('분리수거, 그 밖에 2개');
  });

  it('로그인 전에는 차례가 없다', () => {
    const rows = [task({ id: 'a', assigneeId: 'u2' })];
    expect(notifyText(rows, 'todo', null)?.title).toBe('오늘 1개');
  });
});
