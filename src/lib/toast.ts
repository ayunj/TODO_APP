type Listener = (message: string) => void;

const listeners = new Set<Listener>();

/** 어느 층에서든 부를 수 있는 알림. Toast 컴포넌트가 받아서 띄운다. */
export function toast(message: string): void {
  listeners.forEach((fn) => fn(message));
}

export function onToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
