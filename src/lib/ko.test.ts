import { describe, expect, it } from 'vitest';
import { iga } from './ko';

describe('iga — 받침에 따라 갈리는 이/가', () => {
  it('받침이 없으면 가', () => {
    expect(iga('설거지')).toBe('가');
    expect(iga('빨래')).toBe('가');
  });

  it('받침이 있으면 이', () => {
    expect(iga('분리수거함')).toBe('이');
    expect(iga('약속')).toBe('이');
  });

  it('한글이 아니면 가로 둔다 — 읽는 소리를 글자로는 알 수 없다', () => {
    expect(iga('milk')).toBe('가');
    expect(iga('🧺')).toBe('가');
  });

  it('빈 이름에도 안 넘어진다', () => {
    expect(iga('')).toBe('가');
    expect(iga('   ')).toBe('가');
  });

  it('꼬리 공백은 안 센다', () => {
    expect(iga('약속  ')).toBe('이');
  });
});
