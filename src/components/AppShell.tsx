'use client';

import Fab from './Fab';
import Header from './Header';
import TabBar from './TabBar';
import Toast from './Toast';
import WelcomeScreen from './WelcomeScreen';
import SheetHost from '@/sheets/SheetHost';
import DayScreen from '@/screens/DayScreen';
import LogScreen from '@/screens/LogScreen';
import MemoScreen from '@/screens/MemoScreen';
import MonthScreen from '@/screens/MonthScreen';
import ShopScreen from '@/screens/ShopScreen';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function AppShell() {
  const { loading, onboarded } = useStore();
  const { view } = useUi();

  const pushed = view === 'shop' || view === 'memo';

  if (loading) {
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
