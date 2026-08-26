/**
 * 곰돌이가 방 안에서 서는 자리 — **한 군데에만 적는다.**
 *
 * ─── 왜 한 군데인가 ────────────────────────────────────────────
 *
 * 곰돌이가 방 위에 서는 자리가 넷이다. 홈 칸, 상점 걸쳐보는 칸, 세트 펼친 칸,
 * 그리고 [상점 채우기의 맞추는 칸](../screens/admin/Align.tsx).
 *
 * 이 값을 자리마다 따로 적어뒀다가 **어긋났다.** 상점에서 72%로 맞춰 올린 그림이
 * 홈에서는 92%로 서서 훨씬 컸다. 발주서에 이미 적혀 있던 줄을 어긴 것이다 —
 *
 * > **걸쳐보는 칸과 홈 칸은 같은 비율이어야 한다.**
 * > 걸쳐본 대로 홈에 서지 않으면 걸쳐보는 뜻이 없다.
 * > ([design/g/그릴-것.md](../../design/g/그릴-것.md))
 *
 * 그래서 여기 한 줄로 모았다. **고칠 일이 있으면 여기만 고친다.**
 *
 * ─── 왜 이 값인가 ──────────────────────────────────────────────
 *
 * 정사각 그림 안에 **머리 위 여백이 있다.** 곰토끼 귀나 마법사 고깔이 들어갈
 * 자리를 비워둔 것이라(`scripts/bears.mjs`의 `FIT`), 그만큼 칸을 키워야
 * 곰돌이가 제 크기로 선다. 여백이 없던 시절의 46%로 두면 20% 작아 보인다.
 *
 * `max-h`도 같이 묶는다. **한쪽만 묶으면 그림 비가 바뀔 때 칸을 뚫는다.**
 */

/** 곰돌이가 칸 폭의 몇 %로 뜨나 */
export const BEAR_W = 72;
/** 발끝이 칸 바닥에서 몇 % 떠 있나 */
export const BEAR_FLOOR = 6;

/**
 * 곰돌이 한 마리 — 방 위에 얹는다.
 * **`scripts/bears.mjs`의 `SLOT`이 이 값을 베껴 쓴다**(node에서는 이 파일을 못 읽는다).
 */
export const BEAR_ART = 'relative z-[1] mb-[6%] block h-auto max-h-[74%] w-auto max-w-[72%]';

/** 방 한 장 — 칸을 꽉 채운다. **아래를 맞춰 자른다** */
export const ROOM_ART = 'absolute inset-0 h-full w-full object-cover object-bottom';

/**
 * 방과 곰돌이가 앉는 정사각 칸.
 *
 * 세로는 아래, 가로는 **가운데**다. `place-items-end` 한 낱말로 쓰면
 * 가로까지 끝으로 밀려서 곰돌이가 오른쪽 벽에 붙는다 — 둘을 갈라 적는다.
 */
export const ROOM_BOX =
  'relative grid aspect-square w-full items-end justify-items-center overflow-hidden';
