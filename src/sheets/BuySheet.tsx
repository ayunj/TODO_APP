'use client';

import { useState } from 'react';
import Sheet from '@/components/Sheet';
import { GoButton } from '@/components/form';
import { useGomdori } from '@/lib/gomdori';
import { BEAR_CARD, ROOM_ART } from '@/lib/stage';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import Art from '@/screens/store/Art';
import Coin from '@/screens/store/Coin';

/** 종류를 사람이 읽는 이름으로 — 세트 펼친 칸과 같은 말을 쓴다 */
const KIND: Record<string, string> = {
  bear: '곰 스타일',
  room: '방 테마',
  pose: '소품',
};

/**
 * 이거 살까요 — **상점에서 가격을 치르는 자리는 여기 하나다.**
 *
 * 전에는 상점 맨 위에 곰돌이 칸이 붙박여 있었다. 카드를 누르면 거기 걸쳐 보이고,
 * 그 아래 단추로 사거나 입었다. **걸쳐보기를 상점에서 걷어냈다** —
 * 안 산 옷을 입혀보는 자리와 가격을 치르는 자리가 한 칸에 겹쳐 있으면
 * 입어보다가 사게 된다. 상점은 **사는 자리**고, 입어보는 것은 내 옷장에서 한다.
 *
 * 그렇다고 103px 카드에 사는 단추를 넣을 수는 없다 — 잘못 눌러 300P가 날아간다.
 * 그래서 **카드는 고르는 자리, 이 시트가 사는 자리**로 갈랐다.
 * 되돌릴 수 없는 일 하나가 제 칸을 하나 갖는다.
 *
 * **그림을 한 번 더 크게 보여준다.** 격자 칸과 같은 자로 그려서
 * 방금 누른 그 칸이 그대로 커진 것으로 읽힌다.
 *
 * **이미 가진 것도 연다.** 눌러도 아무 일이 없으면 고장으로 읽힌다 —
 * 가졌다는 것과 어디서 입어보는지를 말해준다.
 */
export default function BuySheet({ id }: { id: string }) {
  const { item, points, has, buy } = useGomdori();
  const { closeSheet } = useUi();
  const [busy, setBusy] = useState(false);

  const it = item(id);
  const own = has(id);
  const roomly = it.kind === 'room';
  const short = it.price - points;

  const go = async () => {
    setBusy(true);
    try {
      await buy(id);
      closeSheet();
    } catch (e) {
      // 서버가 막은 까닭을 그대로 옮긴다 — `포인트가 모자랍니다`가 제일 잦다
      toast(e instanceof Error ? e.message : '사지 못했어요');
      setBusy(false);
    }
  };

  return (
    <Sheet title={it.name} onClose={closeSheet}>
      {/*
        격자 칸을 그대로 키운 것 — 방은 꽉 채우고(`ROOM_ART`),
        곰돌이는 위 여백을 잘라 아래를 맞춘다(`BEAR_CARD`).
        누른 칸과 다른 자로 그리면 여기서만 크기가 달라 보인다.
      */}
      <div className="relative mx-auto mb-3.5 grid aspect-square w-[min(232px,62%)] place-items-center overflow-hidden rounded-[18px] bg-sunk">
        <Art item={it} className={roomly ? ROOM_ART : BEAR_CARD} />
      </div>

      <div className="mb-4 text-center">
        <span className="block text-[10.5px] text-ink3">{KIND[it.kind] ?? '곰 스타일'}</span>
        <b className="mt-px block font-round text-[19px] font-normal">{it.name}</b>
      </div>

      {own ? (
        /*
          가진 것은 가격을 안 적는다 — 이미 치른 가격을 다시 보여줄 까닭이 없고,
          여기서 할 일은 사는 것이 아니라 **어디서 입어보는지**를 아는 것이다.
        */
        <div className="rounded-2xl bg-sunk p-4 text-center text-[12.5px] leading-[1.6] text-ink2">
          <b className="mb-0.5 block font-round text-[14px] font-medium text-ink">
            이미 가지고 있어요
          </b>
          <span className="text-ink3">내 옷장에서 입어볼 수 있어요</span>
        </div>
      ) : (
        <>
          {/* 가격은 한 번만 적는다. 단추에 또 적으면 가격을 치르라고 미는 말이 된다. */}
          <div className="mb-2.5 flex items-center justify-between rounded-2xl bg-sunk px-4 py-3.5 text-[12.5px]">
            <span className="text-ink2">가격</span>
            <span className="flex items-center gap-1.5 font-mono text-[14px] font-medium text-ink">
              <Coin />
              {it.price}
            </span>
          </div>

          {short <= 0 ? (
            <>
              <GoButton onClick={() => void go()} disabled={busy}>
                {busy ? '사는 중…' : '구매하기'}
              </GoButton>
              <p className="mt-2 text-center text-[11.5px] text-ink3">
                사고 나면 {points - it.price}P 남아요
              </p>
            </>
          ) : (
            /*
              못 누르는 단추를 흐리게 두지 않는다 — 회색으로 눕혀두면 언젠가 눌리는
              것으로 보여 계속 눌러보게 된다. 그 자리에 얼마가 모자란지 한 줄로 적는다.
            */
            <div className="rounded-2xl bg-sunk p-4 text-center text-[12.5px] leading-[1.6] text-ink3">
              {short}P 더 모으면 살 수 있어요
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
