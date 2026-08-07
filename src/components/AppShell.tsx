'use client';

import Fab from './Fab';
import Header from './Header';
import TabBar from './TabBar';
import Toast from './Toast';
import WelcomeScreen from './WelcomeScreen';
import SheetHost from '@/sheets/SheetHost';
import DayScreen from '@/screens/DayScreen';
import LoginScreen from '@/screens/LoginScreen';
import LogScreen from '@/screens/LogScreen';
import MemoScreen from '@/screens/MemoScreen';
import NewPasswordScreen from '@/screens/NewPasswordScreen';
import MonthScreen from '@/screens/MonthScreen';
import ShopScreen from '@/screens/ShopScreen';
import { useAuth } from '@/lib/auth';
import { addDays, addMonths } from '@/lib/date';
import { useStore } from '@/lib/store';
import { useSwipe } from '@/lib/swipe';
import { useUi } from '@/lib/ui';

export default function AppShell() {
  const { loading, onboarded } = useStore();
  const { enabled, loading: checking, account, recovering } = useAuth();
  const { view, cursor, setCursor } = useUi();

  // 아래 이른 반환들보다 위에 있어야 한다 — 훅은 렌더마다 같은 수로 불려야 한다
  const step = (n: number) => setCursor(view === 'day' ? addDays(cursor, n) : addMonths(cursor, n));
  const swipe = useSwipe(
    () => step(-1),
    () => step(1),
  );

  const pushed = view === 'shop' || view === 'memo';
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

  return (
    <>
      {/*
        쓸어 넘기기는 `main`이 아니라 `wrap`에 걸고, 화면 높이만큼 늘려둔다.
        손가락은 대개 아래쪽에 닿는데 비어 있는 날은 내용이 화면 중간에서 끝나서
        그 아래를 쓸면 아무 일도 안 일어났다. 빈 곳도 넘기는 자리여야 한다.
      */}
      <div className={swipeable ? 'wrap min-h-[100dvh]' : 'wrap'} {...(swipeable ? swipe : {})}>
        <Header />
        <main>
          {view === 'day' ? (
            <DayScreen />
          ) : view === 'month' ? (
            <MonthScreen />
          ) : view === 'shop' ? (
            <ShopScreen />
          ) : view === 'memo' ? (
            <MemoScreen />
          ) : (
            <LogScreen />
          )}
        </main>
      </div>

      {/* 밀고 들어온 화면에서는 탭바도 + 버튼도 내린다 — 나가는 길은 뒤로가기 하나 */}
      {!pushed && (
        <>
          <Fab />
          <TabBar />
        </>
      )}
      <SheetHost />
      <Toast />
    </>
  );
}
