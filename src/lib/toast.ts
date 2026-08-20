import type { Pose } from '@/components/Tomato';

type Listener = (message: string, pose?: Pose) => void;

const listeners = new Set<Listener>();

/**
 * 어느 층에서든 부를 수 있는 알림. Toast 컴포넌트가 받아서 띄운다.
 *
 * `pose`를 주면 말 옆에 그 컷이 붙는다. 늘 붙이지는 않는다 —
 * 미룬 것·지운 것까지 그림이 따라다니면 그림이 값을 잃는다.
 */
export function toast(message: string, pose?: Pose): void {
  listeners.forEach((fn) => fn(message, pose));
}

export function onToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
