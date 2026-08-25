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
  /**
   * 콕 찌르기를 받는 방인지.
   * **집에서 오는 콕은 귀엽지만 회사방에서 오는 건 재촉이다.**
   */
  shareNudge: boolean;
}

/**
 * 받은 콕 하나. **기록이 아니라 우편함이다** — 보고 나면 지운다.
 * 남는 것은 보낸 사람의 남은 횟수뿐이다.
 */
export interface Nudge {
  id: string;
  roomId: string;
  /** 보낸 사람의 **그때 그 이름**. 방을 나간 사람이 보낸 것도 이름은 읽혀야 한다. */
  fromName: string;
  taskId: string | null;
  taskTitle: string;
  /** 칩을 그리려고 담아둔다. 카테고리가 지워졌으면 null. */
  categoryId: string | null;
  createdAt: string;
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

/**
 * 코드를 넣었을 때 들어가기 전에 먼저 보여주는 방 미리보기.
 * **이름·사람·나누는 것만** 담는다 — 코드를 아는 사람에게도 들어오기 전까지는
 * 할 일 한 줄도 보이면 안 된다.
 */
export interface RoomPeek {
  id: string;
  name: string;
  color: string;
  /** 방 주인 이름 */
  owner: string | null;
  /** 든 사람들 (들어온 순서) */
  members: { name: string; owner: boolean }[];
  count: number;
  /** 무엇을 나누는 방인지 — 모르고 들어가면 남의 장보기가 갑자기 뜬다 */
  shareTasks: boolean;
  shareShop: boolean;
  shareMemo: boolean;
  /** 나누는 카테고리 */
  cats: { name: string; color: string }[];
}

/**
 * 다음 회차의 차례를 어떻게 할까.
 * **`once`가 기본이다** — 이번만 그 사람이고 다음부터는 비운다.
 * 한 번 정한 사람이 계속 따라붙는 건 놀라운 일이라 고를 때만 그렇게 된다.
 */
export type Rotate = 'once' | 'same' | 'rotate';

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
  /**
   * 누가 할까 — null이면 `안 정함`. 먼저 보는 사람이 하면 된다.
   * 이름이 아니라 사람(계정 id)으로 담는다. 이름으로 담으면 상대가 별명을 바꾼 순간
   * 옛 할 일들이 옛 이름으로 남는다.
   */
  assigneeId: string | null;
  /**
   * 차례가 넘어온 때. `앱을 열었을 때 뜨는 띠`가 이걸로 선다.
   *
   * `updatedAt`으로는 못 센다 — 제목만 고쳐도 밀리는 칸이라
   * 이미 내 차례인 일을 한 번 고치면 띠가 다시 뜬다. **차례가 바뀔 때만** 민다.
   */
  assignedAt: string | null;
  /**
   * 차례를 넘긴 사람의 계정 id. 이게 있어야 **내가 나에게 준 것**을 거른다 —
   * 방금 내가 적어 넣은 일로 띠가 뜨면 앱이 헛말을 하는 것이다.
   * 교대로 넘어온 것은 체크한 사람이 넘긴 것으로 적는다.
   */
  assignedBy: string | null;
  /** 다음 회차의 차례. 주기가 있고 담당자를 골랐을 때만 뜻이 있다. */
  rotate: Rotate;
  done: boolean;
  doneOn: DateStr | null;
  /** 누가 했나 — 표시 이름. `누가 할까`(assigneeId)와 한 자리를 나눠 쓴다 */
  doneBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** 지운 때. null이면 살아 있는 것 — 지운 것은 30일 뒤에 진짜로 사라진다. */
  deletedAt: string | null;
  /** 지운 사람의 계정 id. 방 것에만 쓴다 — 개인 것은 지운 사람이 늘 나다. */
  deletedBy: string | null;
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
  assigneeId: string | null;
  rotate: Rotate;
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
  /** 지운 때. null이면 살아 있는 것 */
  deletedAt: string | null;
  /** 지운 사람의 계정 id */
  deletedBy: string | null;
}

/**
 * 흘러가지 않는 종이 한 장. 계좌번호·관리비처럼 한 번 적어두고 계속 보는 것들.
 * 대화창이 아니다 — 카톡이 불편한 건 대화가 안 돼서가 아니라 위로 흘러가버려서다.
 */
export interface Memo {
  id: string;
  /**
   * **메모만 여러 방에 동시에 걸린다.** 비어 있으면 나만 보는 것.
   *
   * 할 일은 카테고리가 방 하나를 물고 있고 장보기는 한 곳만 간다.
   * 메모는 다르다 — 와이파이 비밀번호는 집에서도 회사에서도 같은 종이 한 장이다.
   * 한 장을 여러 방에 둬도 **내용은 하나**라, 어디서 고쳐도 같이 바뀐다.
   */
  roomIds: string[];
  /** 제목 칸을 따로 두지 않는다 — 접었을 때 첫 줄이 제목 노릇을 한다 */
  text: string;
  createdAt: string;
  updatedAt: string;
  /** 마지막으로 고친 사람의 계정 id. 남이 고쳤을 때만 점이 뜬다. */
  updatedBy: string | null;
  /** 지운 때. null이면 살아 있는 것 */
  deletedAt: string | null;
  /** 지운 사람의 계정 id */
  deletedBy: string | null;
}

