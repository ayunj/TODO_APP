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
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function AppShell() {
  const { loading, onboarded } = useStore();
  const { enabled, loading: checking, account, recovering } = useAuth();
  const { view } = useUi();

  const pushed = view === 'shop' || view === 'memo';

  if (loading || checking) {
    return (
      <div className="wrap">
        <div className="py-20 text-center text-[13.5px] text-ink3">불러오는 중…</div>
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
      <div className="wrap">
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
