'use client';

import { useEffect, useState } from 'react';
import { hushToday, shouldShow } from '@/lib/notice';
import { pullNotice } from '@/lib/repo/remote';
import { hasSupabase } from '@/lib/supabase';
import type { Notice } from '@/lib/types';

/**
 * 공지 팝업 — **앱을 열면 한 번 뜬다.**
 *
 * ─── 닫는 길이 둘이다 ──────────────────────────────────────────
 *
 * | | 언제까지 |
 * |---|---|
 * | **닫기** | 이번에만. 앱을 다시 켜면 또 뜬다 |
 * | **오늘 다시 열지 않기** | 그 날이 끝날 때까지 |
 *
 * 둘을 다 두는 까닭은 **읽었는지 안 읽었는지가 다르기** 때문이다.
 * `닫기`는 지금 볼 겨를이 없다는 뜻이고, `오늘 다시`는 읽었다는 뜻이다.
 * 하나만 두면 급할 때 누른 것이 읽은 것으로 셈된다.
 *
 * ─── 어디를 눌러도 안 닫힌다 ───────────────────────────────────
 *
 * 뒤 어둠을 눌러도 안 닫는다. [묻는 말](AskHost.tsx)과 다른 자리다 —
 * 거기서는 밖을 누르면 `그만두기`가 되는데, 그건 **아무 일도 안 일어나는 쪽**이
 * 확실해서 그렇다. 공지는 밖을 눌러 닫으면 **글을 안 읽고 닫힌 것**이 된다.
 * 닫는 것은 아래 두 단추뿐이다.
 *
 * ─── 묻는 말보다 아래다 ────────────────────────────────────────
 *
 * `z`가 묻는 말(45·46)보다 낮다(43·44). 공지는 받아오는 데 한 박자 걸려서,
 * **묻는 말이 떠 있는 동안 늦게 도착할 수 있다.** 그때 위로 올라오면 공지의 어둠이
 * 묻는 말의 단추를 덮어 **아무것도 누를 수 없게** 된다.
 * 묻는 말은 방금 누른 것에 대한 답이니 그쪽이 위다.
 */
export default function NoticePopup() {
  const [notice, setNotice] = useState<Notice | null>(null);

  /*
    한 번만 받아온다. 공지는 관리자가 가끔 쓰는 것이라 화면을 열 때마다 물을 까닭이
    없다 — 앱을 다시 켜면 새로 받는다.

    **못 받아오면 조용히 없는 것으로 둔다.** 공지를 못 받은 것으로 화면을 막을 수는 없다.
  */
  useEffect(() => {
    if (!hasSupabase) return;
    let alive = true;
    pullNotice()
      .then((next) => {
        if (alive && next && shouldShow(next)) setNotice(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!notice) return null;

  const hush = () => {
    hushToday(notice);
    setNotice(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-[43] bg-[rgba(62,58,77,.35)]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={notice.title || '공지'}
        className="fixed left-1/2 top-1/2 z-[44] w-[min(340px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 rounded-card bg-card p-5 shadow-[0_20px_50px_rgba(62,58,77,.25)]"
      >
        {/*
          **사진이 먼저다.** 공지를 사진 한 장으로 내는 일이 있어서(띠·포스터),
          그때는 글이 없거나 한 줄뿐이다 — 사진이 위에 있어야 그것이 본문으로 읽힌다.

          높이를 묶는다. 세로로 긴 사진이 오면 팝업이 화면보다 길어져서
          **아래 두 단추가 밖으로 나간다.**
        */}
        {notice.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={notice.image}
            alt=""
            className="mb-3.5 block max-h-[42vh] w-full rounded-2xl object-contain"
          />
        )}

        {/* 사진만으로 내는 공지가 있다 — 제목을 안 적었으면 자리를 안 만든다 */}
        {notice.title && (
          <h2 className="font-round text-[17px] leading-[1.4]">{notice.title}</h2>
        )}
        {notice.body && (
          /*
            **줄바꿈을 그대로 살린다**(`whitespace-pre-line`). 관리자가 칸에서 엔터를
            친 대로 뜬다 — 그러라고 여러 줄 칸을 준 것이다.

            길면 안에서 굴린다. 팝업이 화면보다 길어지면 아래 두 단추가 밖으로 나간다.
          */
          <p
            className={`max-h-[38vh] overflow-y-auto whitespace-pre-line text-[13px] leading-[1.7] text-ink2 ${
              notice.title ? 'mt-2.5' : ''
            }`}
          >
            {notice.body}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={hush}
            className="flex-1 rounded-2xl bg-sunk py-[13px] text-[12.5px] font-medium text-ink2 active:opacity-80"
          >
            오늘 다시 열지 않기
          </button>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="flex-none rounded-2xl bg-accent px-6 py-[13px] text-[13.5px] font-medium text-white active:opacity-90"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  );
}
