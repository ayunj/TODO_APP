# 문서

기능마다 폴더 하나. 그 안에 **`기능.md`(무엇을 왜)**와 **`파일.md`(어느 파일을 고치나)**가 있다.

"왜"를 같이 적는 이유가 있다. 예를 들어 장보기에 날짜가 없는 건 빠뜨린 게 아니라 정한 건데,
그게 안 적혀 있으면 다음 사람이 친절한 마음으로 날짜를 넣는다.

```
docs/
  tasks/      screens  repeat  postpone  categories  presets
  shopping/   list  history
  memo/
  account/    login  sync  database
  app/        architecture  navigation  design  pwa
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

## 장보기 — [shopping/](shopping/)

| 기능 | 무엇 |
|---|---|
| [list](shopping/list/기능.md) | 목록. 왜 할 일과 따로 뒀는지 |
| [history](shopping/history/기능.md) | 구매 기록, 자주 사는 것 |

## 메모 — [memo/](memo/)

[기능.md](memo/기능.md) · [파일.md](memo/파일.md) — 여러 장, 찾기, 안 본 표시, 암호화를 안 한 이유

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
| [navigation](app/navigation/기능.md) | 헤더, 탭바, 시트, 화면 이동 |
| [design](app/design/기능.md) | 색 토큰, 말투 |
| [pwa](app/pwa/기능.md) | 설치, 아이콘, 서비스워커 |

---

## 아직 안 한 것

- **방과 초대 링크** — DB는 다 돼 있고 화면·연결이 없다 ([database](account/database/기능.md))
- **완료자 이름 배지** — `doneBy` 자리는 뚫어놨지만 늘 `null`
- **실시간** — 앱 열 때 한 번만 맞춘다 ([sync](account/sync/기능.md))
- **알림(3단계)** — 아침에 오늘 할 일 한 줄. 서버 cron이 필요하다
- 삭제 되돌리기 ([postpone](tasks/postpone/기능.md)), 내보내기, 홈 화면 위젯
