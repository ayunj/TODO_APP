import { describe, expect, it } from 'vitest';
import { BODY, NO_FIT, at, readFit, readout, type Art, type Spec } from './fit';

/*
  `fit.ts`의 셈만 본다. 그림을 읽고 담는 것은 캔버스가 있어야 도는 일이라
  여기서 못 돌린다 — **그런데 틀리면 아픈 데는 셈이다.**

  캔버스는 폭과 높이만 쓰이니 흉내를 낸다.
*/
const art = (box: Art['box'], w = box.x + box.w, h = box.y + box.h): Art =>
  ({ canvas: { width: w, height: h } as HTMLCanvasElement, box });

/** 기본 곰이 이렇게 서 있다고 치자 */
const SPEC: Spec = { foot: 500, head: 100, cx: 200, bodyH: 400 };

describe('발바닥과 중심에 맞춘다', () => {
  it('크기 100%면 기본 곰과 키가 같다', () => {
    const a = art({ x: 0, y: 0, w: 100, h: 200 }, 100, 200);
    expect(readout(a, SPEC, NO_FIT).h).toBe(SPEC.bodyH);
  });

  it('발바닥과 중심이 자에 붙는다', () => {
    const a = art({ x: 30, y: 70, w: 100, h: 200 }, 400, 500);
    const n = readout(a, SPEC, NO_FIT);
    expect(n.foot).toBe(SPEC.foot);
    expect(n.cx).toBe(SPEC.cx);
    expect(n.ok).toBe(true);
  });

  /*
    이 줄이 이 파일의 까닭이다. 왼쪽 위를 기준으로 두면 크기를 줄이는 순간
    곰돌이가 공중에 뜨고, 그걸 내리느라 손잡이 둘을 번갈아 만지게 된다.
  */
  it('크기를 바꿔도 발이 안 뜬다', () => {
    const a = art({ x: 30, y: 70, w: 100, h: 200 }, 400, 500);
    for (const scale of [0.4, 0.8, 1, 1.6]) {
      const n = readout(a, SPEC, { ...NO_FIT, scale });
      expect(n.foot).toBe(SPEC.foot);
      expect(n.cx).toBe(SPEC.cx);
    }
  });

  it('밀면 민 만큼만 움직인다', () => {
    const a = art({ x: 0, y: 0, w: 100, h: 200 }, 100, 200);
    const n = readout(a, SPEC, { scale: 1, dx: 25, dy: -40 });
    expect(n.cx).toBe(SPEC.cx + 25);
    expect(n.foot).toBe(SPEC.foot - 40);
    // 민 것은 자에서 벗어난 것이다 — 그렇다고 알려줘야 한다
    expect(n.ok).toBe(false);
  });

  it('2px까지는 붙은 것으로 본다 — 그보다 크면 아니라고 한다', () => {
    const a = art({ x: 0, y: 0, w: 100, h: 200 }, 100, 200);
    expect(readout(a, SPEC, { scale: 1, dx: 0, dy: 2 }).ok).toBe(true);
    expect(readout(a, SPEC, { scale: 1, dx: 0, dy: 3 }).ok).toBe(false);
  });
});

describe('readFit — 담긴 그림에서 되읽는다', () => {
  /*
    **되읽은 값을 그대로 넣으면 지금 그대로여야 한다.** 이게 어긋나면
    고치러 칸을 열기만 해도 크기가 튀어서, 고칠 생각이 없던 것이 고쳐진다.
  */
  const cases = [
    { x: 100, y: 46, w: 560, h: 700 },
    { x: 0, y: 0, w: 760, h: 760 },
    { x: 300, y: 500, w: 160, h: 220 },
  ];

  for (const box of cases) {
    it(`제자리에 그대로 — ${box.w}×${box.h} @ ${box.x},${box.y}`, () => {
      const a = art(box, BODY, BODY);
      const back = readFit(a, SPEC);
      expect(back).not.toBeNull();

      const p = at(a, SPEC, back!);
      // 담긴 정사각을 원래 자리에 원래 크기로 다시 놓는다
      expect(p.x).toBeCloseTo(0, 6);
      expect(p.y).toBeCloseTo(0, 6);
      expect(p.w).toBeCloseTo(BODY, 6);
      expect(p.h).toBeCloseTo(BODY, 6);
    });
  }

  it('우리가 담은 크기가 아니면 되읽을 값이 없다', () => {
    expect(readFit(art({ x: 0, y: 0, w: 100, h: 200 }, 100, 200), SPEC)).toBeNull();
    expect(readFit(art({ x: 0, y: 0, w: BODY, h: 0 }, BODY, BODY), SPEC)).toBeNull();
  });
});
