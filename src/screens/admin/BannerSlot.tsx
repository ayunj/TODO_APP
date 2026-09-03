'use client';

import { useRef, useState } from 'react';
import { BANNER_H, BANNER_MIN_TEXT, BANNER_W, fitBanner } from '@/lib/fit';
import { clearSeasonBanner, uploadSeasonBanner } from '@/lib/repo/remote';
import { toast } from '@/lib/toast';
import type { CostumeSet } from '@/lib/types';

/**
 * 세트 배너를 올리는 자리 — **상점 맨 위에 걸리는 한 장.**
 *
 * **고른 세트 밑에 붙는다.** 배너를 따로 관리하는 화면을 안 만들었다 —
 * 그러면 끝난 세트의 배너가 남아서 두 군데를 같이 꺼야 한다. 세트를 고르면
 * 그 세트의 배너 칸이 열리는 것이 배너가 세트에 딸린다는 말과 같은 모양이다.
 *
 * ─── 여기서 보여주는 것이 곧 상점에서 보이는 것 ─────────────────
 *
 * 미리보기 칸이 **폰에서 서는 그 폭 그대로**다. 관리자 화면도 상점도 같은
 * 360dp 웹뷰라 화면 폭을 다 쓰는 칸이 양쪽에서 같은 크기다.
 * **그림 속 글씨가 읽히는지는 여기서 보고 판단한다** — 규격을 글로만 적어두면
 * 다 그린 뒤에 5px짜리 글씨를 상점에서 처음 보게 된다.
 *
 * ─── 왜 2:1이고 왜 1774인가 ────────────────────────────────────
 *
 * **시즌 배너를 그린 크기에 맞췄다.** 앱이 정한 숫자에 그림을 맞추게 하지 않고
 * 그림이 정한 숫자를 앱이 따라간다 — 그리는 자가 하나면 세트마다 다시 재지 않는다.
 *
 * 폰에서 328dp 폭으로 서니 **5.4배로 줄어든다.** 원본에서 59px은 돼야
 * 폰에서 11px, 그러니까 앱 본문만 해진다. 첫 배너는 제목만 118px이라 살아남았고
 * 동그라미 라벨 27px는 **5px**가 됐다 — 앱에서 제일 작은 글씨가 9px이니
 * 그건 글씨가 아니라 무늬다.
 *
 * 어떤 크기로 올려도 여기서 **2:1로 채워 잘라 담는다**(`fitBanner`).
 * 그러니 규격은 `그보다 크게 그리지 마세요`가 아니라
 * **`글씨를 이만큼 크게 그리세요`**로 적는다.
 */
export default function BannerSlot({
  set,
  onDone,
}: {
  set: CostumeSet;
  onDone: () => Promise<void>;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  /** 방금 담은 것 — 올리고 다시 받아오기 전까지 이걸 보여준다 */
  const [just, setJust] = useState<string | null>(null);

  const shot = just ?? set.banner;

  const put = async (f: File) => {
    setBusy(true);
    try {
      const fitted = await fitBanner(f);
      await uploadSeasonBanner(set.key, fitted.blob);
      setJust(fitted.url);
      toast('배너를 걸었어요');
      await onDone();
    } catch (e) {
      // 거의 다 관리자가 아니라서 막힌 것이다 — 서버가 한 말을 그대로 보여준다
      toast(e instanceof Error ? e.message : '못 올렸어요');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

  const drop = async () => {
    setBusy(true);
    try {
      await clearSeasonBanner(set.key);
      setJust(null);
      toast('배너를 내렸어요');
      await onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : '못 내렸어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 rounded-2xl bg-card p-3 shadow-[0_0_0_1.2px_var(--line)]">
      <div className="mb-2.5 flex items-baseline gap-2">
        <b className="text-[12px] font-medium text-ink2">배너 그림</b>
        <span className="text-[10.5px] text-ink3">상점 맨 위 한 장</span>
        {shot && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void drop()}
            className="ml-auto text-[10.5px] text-ink3 disabled:opacity-50"
          >
            내리기
          </button>
        )}
      </div>

      {/*
        칸이 늘 2:1로 서 있다. 없을 때도 **같은 칸이 비어 있는 것**으로 보여야
        무엇을 올리는 자리인지가 보인다 — 없을 때만 다른 모양이면
        올리고 나서야 어떤 칸인지 알게 된다.
      */}
      <button
        type="button"
        disabled={busy}
        onClick={() => file.current?.click()}
        className={`mb-2.5 grid aspect-[2/1] w-full place-items-center overflow-hidden rounded-[14px] bg-sunk text-center disabled:opacity-60 ${
          shot ? '' : 'border-[1.5px] border-dashed border-edge'
        }`}
      >
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="" className="h-full w-full select-none object-cover" />
        ) : (
          <span className="px-6 text-[11px] leading-[1.6] text-ink3">
            <b className="mb-0.5 block text-[12.5px] font-medium text-ink2">배너가 없어요</b>
            눌러서 한 장 올리면
            <br />
            상점 맨 위에 걸려요
          </span>
        )}
      </button>

      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void put(f);
        }}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => file.current?.click()}
        className="w-full rounded-[12px] bg-card py-2.5 text-[12px] font-medium text-accent shadow-[0_0_0_1.4px_var(--accent-soft)] disabled:opacity-60"
      >
        {busy ? '올리는 중…' : shot ? '다시 올리기' : '그림 고르기'}
      </button>

      <ul className="mt-2.5 flex flex-col gap-1 pl-3.5 text-[10.5px] leading-[1.6] text-ink3">
        <li className="list-disc">
          <b className="font-medium text-ink2">
            가로 2:1 · {BANNER_W} × {BANNER_H}
          </b>
          로 담겨요. 다른 크기는 가운데를 남기고 잘려요
        </li>
        <li className="list-disc">
          <b className="font-medium text-ink2">글씨는 원본에서 {BANNER_MIN_TEXT}px 이상.</b> 폰에서
          11px로 보여요 — 그림이 {(BANNER_W / 328).toFixed(1)}배로 줄어들어서요
        </li>
        <li className="list-disc">
          <b className="font-medium text-ink2">몇/3은 넣지 마세요</b> — 사람마다 달라서 그림에
          못 담아요. 세트를 열면 거기서 말해줘요
        </li>
        <li className="list-disc">누르면 그 세트 상세로 들어가요</li>
      </ul>
    </div>
  );
}
