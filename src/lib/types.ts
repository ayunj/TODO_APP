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

/**
 * 장보기 항목. 할 일이 아니다 — 날짜도 주기도 우선순위도 없다.
 * 날짜를 붙이면 안 산 우유가 '3일 지남'으로 뜨는데, 그건 밀린 일이 아니다.
 */
export interface ShopItem {
  id: string;
  /** null이면 개인 (2단계에서 방 id가 들어온다) */
  roomId: string | null;
  title: string;
  /** '저지방으로', '2개' — 마트에서 헷갈리지 않게 */
  note: string;
  /** '쿠팡', '이마트' — 어디서 사는지. 자유롭게 적는다 */
  place: string;
  /** 담았음 */
  done: boolean;
  /**
   * 담은 날 — 'YYYY-MM-DD'. 언제 샀는지는 이걸로 안다.
   * 목록에 남는지 기록으로 내려가는지도 이 날짜 하나로 갈린다 — 따로 치우는 버튼이 없다.
   */
  boughtOn: DateStr | null;
  /** 담은 사람 표시 이름 (2단계) */
  doneBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 흘러가지 않는 종이 한 장. 계좌번호·관리비처럼 한 번 적어두고 계속 보는 것들.
 * 대화창이 아니다 — 카톡이 불편한 건 대화가 안 돼서가 아니라 위로 흘러가버려서다.
 */
export interface Memo {
  id: string;
  roomId: string | null;
  /** 제목 칸을 따로 두지 않는다 — 접었을 때 첫 줄이 제목 노릇을 한다 */
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** shop·memo는 탭이 아니라 헤더에서 밀고 들어가는 화면 */
export type ViewKind = 'day' | 'month' | 'log' | 'shop' | 'memo';

/** 할 일이 아니라 이 기기의 상태. 초기화해도 지워지지 않는다. */
export interface Settings {
  /** 첫 화면을 지났는지 — 한 번 지나면 다시 보이지 않는다 */
  onboarded: boolean;
  /** 메모를 마지막으로 본 시각. 이보다 나중에 고쳐진 메모가 있으면 점이 뜬다. */
  memoSeenAt: string;
  /**
   * 서버와 마지막으로 맞춘 시각.
   * 서버에 없는 로컬 항목이 '아직 안 올린 것'인지 '남이 지운 것'인지를 이걸로 가른다.
   */
  syncedAt: string;
}

/** 지운 것 기록 — 서버에도 알려줄 때까지 들고 있는다 */
export interface Grave {
  id: string;
  /** 어느 종류였는지 (tasks, memos …) */
  kind: string;
  at: string;
}
