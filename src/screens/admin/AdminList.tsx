'use client';

import { useMemo, useState } from 'react';
import Switch from './Switch';
import Thumb from './Thumb';
import { setShopItemActive } from '@/lib/repo/remote';
import { toast } from '@/lib/toast';
import type { Costume, Shop } from '@/lib/types';

/**
 * 올린 것 — **먼저 열리는 화면**([시안](../../../design/관리자.html)의 앱 판).
 *
 * 서른 개를 훑고 켜고 끄는 일이 새로 올리는 일보다 잦아서 이쪽이 먼저 선다.
 *
 * **표가 카드가 된다.** 넓은 판의 여덟 열은 360px에 안 들어간다.
 * 폰에 남길 것은 **그림 · 이름 · 파는 중** 셋이고, 종류·분류·코드·값은
 * 이름 밑 한 줄로 접었다. `고치기`는 카드를 누르는 것으로 갈음한다 —
 * **줄마다 글자 버튼을 하나 더 두면 손가락으로 스위치를 잘못 누른다.**
 */
export default function AdminList({
  shop,
  onOpen,
  onDone,
}: {
  shop: Shop;
  onOpen: (key: string) => void;
  onDone: () => Promise<void>;
}) {
  const [chip, setChip] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);

  /* 칩은 **물건이 실제로 든 중분류만** 세운다 — 눌러도 빈 칸인 칩은 고장으로 읽힌다 */
  const fams = useMemo(
    () => shop.families.filter((f) => shop.items.some((c) => c.family === f.key)),
    [shop],
  );
  const list = shop.items.filter((c) => chip === 'all' || c.family === chip);

  const flip = async (item: Costume) => {
    setBusy(item.key);
    try {
      await setShopItemActive(item.key, !item.active);
      await onDone();
    } catch (e) {
      // 거의 다 관리자가 아니라서 막힌 것이다 — 서버가 한 말을 그대로 보여준다
      toast(e instanceof Error ? e.message : '못 바꿨어요');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="-mx-4 mb-3 flex gap-[7px] overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[{ key: 'all', name: '전체' }, ...fams].map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={chip === f.key}
            onClick={() => setChip(f.key)}
            className={`flex-none rounded-full px-3.5 py-[7px] text-[11.5px] ${
              chip === f.key ? 'bg-accent text-white' : 'bg-sunk text-ink2'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2">
        {list.map((c) => (
          <Card
            key={c.key}
            item={c}
            shop={shop}
            busy={busy === c.key}
            onOpen={() => onOpen(c.key)}
            onFlip={() => void flip(c)}
          />
        ))}
        {list.length === 0 && (
          <p className="rounded-2xl border-[1.5px] border-dashed border-edge px-3.5 py-8 text-center text-[11.5px] text-ink3">
            아직 없어요
          </p>
        )}
      </div>

      {/* 채우기로 가는 길 하나. 시안의 뜬 단추 자리다 */}
      <button
        type="button"
        onClick={() => onOpen('')}
        className="sticky bottom-[calc(18px+env(safe-area-inset-bottom))] mb-6 ml-auto block rounded-full bg-accent px-5 py-3.5 text-[13.5px] font-medium text-white shadow-fab"
      >
        ＋ 채우기
      </button>
    </>
  );
}

function Card({
  item,
  shop,
  busy,
  onOpen,
  onFlip,
}: {
  item: Costume;
  shop: Shop;
  busy: boolean;
  onOpen: () => void;
  onFlip: () => void;
}) {
  const fam = shop.families.find((f) => f.key === item.family);
  const season = Boolean(item.season);
  const kindName = item.kind === 'room' ? '배경' : item.kind === 'pose' ? '소품' : '캐릭터';

  return (
    <div className="flex items-center gap-[11px] rounded-2xl bg-card px-3 py-2.5 shadow-[0_0_0_1.2px_var(--line)]">
      {/* 카드를 누르면 고치러 간다 — 글자 버튼을 따로 두면 스위치를 잘못 누른다 */}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-[11px] text-left">
        <Thumb item={item} className="h-11 w-11 flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[13px] font-medium text-ink">{item.name}</b>
          <span className="mt-1 block truncate font-mono text-[10.5px] text-ink3">
            <em
              className={`mr-[5px] inline-block rounded-full px-2 py-[2px] align-[1px] font-sans text-[10.5px] font-medium not-italic ${
                season ? 'bg-accent-tint text-accent' : 'bg-sunk text-ink2'
              }`}
            >
              {kindName}
            </em>
            {fam?.name ?? '—'} · {item.key} · {item.kind === 'pose' ? '보상' : `${item.price}P`}
          </span>
        </span>
      </button>
      <Switch on={Boolean(item.active)} busy={busy} onFlip={onFlip} />
    </div>
  );
}
