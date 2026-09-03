# 문서

기능마다 폴더 하나. 그 안에 **`기능.md`(무엇을 왜)**와 **`파일.md`(어느 파일을 고치나)**가 있다.

"왜"를 같이 적는 이유가 있다. 예를 들어 장보기에 날짜가 없는 건 빠뜨린 게 아니라 정한 건데,
그게 안 적혀 있으면 다음 사람이 친절한 마음으로 날짜를 넣는다.

```
docs/
  tasks/      screens  repeat  postpone  categories  presets  assign
  shopping/   list  history
  store/      points  items  admin
  memo/
  rooms/
  nudge/
  notice/
  trash/
  account/    login  sync  database
  app/        architecture  navigation  design  prefs  notify  pwa  native
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

## 상점 — [store/](store/)

| 기능 | 무엇 |
|---|---|
| [points](store/points/기능.md) | ★ **포인트.** 어떻게 벌고, 왜 잔액 칸이 없는지 |
| [items](store/items/기능.md) | 상점 — 곰·방·소품, 시즌 세트, 값을 서버가 정하는 까닭 |
| [admin](store/admin/기능.md) | **상점 채우기.** 가격표의 주인이 넘어온 자리 (시안까지) |

[장보기](shopping/list/기능.md)와 다른 것이다 — 저쪽은 우유 사는 목록이고 이쪽은 곰돌이 옷이다.

## 공지 — [notice/](notice/)

[기능.md](notice/기능.md) · [파일.md](notice/파일.md) — 앱을 열면 한 번 뜨는 팝업.
★ **닫는 길이 둘인 까닭**(닫기 · 오늘 다시 열지 않기), 언제까지 안 뜨나를
서버가 아니라 폰에 담는 까닭, 켜진 것을 하나로 두는 까닭

## 메모 — [memo/](memo/)

[기능.md](memo/기능.md) · [파일.md](memo/파일.md) — 여러 장, 찾기, 안 본 표시,
★ **여러 방에 동시에**(메모만 그렇다), 암호화를 안 한 이유

## 같이 쓰기 — [rooms/](rooms/)

[기능.md](rooms/기능.md) · [파일.md](rooms/파일.md) — ★ **방.** 무엇을 나눌지, 초대와 코드,
주인과 손님, 끝내는 길 셋

## 콕 찌르기 — [nudge/](nudge/)

[기능.md](nudge/기능.md) · [파일.md](nudge/파일.md) — 하루 세 번, 아침 6시에 다시 채운다.
왜 말은 안 고르고 기록은 안 쌓는지

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
| [notify](app/notify/기능.md) | 아침·저녁 알림 — 기기가 스스로 띄운다 |
| [pwa](app/pwa/기능.md) | 홈 화면 설치, 아이콘, 서비스워커 |
| [native](app/native/기능.md) | 안드로이드 앱 (Capacitor) — APK 굽기 |

---

## 아직 안 한 것

**[next/남은-것.md](next/남은-것.md)** 하나에 모아뒀다. 무엇이 왜 남았는지, 안 하기로 한 것은 무엇인지.

- **누가 얼마나** — 기록 탭에 접어둘 사람별 숫자
- **콕 찌르기의 푸시 열쇠** — 코드는 다 있고 파이어베이스 설정만 남았다 ([nudge](nudge/기능.md))
- 내보내기, 홈 화면 위젯

그림([next/그림.html](next/그림.html))에서 **표가 안 붙은 칸**이 곧 이 목록이다.
