/** 1 낮음, 2 보통, 3 높음 */
export type Priority = 1 | 2 | 3;

/** 'YYYY-MM-DD' */
export type DateStr = string;

export interface Category {
  id: string;
  name: string;
  /** 팔레트에서 고른 HEX */
  color: string;
  order: number;
  updatedAt: string;
}

export interface Task {
  id: string;
  /** null이면 개인 (2단계에서 방 id가 들어온다) */
  roomId: string | null;
  title: string;
  /** 여러 줄 허용, 없으면 '' */
  memo: string;
  categoryId: string;
  priority: Priority;
  /** 이 날 할 일 */
  date: DateStr;
  /** 0이면 반복 없음 */
  repeatDays: number;
  /** 이 날 이후로는 다시 만들지 않음. null이면 무기한 */
  repeatUntil: DateStr | null;
  /** 이번 주기가 시작된 날 (진행률 계산용) */
  cycleSince: DateStr | null;
  /** 이 항목을 낳은 이전 회차 */
  parentId: string | null;
  done: boolean;
  doneOn: DateStr | null;
  /** 완료한 사람 표시 이름 (2단계) */
  doneBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Preset {
  id: string;
  roomId: string | null;
  title: string;
  memo: string;
  categoryId: string;
  priority: Priority;
  repeatDays: number;
  repeatUntil: DateStr | null;
  updatedAt: string;
}

export type ViewKind = 'day' | 'month' | 'log';

/** 할 일이 아니라 이 기기의 상태. 초기화해도 지워지지 않는다. */
export interface Settings {
  /** 첫 화면을 지났는지 — 한 번 지나면 다시 보이지 않는다 */
  onboarded: boolean;
}
