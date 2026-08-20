'use client';

import { useEffect, useRef } from 'react';
import Fab from './Fab';
import Header from './Header';
import TabBar from './TabBar';
import SlidePage from './SlidePage';
import Toast from './Toast';
import AskHost from './AskHost';
import WelcomeScreen from './WelcomeScreen';
import SheetHost from '@/sheets/SheetHost';
import DayScreen from '@/screens/DayScreen';
import LoginScreen from '@/screens/LoginScreen';
import LogScreen from '@/screens/LogScreen';
import MemoScreen from '@/screens/MemoScreen';
import NewPasswordScreen from '@/screens/NewPasswordScreen';
import MonthScreen from '@/screens/MonthScreen';
import ShopScreen from '@/screens/ShopScreen';
import AccountScreen from '@/screens/settings/AccountScreen';
import CategoryListScreen from '@/screens/settings/CategoryListScreen';
import CategoryScreen from '@/screens/settings/CategoryScreen';
import HandoverScreen from '@/screens/settings/HandoverScreen';
import InviteScreen from '@/screens/settings/InviteScreen';
import JoinScreen from '@/screens/settings/JoinScreen';
import PrefsScreen from '@/screens/settings/PrefsScreen';
import PresetListScreen from '@/screens/settings/PresetListScreen';
import RoomSharesScreen from '@/screens/settings/RoomSharesScreen';
import RoomScreen from '@/screens/settings/RoomScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import TrashScreen from '@/screens/settings/TrashScreen';
import ShareScreen from '@/screens/settings/ShareScreen';
import { useAuth } from '@/lib/auth';
import { useBackGesture } from '@/lib/back';
import { addDays, addMonths, monthKey } from '@/lib/date';
import { onNotifyAction, POSTPONE } from '@/lib/notify';
import { myTasksOn } from '@/lib/selectors';
import { toast } from '@/lib/toast';
import { useStore } from '@/lib/store';
import { useSwipe } from '@/lib/swipe';
import { useUi } from '@/lib/ui';

