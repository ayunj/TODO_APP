export interface Question {
  /** 물음 한 줄 — `회사에서 나갈까요?` */
  title: string;
  /** 무엇이 없어지는지 한 줄 */
  loses?: string;
  /** 안심할 것 한 줄 */
  keeps?: string;
  /**
   * 버튼 이름은 **물음에 맞춘다.** `확인`이 아니라
   * `그만 나누기`·`맡기고 나가기`·`나가기`다.
   * 누르기 직전에 한 번 더 읽히는 자리라서 그렇다.
   */
  go: string;
  /** 되돌릴 수 없는 것이면 붉게 */
  danger?: boolean;
}

type Listener = (q: Question, answer: (yes: boolean) => void) => void;

const listeners = new Set<Listener>();

/**
 * 물어보고 답을 기다린다. 브라우저 confirm은 버튼 이름을 못 고쳐서 쓰지 않는다.
 * AskHost 컴포넌트가 받아서 띄운다.
 */
export function ask(q: Question): Promise<boolean> {
  return new Promise((resolve) => {
    if (listeners.size === 0) {
      resolve(false);
      return;
    }
    let settled = false;
    const answer = (yes: boolean) => {
      if (settled) return;
      settled = true;
      resolve(yes);
    };
    listeners.forEach((fn) => fn(q, answer));
  });
}

export function onAsk(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
