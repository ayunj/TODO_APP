'use client';

import { useEffect } from 'react';
import Fab from './Fab';
import Header from './Header';
import TabBar from './TabBar';
import Toast from './Toast';
import WelcomeScreen from './WelcomeScreen';
import SheetHost from '@/sheets/SheetHost';
import DayScreen from '@/screens/DayScreen';
import LogScreen from '@/screens/LogScreen';
import MonthScreen from '@/screens/MonthScreen';
import { BASE_ACCENT } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';

export default function AppShell() {
  const { loading, onboarded, categoryOf } = useStore();
  const { view, filter } = useUi();

  // 필터를 켜면 UI 강조색이 그 카테고리 색으로 바뀐다
  useEffect(() => {
    const color = filter ? categoryOf(filter).color : BASE_ACCENT;
    document.documentElement.style.setProperty('--accent', color);
  }, [filter, categoryOf]);

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
          {view === 'day' ? <DayScreen /> : view === 'month' ? <MonthScreen /> : <LogScreen />}
        </main>
      </div>

      <Fab />
      <TabBar />
      <SheetHost />
      <Toast />
    </>
  );
}
