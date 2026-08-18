# 문서

기능마다 폴더 하나. 그 안에 **`기능.md`(무엇을 왜)**와 **`파일.md`(어느 파일을 고치나)**가 있다.

"왜"를 같이 적는 이유가 있다. 예를 들어 장보기에 날짜가 없는 건 빠뜨린 게 아니라 정한 건데,
그게 안 적혀 있으면 다음 사람이 친절한 마음으로 날짜를 넣는다.

```
docs/
  tasks/      screens  repeat  postpone  categories  presets  assign
  shopping/   list  history
  memo/
  rooms/
  trash/
  account/    login  sync  database
  app/        architecture  navigation  design  prefs  pwa  native
```

---

## 할 일 — [tasks/](tasks/)

| 기능 | 무엇 |
|---|---|
| [screens](tasks/screens/기능.md) | 세 화면(일·월·기록), 할 일 한 줄의 생김새 |
| [repeat](tasks/repeat/기능.md) | ★ **반복 주기.** 이 앱의 핵심 규칙 |
| [postpone](tasks/postpone/기능.md) | 미루기 — 한꺼번에, 한 건씩, 날짜 지정 |
| [categories](tasks/categories/기능.md) | 카테고리와 필터 |
| [presets](tasks/presets/기능.md) | 즐겨찾기 |
| [assign](tasks/assign/기능.md) | ★ **배정.** 누가 하나요, 반복이면 교대 |

## 장보기 — [shopping/](shopping/)

| 기능 | 무엇 |
|---|---|
| [list](shopping/list/기능.md) | 목록. 왜 할 일과 따로 뒀는지, 방과 나누기(한 곳만) |
| [history](shopping/history/기능.md) | 구매 기록, 자주 사는 것 |

## 메모 — [memo/](memo/)

[기능.md](memo/기능.md) · [파일.md](memo/파일.md) — 여러 장, 찾기, 안 본 표시,
★ **여러 방에 동시에**(메모만 그렇다), 암호화를 안 한 이유

## 같이 쓰기 — [rooms/](rooms/)

[기능.md](rooms/기능.md) · [파일.md](rooms/파일.md) — ★ **방.** 무엇을 나눌지, 초대와 코드,
주인과 손님, 끝내는 길 셋

## 지운 것 — [trash/](trash/)

[기능.md](trash/기능.md) · [파일.md](trash/파일.md) — 30일, 되돌리기 하나.
한데 모아 보는 화면을 왜 안 만들었는지

## 계정 — [account/](account/)

| 기능 | 무엇 |
|---|---|
| [login](account/login/기능.md) | 로그인, 비밀번호 찾기, 초대 링크 |
| [sync](account/sync/기능.md) | ★ **동기화.** 합치는 규칙과 함정 셋 |
| [database](account/database/기능.md) | 테이블, RLS, 방 함수 |

## 앱 껍데기 — [app/](app/)

| 기능 | 무엇 |
|---|---|
| [architecture](app/architecture/기능.md) | ★ 층 구조와 저장소 인터페이스 |
| [navigation](app/navigation/기능.md) | ★ 헤더, 탭바, 밀고 들어가는 화면 스택, 시트 |
| [design](app/design/기능.md) | 색 토큰, 말투 |
| [prefs](app/prefs/기능.md) | 앱 설정 — 주 시작 요일과 알림 |
| [pwa](app/pwa/기능.md) | 홈 화면 설치, 아이콘, 서비스워커 |
| [native](app/native/기능.md) | 안드로이드 앱 (Capacitor) — APK 굽기 |

---

## 아직 안 한 것

**[next/남은-것.md](next/남은-것.md)** 하나에 모아뒀다. 무엇이 왜 남았는지, 안 하기로 한 것은 무엇인지.

- **콕 찌르기** — 시트에 자리만 있고 누르면 준비 중이라고만 한다
- **알림** — 시각을 담아두는 화면까지 왔다. 실제로 울리는 길이 없다 ([prefs](app/prefs/기능.md))
- **누가 얼마나** — 기록 탭에 접어둘 사람별 숫자
- **실시간** — 앱 열 때 한 번만 맞춘다 ([sync](account/sync/기능.md))
- 내보내기, 홈 화면 위젯

그림([next/그림.html](next/그림.html))에서 **표가 안 붙은 칸**이 곧 이 목록이다.
