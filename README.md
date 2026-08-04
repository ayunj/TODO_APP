# 할 일 앱 — 1단계 기초 소스

반복되는 집안일을 나눠서 놓치지 않게 하는 앱. 범용 할 일 관리 앱이 아니다.
`SPEC.md`의 1단계(혼자 쓰는 PWA) 범위를 구현했다. 프로토타입(`todo.html`)은 눈으로만 참고했고 코드는 새로 썼다.

## 돌리기

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 반복 주기 규칙 테스트
npm run build
```

## 스택

Next.js (App Router) · TypeScript · Tailwind CSS · date-fns · IndexedDB · PWA

## 구조

화면은 전부 따로 떨어져 있다. 공통 껍데기가 세 화면 중 하나를 갈아끼운다.

```
src/
  app/
    layout.tsx            폰트·메타·뷰포트(safe-area)
    providers.tsx         StoreProvider + UiProvider, 서비스 워커 등록
    page.tsx              → AppShell
    globals.css           색 토큰, 시트 애니메이션, 스크롤바 숨김

  lib/
    types.ts              Task / Preset / Category
    date.ts               날짜는 앱 전체에서 'YYYY-MM-DD' 문자열로만 다룬다
    repeat.ts             ★ baseOf / spawnNext / cycleProgress — 이 앱의 핵심 규칙
    repeat.test.ts        명세의 필수 3케이스
    repository.ts         ★ 데이터 접근 인터페이스 (한 겹) + 기기 설정(onboarded)
    repo/indexeddb.ts     1단계 구현체
    repo/memory.ts        SSR·테스트용
    repo/index.ts         getRepository() — 2단계에서 여기만 바꾼다
    store.tsx             상태 + 모든 쓰기 동작 (낙관적 업데이트)
    selectors.ts          날짜·월·습관 격자 조회
    ui.tsx                view / cursor / filter / sheet
    toast.ts              어느 층에서든 부를 수 있는 알림

  components/             헤더·탭바·FAB·시트 껍데기·폼 부품
    WelcomeScreen.tsx       첫 화면 (WelcomeArt.tsx)
  screens/
    DayScreen.tsx           day/ProgressStrip · PresetChips · TaskRow · StaleSection
    MonthScreen.tsx         month/MonthCell
    LogScreen.tsx           log/CategoryBars · HabitGrid
  sheets/
    SheetHost.tsx           시트는 한 번에 하나만
    TaskSheet / TaskFormFields
    PresetListSheet / PresetSheet
    CategoryListSheet / CategorySheet
    SettingsSheet / ShareSheet(2단계 자리)
```

## 지켜둔 것

- **데이터 접근은 `lib/repository.ts` 한 겹만 지난다.** 컴포넌트가 저장소를 직접 부르지 않는다.
  2단계에서 `repo/index.ts`의 `getRepository()`가 `SupabaseRepository`를 돌려주게 하면 화면은 손대지 않아도 된다.
- **모든 쓰기는 낙관적.** 체크박스를 누르면 화면이 먼저 바뀌고 저장은 뒤에서 조용히 간다.
- **미래 회차를 미리 만들지 않는다.** 완료할 때 다음 1건만 만들고, 이미 미완료 회차가 있으면 만들지 않는다.
- 밀린 일을 빨갛게 칠하지 않는다. `3일 지남`이라고만 적는다.
- 완료한 항목을 숨기지 않는다. 아래로 내리고 취소선만 긋는다.
- 메모는 일별 화면에서만 보인다 (`screens/day/TaskRow.tsx`만 메모를 그린다).
- 카테고리를 지우면 그 안의 할 일은 남은 카테고리로 옮겨진다. 옮겨질 개수를 먼저 알려준다.
- 필터는 저장하지 않는다 — 새로고침하면 `전체`로 돌아간다.
- **첫 화면은 처음 한 번만.** `시작하기`를 누르면 `onboarded`가 저장소에 남아 다시 나오지 않는다.
  이 화면에서는 탭바도 + 버튼도 붙이지 않는다 — 누를 곳이 하나뿐이어야 한다.
  `전체 초기화`는 할 일·자주 쓰는 일·카테고리만 비우고 설정은 남긴다 (첫 화면이 되돌아오지 않는다).

## 아직 안 한 것

- **함께 쓰기(2단계).** `sheets/ShareSheet.tsx`는 자리만 잡아둔 안내 화면이다.
  `Task.roomId` / `doneBy`, `Preset.roomId` 필드는 미리 뚫어뒀지만 전부 `null`로만 쓰인다.
  붙일 때는 Supabase Auth + 방 + 초대 링크로 가고, 링크로 들어온 쪽은 읽기 + 완료 체크만 열어준다.
- 알림(3단계), 홈 화면 위젯·내보내기(4단계).
- PWA 아이콘이 SVG 한 장뿐이다. 배포 전에 192/512 PNG를 넣는 게 좋다.
- 확인 창은 브라우저 기본 `confirm()`을 쓴다. 시트 UI로 바꿀 여지가 있다.

## 마무리 체크리스트 (SPEC §8)

- [x] 새 반복 테스트 3케이스 통과 (`npm test`)
- [x] 완료 취소 시 대기 중인 다음 회차가 사라짐
- [x] 메모가 일별에서만 보이고 월별에는 안 보임
- [x] 반복 회차가 새로 생길 때 메모가 승계됨
- [x] 종료일이 지나면 다음 회차가 생기지 않음
- [x] 월별 칸에 제목이 보이고, 4개 이상이면 `+N`
- [x] 기록 탭 격자가 했음/예정/없음 세 상태로 칠해짐
- [x] 카테고리를 지우면 그 안의 할 일이 다른 카테고리로 옮겨짐
- [x] 하단 탭바와 + 버튼이 홈 인디케이터에 가리지 않음 (`env(safe-area-inset-*)`)
- [x] 필터를 켜면 세 화면 모두, 자주 쓰는 일 칩까지 걸러짐
- [ ] 두 기기에서 동시에 고쳐도 한쪽 변경이 사라지지 않음 — 2단계
- [ ] 홈 화면에 설치되고 오프라인에서 열림 — 실기기 확인 필요
