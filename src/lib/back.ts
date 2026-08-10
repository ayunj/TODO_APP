'use client';

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { dismissAsk } from './ask';
import { toast } from './toast';
import { useUi } from './ui';

/** 두 번째 뒤로가 이 안에 들어와야 닫힌다 */
const EXIT_WINDOW = 2000;

/**
 * 안드로이드 뒤로 제스처(가장자리 스와이프·뒤로 버튼)를 받는다.
 *
 * **한 번에 한 겹씩만 벗는다.** 물음 → 시트 → 밀고 들어간 화면 → 탭 → 앱.
 * 그전에는 이걸 아무도 안 받아서, 설정 안에서 뒤로 하면 그 자리에서 앱이 닫혔다.
 *
 * 마지막 한 겹, 그러니까 일 화면에서는 **두 번 눌러야 닫힌다.**
 * 손에 든 채로 가장자리를 스치는 일이 잦아서, 한 번에 닫히면 적던 게 날아간 것처럼 느껴진다.
 */
export function useBackGesture(): void {
  const ui = useUi();
  // 리스너는 한 번만 걸고, 볼 값은 늘 최신으로 — 다시 걸면 그 사이 누른 뒤로를 놓친다
  const latest = useRef(ui);
  latest.current = ui;
  const askedAt = useRef(0);

  useEffect(() => {
    /** 한 겹 벗었으면 true. false면 더 벗을 게 없다는 뜻이라 그때만 앱이 닫힌다. */
    const consume = (): boolean => {
      const { sheet, closeSheet, depth, popView, tab, setTab } = latest.current;

      if (dismissAsk()) return true;
      if (sheet) {
        closeSheet();
        return true;
      }
      if (depth > 0) {
        popView();
        return true;
      }
      // 월·기록에서는 일로 돌아온다. 일이 이 앱의 바닥이다.
      if (tab !== 'day') {
        setTab('day');
        return true;
      }

      const now = Date.now();
      if (now - askedAt.current < EXIT_WINDOW) return false;
      askedAt.current = now;
      toast('한 번 더 누르면 닫혀요');
      return true;
    };

    if (Capacitor.isNativePlatform()) {
      const handle = App.addListener('backButton', () => {
        if (!consume()) void App.exitApp();
      });
      return () => {
        void handle.then((h) => h.remove());
      };
    }

    /*
      브라우저·홈 화면 앱에는 뒤로 버튼이 따로 없다. 방문 기록의 뒤로가 그 자리다.
      자리를 하나 얹어두고, 뒤로를 먹을 때마다 도로 얹어 페이지를 안 떠나게 한다.
      더 벗을 게 없으면 안 얹는다 — 그때는 앱에 오기 전 페이지로 나간다.
    */
    history.pushState({ back: true }, '');
    const onPop = () => {
      if (consume()) history.pushState({ back: true }, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
