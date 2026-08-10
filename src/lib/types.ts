/** 1 낮음, 2 보통, 3 높음 */
export type Priority = 1 | 2 | 3;

/** 'YYYY-MM-DD' */
export type DateStr = string;

export interface Category {
  id: string;
  /** null이면 개인, 값이 있으면 그 방에서 나누는 카테고리 */
  roomId: string | null;
  name: string;
  /** 팔레트에서 고른 HEX */
  color: string;
  order: number;
  updatedAt: string;
}

/**
 * 같이 쓰는 방. 서버에만 있고 이 기기에는 담지 않는다 —
 * 방은 로그인해야 쓰는 것이라, 계정이 없으면 방도 없다.
 */
export interface Room {
  id: string;
  name: string;
  /** 방 색 — 팔레트에서 고른 HEX. 방 칩·배지에 쓴다. */
  color: string;
  /** 초대 링크에 실리는 값 */
  code: string;
  /** 방을 연 사람의 계정 id */
  createdBy: string;
  /** 내가 연 방인지 — 주인에게만 초대·코드·끝내기가 열린다 */
  mine: boolean;
  /**
   * 이 방이 무엇을 나누는가.
   * 끈 것은 담을 때 고르는 목록에 아예 안 나온다 — 고를 수 없으니 잘못 누를 수 없다.
   * 할 일에 딸린 `어느 카테고리를 나눌까`는 카테고리의 roomId가 들고 있다.
   */
  shareTasks: boolean;
  shareShop: boolean;
  shareMemo: boolean;
}

/** 방에 든 사람. 이름은 방마다 다르게 부를 수 있다. */
export interface RoomMember {
  roomId: string;
  userId: string;
  /** 이 방에서 불리는 이름 */
  displayName: string;
  /** 'owner' | 'member' */
  role: string;
  joinedAt: string;
}

/** 코드를 넣었을 때 들어가기 전에 먼저 보여주는 방 미리보기 */
export interface RoomPeek {
  id: string;
  name: string;
  color: string;
  /** 방 주인 이름 */
  owner: string | null;
  /** 든 사람들의 이름 */
  members: string[];
  count: number;
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

/**
 * 탭 셋(day·month·log) 위에 밀고 들어가는 화면이 쌓인다.
 *
 * 설정 아래는 층이 셋까지 간다 — 설정 → 같이 쓰기 → 방 설정.
 * 시트 위에 시트를 쌓으면 어디까지 왔는지가 안 보여서, 설정 갈래는 전부 화면이다.
 * 항목 하나를 손보는 자리(할 일·담기·즐겨찾기 한 건)만 시트로 남는다.
 */
export type ViewKind =
  | 'day'
  | 'month'
  | 'log'
  | 'shop'
  | 'memo'
  | 'settings'
  | 'prefs'
  | 'presetList'
  | 'categoryList'
  | 'account'
  | 'share'
  | 'room'
  | 'invite'
  | 'shares'
  | 'handover'
  | 'join';

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
  /**
   * 주 시작 요일 — 0=일요일, 1=월요일.
   * 달력과 기록 탭 주간 격자가 같이 따라간다. 주간을 넣기로 한 순간 반드시 걸리는 설정이다.
   */
  weekStart: 0 | 1;
  /** 알림 받기. 이걸 켜야 아래 두 시각이 열린다. */
  notify: boolean;
  /**
   * `오늘 할 일`을 받을 시각 'HH:MM'.
   * `아침에`라고 안 적는다 — 오늘 할 일을 저녁에 받고 싶은 사람도 있다.
   */
  notifyTodo: string;
  /** `오늘 남은 일`을 받을 시각 'HH:MM' */
  notifyLeft: string;
  /**
   * 이 기기에 담겨 있는 목록의 주인.
   * 저장소는 계정별이 아니라 브라우저별이라, 이게 없으면
   * 같은 기기에 다른 사람이 로그인했을 때 앞사람 목록이 뒷사람 계정으로 올라간다.
   */
  ownerId: string;
}

/** 지운 것 기록 — 서버에도 알려줄 때까지 들고 있는다 */
export interface Grave {
  id: string;
  /** 어느 종류였는지 (tasks, memos …) */
  kind: string;
  at: string;
}