export default function AppShell() {
  const { loading, onboarded, tasks, postponeTasks } = useStore();
  const { enabled, loading: checking, account, recovering } = useAuth();
  const { view, route, depth, cursor, setCursor, logSpan } = useUi();

  // 뒤로 제스처는 앱 전체가 한 자리에서 받는다 (한 번에 한 겹씩)
  useBackGesture();

  /*
    저녁 알림의 `내일로 미루기`. **그 날 남은 것을 통째로 옮긴다** —
    하나씩 고르는 것은 어차피 앱을 봐야 하는 일이고, 저녁 알림은 하루를 닫는 자리다.
    미루기 줄([PostponeRow](../screens/day/PostponeRow.tsx))과 같은 뜻으로 움직인다.
  */
  const latest = useRef({ tasks, postponeTasks, me: account?.id ?? null });
  latest.current = { tasks, postponeTasks, me: account?.id ?? null };
  useEffect(
    () =>
      onNotifyAction((actionId, date) => {
        if (actionId !== POSTPONE) return;
        const { tasks: rows, postponeTasks: move, me } = latest.current;
        const left = myTasksOn(rows, date, me);
        if (left.length === 0) return; // 그 사이 다 했으면 아무 일도 안 한다
        const to = addDays(date, 1);
        move(
          left.map((t) => t.id),
          to,
        );
        toast(`${left.length}개를 내일로 미뤘어요`);
      }),
    [],
  );

  // 아래 이른 반환들보다 위에 있어야 한다 — 훅은 렌더마다 같은 수로 불려야 한다
  const step = (n: number) =>
    setCursor(
      view === 'day'
        ? addDays(cursor, n)
        : // 기록 탭 주간은 한 주씩 넘긴다 — 달을 넘기면 보고 있던 주가 사라진다
          view === 'log' && logSpan === 'week'
          ? addDays(cursor, n * 7)
          : addMonths(cursor, n),
    );
  const swipe = useSwipe(
    () => step(-1),
    () => step(1),
  );

  const pushed = depth > 0;
  // 장보기·메모는 헤더가 제목을 그리고, 설정 갈래는 화면마다 제 제목 줄(PageBar)을 갖는다
  const headered = !route || route.kind === 'shop' || route.kind === 'memo';
  // 기록 탭은 뺀다. 달을 넘기는 화면이지만 격자를 옆으로 훑어보는 손짓과 겹친다.
  const swipeable = view === 'day' || view === 'month';

  if (loading || checking) {
    return (
      <div className="wrap">
        <div className="py-20 text-center text-[13px] text-ink3">불러오는 중…</div>
      </div>
    );
  }

  // 첫 화면을 지나기 전에는 탭바·+ 버튼·시트를 아예 붙이지 않는다
  if (!onboarded) {
    return (
      <>
        <WelcomeScreen />
        <Toast />
      </>
    );
  }

  // 열쇠가 없으면(enabled=false) 로그인 자체를 걸지 않는다 — 1단계처럼 그냥 쓴다
  if (enabled && !account) {
    return (
      <>
        <LoginScreen />
        <Toast />
      </>
    );
  }

  // 재설정 메일로 돌아온 참이면 새 비밀번호를 정하기 전까지 여기 머문다
  if (recovering) {
    return (
      <>
        <NewPasswordScreen />
        <Toast />
      </>
    );
  }

  const screenOf = () => {
    if (route) {
      switch (route.kind) {
        case 'shop':
          return <ShopScreen />;
        case 'memo':
          return <MemoScreen />;
        case 'settings':
          return <SettingsScreen />;
        case 'prefs':
          return <PrefsScreen />;
        case 'presetList':
          return <PresetListScreen />;
        case 'categoryList':
          return <CategoryListScreen />;
        case 'category':
          // 새 카테고리와 고치는 화면이 같은 자리라 적던 이름이 남지 않게 열쇠를 갈라둔다
          return <CategoryScreen key={route.id ?? 'new'} id={route.id} />;
        case 'account':
          return <AccountScreen />;
        case 'share':
          return <ShareScreen />;
        case 'room':
          // 방을 갈아탈 때 적던 이름이 남지 않게 열쇠를 갈라둔다
          return <RoomScreen key={route.id ?? 'new'} id={route.id} />;
        case 'invite':
          return <InviteScreen id={route.id} />;
        case 'shares':
          return <RoomSharesScreen id={route.id} />;
        case 'handover':
          return <HandoverScreen id={route.id} />;
        case 'trash':
          return <TrashScreen key={`${route.scope}-${route.id}`} scope={route.scope} id={route.id} />;
        case 'join':
          return <JoinScreen />;
      }
    }

    return view === 'day' ? (
      // key를 갈라둔다. 같은 자리에 있어서 안 그러면 탭을 옮길 때
      // 일별이 쓰던 방향이 그대로 남아 월별이 까닭 없이 한 번 미끄러진다
      <SlidePage key="day" cursor={cursor}>
        <DayScreen />
      </SlidePage>
    ) : view === 'month' ? (
      // 달을 넘기니까 날짜가 아니라 달을 열쇠로 준다 — 같은 달 안에서는 안 움직인다
      <SlidePage key="month" cursor={monthKey(cursor)}>
        <MonthScreen />
      </SlidePage>
    ) : (
      <LogScreen />
    );
  };

  return (
    <>
      {/*
        쓸어 넘기기는 `main`이 아니라 `wrap`에 걸고, 화면 높이만큼 늘려둔다.
        손가락은 대개 아래쪽에 닿는데 비어 있는 날은 내용이 화면 중간에서 끝나서
        그 아래를 쓸면 아무 일도 안 일어났다. 빈 곳도 넘기는 자리여야 한다.
      */}
      <div className={swipeable ? 'wrap min-h-[100dvh]' : 'wrap'} {...(swipeable ? swipe : {})}>
        {headered && <Header />}
        <main>{screenOf()}</main>
      </div>

      {/* 밀고 들어온 화면에서는 탭바도 + 버튼도 내린다 — 나가는 길은 뒤로가기 하나 */}
      {!pushed && (
        <>
          <Fab />
          <TabBar />
        </>
      )}
      <SheetHost />
      <AskHost />
      <Toast />
    </>
  );
}