/** 지운 것을 어디에서 보고 있나 — 내 카테고리 · 방 · 장보기 · 메모 */
export type TrashScope = 'category' | 'room' | 'shop' | 'memo';

/**
 * 지운 것 한 줄. 할 일·장보기·메모를 한 모양으로 본다 —
 * 방 것은 세 가지가 한자리에 섞여 있어서 종류를 따로 물으면 화면이 셋이 된다.
 */
export interface Trashed {
  kind: 'task' | 'shop' | 'memo';
  id: string;
  /** 메모는 첫 줄이 제목 노릇을 한다 */
  title: string;
  /** 장보기·메모에는 카테고리가 없다 */
  categoryId: string | null;
  /** 어느 방 것인가. 비어 있으면 나만 보던 것 — 메모만 여럿일 수 있다. */
  rooms: string[];
  /** 지운 때 (ISO) */
  at: string;
  /** 지운 사람의 계정 id */
  by: string | null;
}

/**
 * 탭 셋(day·month·log) 위에 밀고 들어가는 화면이 쌓인다.
 *
 * 설정 아래는 층이 셋까지 간다 — 설정 → 같이 쓰기 → 방 설정.
 * 시트 위에 시트를 쌓으면 어디까지 왔는지가 안 보여서, 설정 갈래는 전부 화면이다.
 * 항목 하나를 손보는 자리(할 일·담기·즐겨찾기 한 건)만 시트로 남는다.
 */
export type ViewKind =
  | 'home'
  | 'day'
  | 'month'
  | 'log'
  | 'shop'
  | 'memo'
  | 'settings'
  | 'prefs'
  | 'presetList'
  | 'categoryList'
  | 'category'
  | 'trash'
  | 'account'
  | 'share'
  | 'room'
  | 'invite'
  | 'shares'
  | 'handover'
  | 'join';

/**
 * 파는 것 하나 — 곰 스타일 · 방 테마 · 포즈.
 *
 * **값은 화면에 적는 값이다.** 진짜로 얼마를 치를지는 서버가 정한다
 * (schema.sql의 `costume_catalog`와 `buy_costume`).
 */
export interface Costume {
  key: string;
  name: string;
  price: number;
  kind: 'bear' | 'room' | 'pose';
  /** 어느 시즌 세트에 딸린 것인가. 없으면 늘 있는 것. */
  season?: string;
  /** 아직 안 그린 것에는 없다 */
  img?: string;
}

/**
 * 시즌 세트 — 곰과 방을 **따로 사고**, 둘을 다 모으면 포즈를 받는다.
 * 묶어 파는 값이 따로 없어서 세트 자체에는 값이 없다.
 */
export interface CostumeSet {
  key: string;
  name: string;
  /** 한 줄 설명 — `여름 바다에서 신나게!` */
  note: string;
  bear: Costume;
  room: Costume;
  pose: Costume;
}

/**
 * 곰돌이 상태 — **로그인한 사람만 갖는다.**
 * 포인트를 서버가 세기 때문이다. 로그인 안 하면 옷장이 비고 기본 곰돌이가 선다.
 */
export interface Gomdori {
  /** 지금 입은 것. 포즈도 곰돌이 그림 한 장이라 여기 앉는다. */
  wornBear: string;
  /** 지금 깐 방 */
  wornRoom: string;
  /** 가진 것들의 열쇠 */
  owned: string[];
  /**
   * 지금 얼마 있나 — **서버가 센 값.**
   * 담아둔 잔액이 아니라 `가입 100P + 번 것 − 산 값의 합`이라
   * 체크를 풀면 저절로 도로 빠진다.
   */
  points: number;
}

/** 할 일이 아니라 이 기기의 상태. 초기화해도 지워지지 않는다. */
export interface Settings {
  /** 첫 화면을 지났는지 — 한 번 지나면 다시 보이지 않는다 */
  onboarded: boolean;
  /** 메모를 마지막으로 본 시각. 이보다 나중에 고쳐진 메모가 있으면 점이 뜬다. */
  memoSeenAt: string;
  /**
   * 배정 띠를 마지막으로 닫은 시각. 이보다 나중에 넘어온 내 차례가 있으면 띠가 뜬다.
   *
   * **이 기기의 것이다** — 폰에서 닫아도 PC에서 한 번 더 보이는 게 맞다.
   * 안 본 표시(`memoSeenAt`)와 같은 결이라 같은 자리에 둔다.
   */
  assignSeenAt: string;
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
